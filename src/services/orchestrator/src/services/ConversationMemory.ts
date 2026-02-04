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

export class ConversationMemory {
  private static RECENT_MESSAGES_COUNT = 10; // Last 10 messages in full detail
  private static SUMMARY_THRESHOLD = 20; // Summarize after 20 messages
  
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
}
