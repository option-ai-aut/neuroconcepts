import OpenAI from 'openai';
import { CRM_TOOLS, EXPOSE_TOOLS } from './AiTools';
import { AiCostService } from './AiCostService';

const ALL_TOOLS = { ...CRM_TOOLS, ...EXPOSE_TOOLS };

/**
 * Multi-Agent Router: Uses gpt-5-mini to classify user intent,
 * then routes to the appropriate tool subset.
 * 
 * Benefits:
 * - ~10x cheaper classification (gpt-5-mini vs gpt-5)
 * - Faster responses (fewer tools = less context)
 * - Better tool selection accuracy (specialized subsets)
 * - Smalltalk uses gpt-5-mini directly (no tools needed)
 */

const ROUTER_MODEL = 'gpt-5-mini'; // Cheap + fast for classification

export type AgentCategory = 
  | 'smalltalk'    // Greetings, casual chat, humor
  | 'crm'          // Leads, properties, search, stats
  | 'email'        // Read, write, send emails
  | 'calendar'     // Events, appointments, availability
  | 'expose'       // Exposé creation, templates, blocks
  | 'memory'       // Chat history, past conversations
  | 'multi';       // Complex request spanning multiple domains

// Tool names per category — must match actual names in AiTools.ts
const TOOL_CATEGORIES: Record<AgentCategory, string[]> = {
  smalltalk: [],
  crm: [
    'get_leads', 'get_lead', 'create_lead', 'update_lead', 'delete_lead',
    'delete_all_leads',
    'get_properties', 'get_property', 'create_property', 'update_property', 'delete_property',
    'delete_all_properties',
    'search_properties', 'search_contacts', 'semantic_search',
    'get_dashboard_stats', 'get_lead_statistics', 'get_property_statistics',
    'upload_images_to_property', 'upload_documents_to_lead',
    'get_property_images', 'delete_property_image', 'delete_all_property_images',
    'move_image_to_floorplan',
    'add_video_to_property', 'set_virtual_tour',
    'get_company_info', 'get_team_members',
    'send_team_message', 'get_team_channels', 'get_channel_messages',
  ],
  email: [
    'get_emails', 'get_email', 'draft_email', 'send_email', 'reply_to_email',
    'get_email_templates',
    'get_leads', 'get_lead',
  ],
  calendar: [
    'get_calendar_events', 'create_calendar_event', 'update_calendar_event', 
    'delete_calendar_event', 'get_calendar_availability',
    'get_leads', 'get_lead', 'get_properties',
  ],
  expose: [
    'create_full_expose', 'create_expose_from_template', 'create_expose_template',
    'create_expose_block', 'update_expose_block', 'delete_expose_block', 'reorder_expose_blocks',
    'set_expose_theme', 'generate_expose_text', 'get_expose_status', 'set_expose_status',
    'clear_expose_blocks', 'get_exposes', 'get_expose_templates', 'get_template',
    'update_expose_template', 'update_template',
    'delete_expose', 'delete_all_exposes', 'delete_expose_template',
    'generate_expose_pdf', 'virtual_staging',
    'get_properties', 'get_property',
  ],
  memory: [
    'search_chat_history', 'get_last_conversation', 'get_conversation_context',
    'get_memory_summary',
  ],
  multi: [], // Gets ALL tools
};

const CLASSIFICATION_PROMPT = `Classify the user message into exactly ONE category. Reply with ONLY the category name.

Categories:
smalltalk = greetings, casual chat, humor, questions about yourself, short/ambiguous messages, numbers, jokes, counting, anything that is NOT a clear work instruction. Also: questions about the current conversation ("was hab ich gefragt?", "worüber haben wir geredet?") — the assistant already has the recent chat history.
crm = leads, properties, search, stats, assignments, uploading images/photos/files to properties or leads, property media management (Bilder hinzufügen, Fotos hochladen, Grundriss, etc.)
email = read, write, send emails
calendar = events, appointments, availability
expose = ONLY explicit exposé/PDF creation, templates, blocks, themes. NOT image uploads to properties!
memory = ONLY when user explicitly asks about OLDER/ARCHIVED conversations ("letzte Woche", "vor einem Monat", "früheres Gespräch"). NOT for recent messages.
multi = complex request clearly spanning multiple categories

IMPORTANT RULES:
- "Bild hinzufügen zu Objekt" or "Foto hochladen" = crm (NOT expose!)
- Short/ambiguous messages like "1", "ok", "ja", "cool", "haha" = smalltalk (NOT crm!)
- "was hab ich gefragt?" / "worüber haben wir geredet?" = smalltalk (recent history is already available)
- "was haben wir letzte Woche besprochen?" = memory (needs archived data)
- Short confirmations after a work-related message ("ja", "mach das", "genau") = use the PREVIOUS message context to decide. If previous was crm, this is crm.
- When in doubt and message < 5 words: smalltalk. When in doubt and message >= 5 words: multi.

Reply with one word only: smalltalk, crm, email, calendar, expose, memory, or multi.`;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
}

