import { PrismaClient, MessageRole } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Prisma client will be injected from index.ts
let prisma: PrismaClient;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

export function setPrismaClient(client: PrismaClient) {
  prisma = client;
}

interface Message {
  role: MessageRole;
  content: string;
  createdAt?: Date;
}

interface ChatSearchResult {
  content: string;
  role: string;
  date: string;
  isArchived: boolean;
}

export class ConversationMemory {
  private static RECENT_MESSAGES_COUNT = 20; // Last 20 messages in full detail
  private static SUMMARY_THRESHOLD = 50; // Summarize after 50 messages
  private static AUTO_SUMMARY_INTERVAL = 30; // Auto-summarize every 30 new messages
  
  /**
   * Get optimized conversation history for AI
   * Returns: Recent messages + Summary of older messages
   */
  static async getOptimizedHistory(userId: string): Promise<{ 
    recentMessages: Message[]; 
    summary: string | null;
  }> {
    // Get all messages
    const allMessages = await prisma.userChat.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
        createdAt: true,
      }
    });

    // If less than threshold, return all
    if (allMessages.length <= this.SUMMARY_THRESHOLD) {
      return {
        recentMessages: allMessages,
        summary: null
      };
    }

    // Split into old and recent
    const splitIndex = allMessages.length - this.RECENT_MESSAGES_COUNT;
    const oldMessages = allMessages.slice(0, splitIndex);
    const recentMessages = allMessages.slice(splitIndex);

    // Check if we have a cached summary
    const cachedSummary = await prisma.conversationSummary.findFirst({
      where: { 
        userId,
        messageCount: oldMessages.length 
      }
    });

    if (cachedSummary) {
      return {
        recentMessages,
        summary: cachedSummary.summary
      };
    }

    // Generate new summary
    const summary = await this.generateSummary(oldMessages);
    
    // Cache the summary
    await prisma.conversationSummary.create({
      data: {
        userId,
        summary,
        messageCount: oldMessages.length,
      }
    });

    return {
      recentMessages,
      summary
    };
  }

  /**
   * Generate a concise summary of conversation history
   */
  private static async generateSummary(messages: Message[]): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `Fasse diese Konversation zwischen einem User und Jarvis (KI-Assistent für Immobilien-CRM) zusammen.
Fokussiere auf:
- Wichtige Informationen (Namen, Objekte, Präferenzen)
- Offene Aufgaben oder Fragen
- Kontext der benötigt wird um das Gespräch fortzusetzen

Sei sehr präzise und kurz (max. 200 Wörter).

Konversation:
${conversationText}

Zusammenfassung:`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Format history for OpenAI API
   */
  static formatForOpenAI(recentMessages: Message[], summary: string | null): any[] {
    const history: any[] = [];

    // Add summary as system context if available
    if (summary) {
      history.push({
        role: 'user',
        content: `[Zusammenfassung des bisherigen Gesprächs: ${summary}]`
      });
      history.push({
        role: 'assistant',
        content: 'Verstanden, ich erinnere mich an den Kontext.'
      });
    }

    // Add recent messages (filter out SYSTEM messages if any)
    history.push(...recentMessages
      .filter(m => m.role === 'USER' || m.role === 'ASSISTANT')
      .map(m => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content
      })));

    return history;
  }

  /**
   * @deprecated Use formatForOpenAI instead
   */
  static formatForGemini(recentMessages: Message[], summary: string | null): any[] {
    return this.formatForOpenAI(recentMessages, summary);
  }

  /**
   * Clean up old summaries (keep only latest)
   */
  static async cleanupOldSummaries(userId: string): Promise<void> {
    const summaries = await prisma.conversationSummary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 1, // Keep the latest one
    });

    if (summaries.length > 0) {
      await prisma.conversationSummary.deleteMany({
        where: {
          id: { in: summaries.map(s => s.id) }
        }
      });
    }
  }

  /**
   * Search through chat history (including archived chats)
   * Used by AI to find relevant context from past conversations
   */
  static async searchChatHistory(
    userId: string, 
    query: string, 
    options?: { includeArchived?: boolean; limit?: number }
  ): Promise<ChatSearchResult[]> {
    const { includeArchived = true, limit = 20 } = options || {};

    // Get all messages (optionally including archived)
    const messages = await prisma.userChat.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { archived: false }),
        content: {
          contains: query,
          mode: 'insensitive'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        content: true,
        role: true,
        createdAt: true,
        archived: true
      }
    });

    return messages.map(m => ({
      content: m.content,
      role: m.role,
      date: m.createdAt.toISOString(),
      isArchived: m.archived
    }));
  }

  /**
   * Get conversation context around a specific topic
   * Returns messages before and after matches for better context
   */
  static async getContextAroundTopic(
    userId: string,
    topic: string,
    contextWindow: number = 3
  ): Promise<{ topic: string; context: ChatSearchResult[] }[]> {
    // Find messages matching the topic
    const matches = await prisma.userChat.findMany({
      where: {
        userId,
        content: {
          contains: topic,
          mode: 'insensitive'
        }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true
      }
    });

    if (matches.length === 0) {
      return [];
    }

    const results: { topic: string; context: ChatSearchResult[] }[] = [];

    for (const match of matches.slice(0, 5)) { // Max 5 contexts
      // Get messages around this match
      const contextMessages = await prisma.userChat.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(match.createdAt.getTime() - contextWindow * 60000), // contextWindow minutes before
            lte: new Date(match.createdAt.getTime() + contextWindow * 60000)  // contextWindow minutes after
          }
        },
        orderBy: { createdAt: 'asc' },
        select: {
          content: true,
          role: true,
          createdAt: true,
          archived: true
        }
      });

      results.push({
        topic,
        context: contextMessages.map(m => ({
          content: m.content,
          role: m.role,
          date: m.createdAt.toISOString(),
          isArchived: m.archived
        }))
      });
    }

    return results;
  }

  /**
   * Get long-term memory summary (persists across chat sessions)
   * This is different from the per-session summary
   */
  static async getLongTermMemory(userId: string): Promise<string | null> {
    const summary = await prisma.conversationSummary.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return summary?.summary || null;
  }

  /**
   * Update long-term memory with new information
   * Called periodically to keep the summary up-to-date
   */
  static async updateLongTermMemory(userId: string): Promise<string> {
    // Get current summary
    const currentSummary = await this.getLongTermMemory(userId);

    // Get recent messages (last 50 non-archived)
    const recentMessages = await prisma.userChat.findMany({
      where: { 
        userId,
        archived: false
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        role: true,
        content: true,
        createdAt: true
      }
    });

    if (recentMessages.length < 10) {
      return currentSummary || 'Noch keine ausreichende Gesprächshistorie.';
    }

    // Generate updated summary
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const conversationText = recentMessages
      .reverse()
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `Du bist ein Gedächtnis-Assistent. Aktualisiere die Langzeit-Zusammenfassung basierend auf neuen Gesprächen.

${currentSummary ? `BISHERIGE ZUSAMMENFASSUNG:\n${currentSummary}\n\n` : ''}NEUE GESPRÄCHE:
${conversationText}

Erstelle eine aktualisierte Zusammenfassung die enthält:
- Wichtige Fakten über den User (Präferenzen, häufige Anfragen)
- Wiederkehrende Themen und Muster
- Wichtige Objekte, Leads oder Kontakte die erwähnt wurden
- Offene Aufgaben oder Wünsche

Sei präzise und strukturiert (max. 300 Wörter). Behalte wichtige Informationen aus der bisherigen Zusammenfassung bei.

AKTUALISIERTE ZUSAMMENFASSUNG:`;

    const result = await model.generateContent(prompt);
    const newSummary = result.response.text();

    // Save the new summary
    await prisma.conversationSummary.create({
      data: {
        userId,
        summary: newSummary,
        messageCount: recentMessages.length
      }
    });

    // Clean up old summaries
    await this.cleanupOldSummaries(userId);

    return newSummary;
  }

  /**
   * Check if we should auto-summarize based on message count
   */
  static async shouldAutoSummarize(userId: string): Promise<boolean> {
    const messageCount = await prisma.userChat.count({
      where: { 
        userId,
        archived: false
      }
    });

    const lastSummary = await prisma.conversationSummary.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Summarize if we have enough new messages since last summary
    const messagesSinceLastSummary = messageCount - (lastSummary?.messageCount || 0);
    return messagesSinceLastSummary >= this.AUTO_SUMMARY_INTERVAL;
  }

  /**
   * Auto-summarize if needed (call this after each message)
   */
  static async autoSummarizeIfNeeded(userId: string): Promise<void> {
    if (await this.shouldAutoSummarize(userId)) {
      console.log(`📝 Auto-summarizing conversation for user ${userId}`);
      await this.updateLongTermMemory(userId);
    }
  }
}
