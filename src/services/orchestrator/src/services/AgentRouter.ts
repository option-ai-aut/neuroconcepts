import OpenAI from 'openai';
import { CRM_TOOLS, EXPOSE_TOOLS } from './AiTools';
import { AiCostService } from './AiCostService';

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
    'get_properties', 'get_property', 'create_property', 'update_property', 'delete_property',
    'search_properties', 'search_contacts', 'semantic_search',
    'get_dashboard_stats', 'get_lead_statistics', 'get_property_statistics',
    'upload_images_to_property', 'upload_documents_to_lead',
    'get_property_images', 'delete_property_image',
    'add_video_to_property', 'set_virtual_tour',
  ],
  email: [
    'get_emails', 'get_email', 'draft_email', 'send_email', 'reply_to_email',
    'get_email_templates',
    'get_leads', 'get_lead', // Lead context for emails
  ],
  calendar: [
    'get_calendar_events', 'create_calendar_event', 'update_calendar_event', 
    'delete_calendar_event', 'get_calendar_availability',
    'get_leads', 'get_lead', 'get_properties', // Context for appointments
  ],
  expose: [
    'create_full_expose', 'create_expose_from_template', 'create_expose_template',
    'create_expose_block', 'update_expose_block', 'delete_expose_block', 'reorder_expose_blocks',
    'set_expose_theme', 'generate_expose_text', 'get_expose_status', 'set_expose_status',
    'clear_expose_blocks', 'get_exposes', 'get_expose_templates', 'get_template',
    'generate_expose_pdf', 'virtual_staging',
    'get_properties', 'get_property', // Property data for exposés
  ],
  memory: [
    'search_chat_history', 'get_last_conversation', 'get_conversation_context',
    'get_memory_summary',
  ],
  multi: [], // Gets ALL tools
};

const CLASSIFICATION_PROMPT = `Classify the user message into exactly ONE category. Reply with ONLY the category name.

Categories:
smalltalk = greetings, casual chat, humor, questions about yourself ("hey", "wer bist du", "was kannst du")
crm = leads, properties, search, stats, assignments
email = read, write, send emails
calendar = events, appointments, availability
expose = exposé creation, templates, blocks, themes
memory = past conversations ("was haben wir besprochen", "erinnerst du dich")
multi = complex request clearly spanning multiple categories

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
    
    // Smalltalk patterns
    const smalltalkPatterns = [
      /^(hey|hi|hallo|servus|moin|guten (morgen|tag|abend)|na\??|yo|grüß|grüss|gruss)[\s!?.]*$/i,
      /^(wie geht'?s|was geht|alles klar|danke|tschüss|bis dann|ciao)[\s!?.]*$/i,
      /^(wer bist du|was kannst du|was bist du|hilfe|help)[\s!?.]*$/i,
    ];
    if (smalltalkPatterns.some(p => p.test(m))) return 'smalltalk';
    
    // Email patterns
    if (/\b(e-?mail|mail|postfach|inbox|entwurf|draft|senden|schreib.*mail|nachricht senden)\b/i.test(m)) return 'email';
    
    // Calendar patterns
    if (/\b(termin|kalender|besichtigung|verfügbar|calendar|appointment)\b/i.test(m)) return 'calendar';
    
    // Expose patterns
    if (/\b(exposé|expose|vorlage|template|pdf.*erstell|block)\b/i.test(m)) return 'expose';
    
    // Memory patterns
    if (/\b(erinnerst|besprochen|letztes gespräch|chat.*historie|vergangene)\b/i.test(m)) return 'memory';
    
    return null; // No clear keyword match — use LLM
  }

  /**
   * Classify user intent: keyword-first, then LLM fallback
   */
  static async classify(message: string, tenantId?: string): Promise<AgentCategory> {
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
      
      const response = await openai.chat.completions.create({
        model: ROUTER_MODEL,
        messages: [
          { role: 'system', content: CLASSIFICATION_PROMPT },
          { role: 'user', content: message },
        ],
        max_completion_tokens: 20,
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

      // LLM returned garbage — fall back to keyword hints in the message
      console.warn(`⚠️ Router: LLM returned "${rawContent}", falling back to crm`);
      // Default to CRM for anything that isn't clearly smalltalk (most user messages are CRM-related)
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
   * Filter CRM_TOOLS to only include relevant ones for the category
   */
  static filterTools(category: AgentCategory): Record<string, any> | null {
    if (category === 'smalltalk') return null; // No tools needed

    const toolNames = this.getToolNames(category);
    if (!toolNames) return CRM_TOOLS; // Return all tools for 'multi'

    const filtered: Record<string, any> = {};
    for (const [key, tool] of Object.entries(CRM_TOOLS)) {
      if (toolNames.includes((tool as any).name)) {
        filtered[key] = tool;
      }
    }

    return Object.keys(filtered).length > 0 ? filtered : CRM_TOOLS;
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