export class AgentRouter {
  /**
   * Fast keyword-based pre-classification (0ms, no API call)
   * Catches obvious intents before hitting the LLM.
   */
  private static keywordClassify(msg: string): AgentCategory | null {
    const m = msg.toLowerCase().trim();
    
    // Smalltalk patterns (allow optional name/word after greeting, e.g. "hallo jarvis")
    const smalltalkPatterns = [
      /^(hey|hi|hallo|servus|moin|guten (morgen|tag|abend)|na\??|yo|grüß|grüss|gruss)(\s+\w+)?[\s!?.]*$/i,
      /^(wie geht'?s|was geht|alles klar|danke|tschüss|bis dann|ciao)(\s+\w+)?[\s!?.]*$/i,
      /^(wer bist du|was kannst du|was bist du|hilfe|help)[\s!?.]*$/i,
    ];
    if (smalltalkPatterns.some(p => p.test(m))) return 'smalltalk';
    
    // Very short/ambiguous messages (1-3 chars, single numbers, etc.) → smalltalk
    // These are casual messages, not actionable commands
    if (m.length <= 10 && !/\b(erstell|anleg|lösch|such|zeig|send|schreib|aktualisier)\b/i.test(m)) {
      if (/^\d+[\s!?.]*$/.test(m)) return 'smalltalk'; // just a number
      if (m.length <= 3) return 'smalltalk'; // very short (e.g. "ok", "ja", "no")
    }
    
    // Email patterns
    if (/\b(e-?mail|mail|postfach|inbox|entwurf|draft|senden|schreib.*mail|nachricht senden)\b/i.test(m)) return 'email';
    
    // Calendar patterns
    if (/\b(termin|kalender|besichtigung|verfügbar|calendar|appointment)\b/i.test(m)) return 'calendar';
    
    // Expose patterns (block only with expose context)
    if (/\b(exposé|expose|vorlage|template|pdf.*erstell)\b/i.test(m)) return 'expose';
    if (/\b(block)\b/i.test(m) && /\b(exposé|expose)\b/i.test(m)) return 'expose';
    
    // Memory patterns — only for explicitly OLD/archived conversations
    if (/\b(letzte woche|letzten monat|vor \d+ (tagen|wochen|monaten)|früheres? gespräch|archiviert)\b/i.test(m)) return 'memory';
    if (/\b(erinnerst|besprochen|chat.*historie|vergangene)\b/i.test(m) && /\b(letzte|früher|damals|woche|monat)\b/i.test(m)) return 'memory';
    
    // Image/file upload patterns → always CRM (not expose!)
    if (/\b(bild|bilder|foto|fotos|image|images|hochladen|upload|galerie|grundriss|floorplan)\b/i.test(m) && /\b(objekt|immobilie|property|wohnung|haus|büro|loft|hinzufüg|anfüg|add)\b/i.test(m)) return 'crm';
    
    // CRM patterns (leads, properties, stats — the most common intent)
    if (/\b(lead|leads|kontakt|interessent|objekt|immobilie|wohnung|haus|grundstück|property|anlegen|erstell|lösch|aktualisier|statistik|dashboard|zuweisen|test.*objekt|test.*lead|bild.*hinzufüg|foto.*hinzufüg|hochladen)\b/i.test(m)) return 'crm';
    
    return null; // No clear keyword match — use LLM
  }

  /**
   * Classify user intent: keyword-first, then LLM fallback.
   * Optional previousMessages for context-aware classification.
   */
  static async classify(message: string, tenantId?: string, previousMessages?: { role: string; content: string }[]): Promise<AgentCategory> {
    const startTime = Date.now();

    // Step 1: Fast keyword classification (free, instant)
    const keywordResult = this.keywordClassify(message);
    if (keywordResult) {
      console.log(`🧭 Router: "${message.substring(0, 50)}" → ${keywordResult} (keyword, ${Date.now() - startTime}ms)`);
      return keywordResult;
    }

    // Step 2: LLM classification for ambiguous messages
    try {
      const openai = getOpenAI();
      
      // Build messages with optional conversation context
      const llmMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: CLASSIFICATION_PROMPT },
      ];
      
      // Add last 2 messages for context (helps with "ja mach das", "genau", etc.)
      if (previousMessages && previousMessages.length > 0) {
        const recent = previousMessages.slice(-2);
        for (const msg of recent) {
          const truncated = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content;
          llmMessages.push({
            role: msg.role === 'ASSISTANT' || msg.role === 'assistant' ? 'assistant' : 'user',
            content: truncated,
          });
        }
      }
      
      llmMessages.push({ role: 'user', content: message });
      
      const response = await openai.chat.completions.create({
        model: ROUTER_MODEL,
        messages: llmMessages,
        max_completion_tokens: 16,
      });

      // Log cost
      if (response.usage) {
        AiCostService.logUsage({
          provider: 'openai', model: ROUTER_MODEL, endpoint: 'router',
          inputTokens: response.usage.prompt_tokens || 0,
          outputTokens: response.usage.completion_tokens || 0,
          durationMs: Date.now() - startTime, tenantId,
        }).catch(() => {});
      }

      const rawContent = response.choices[0]?.message?.content || '';
      const raw = rawContent.trim().toLowerCase().replace(/[^a-z]/g, '');
      
      // Match category — also handle partial/fuzzy matches
      const VALID_CATEGORIES: AgentCategory[] = ['smalltalk', 'crm', 'email', 'calendar', 'expose', 'memory', 'multi'];
      const category = VALID_CATEGORIES.find(c => raw === c || raw.startsWith(c)) || null;
      
      if (category) {
        console.log(`🧭 Router: "${message.substring(0, 50)}" → ${category} (LLM, ${Date.now() - startTime}ms)`);
        return category;
      }

      // LLM returned garbage — fall back to smalltalk for general questions, crm for everything else
      const usageInfo = response.usage ? `${response.usage.prompt_tokens}→${response.usage.completion_tokens}tok` : 'no-usage';
      console.warn(`⚠️ Router: LLM returned "${rawContent}" (${usageInfo}), falling back to crm`);
      return 'crm';
    } catch (error) {
      console.error('Router classification error:', error);
      return 'multi'; // Safe fallback: all tools
    }
  }

  /**
   * Get relevant tool names for a category
   */
  static getToolNames(category: AgentCategory): string[] | null {
    if (category === 'multi' || category === 'smalltalk') return null; // null = all or none
    return TOOL_CATEGORIES[category] || null;
  }

  /**
   * Filter CRM_TOOLS to only include relevant ones for the category.
   * When hasUploadedFiles is true, upload tools are always injected.
   */
  static filterTools(category: AgentCategory, hasUploadedFiles = false): Record<string, any> | null {
    if (category === 'smalltalk' && !hasUploadedFiles) return null;

    const toolNames = this.getToolNames(category);
    if (!toolNames) return ALL_TOOLS; // Return ALL tools for 'multi'

    // Always include upload tools when files are attached
    const UPLOAD_TOOLS = ['upload_images_to_property', 'upload_documents_to_lead', 'get_properties', 'get_property'];
    const effectiveNames = hasUploadedFiles
      ? [...new Set([...toolNames, ...UPLOAD_TOOLS])]
      : toolNames;

    const filtered: Record<string, any> = {};
    for (const [key, tool] of Object.entries(ALL_TOOLS)) {
      if (effectiveNames.includes((tool as any).name)) {
        filtered[key] = tool;
      }
    }

    return Object.keys(filtered).length > 0 ? filtered : ALL_TOOLS;
  }

  /**
   * Should we use gpt-5-mini instead of gpt-5 for this category?
   * Smalltalk doesn't need the expensive model.
   */
  static shouldUseMiniModel(category: AgentCategory): boolean {
    return category === 'smalltalk';
  }

  /**
   * Get a focused system prompt addition for the category
   */
  static getCategoryPromptHint(category: AgentCategory): string {
    switch (category) {
      case 'crm':
        return '\n\n[Fokus: CRM — Leads und Immobilien verwalten. Nutze die verfügbaren CRM-Tools.]';
      case 'email':
        return '\n\n[Fokus: E-Mail — Lesen, Schreiben, Senden. Nutze die E-Mail-Tools.]';
      case 'calendar':
        return '\n\n[Fokus: Kalender — Termine und Verfügbarkeit. Nutze die Kalender-Tools.]';
      case 'expose':
        return '\n\n[Fokus: Exposé — Erstellen und Bearbeiten. Nutze die Exposé-Tools.]';
      case 'memory':
        return '\n\n[Fokus: Erinnerung — Der User fragt nach vergangenen Gesprächen.]';
      default:
        return '';
    }
  }
}
