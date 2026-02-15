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

// Tool name prefixes per category
const TOOL_CATEGORIES: Record<AgentCategory, string[]> = {
  smalltalk: [],
  crm: [
    'get_leads', 'create_lead', 'update_lead', 'delete_leads', 'change_lead_status',
    'get_properties', 'create_property', 'update_property', 'delete_property',
    'get_dashboard_stats', 'upload_images_to_property', 'upload_documents_to_lead',
    'assign_property_to_lead', 'semantic_search',
  ],
  email: [
    'get_emails', 'get_email_detail', 'create_email_draft', 'send_email', 'reply_to_email',
    'get_leads', // Need lead context for emails
  ],
  calendar: [
    'get_calendar_events', 'create_calendar_event', 'update_calendar_event', 
    'delete_calendar_event', 'check_availability',
    'get_leads', 'get_properties', // Context for appointments
  ],
  expose: [
    'create_full_expose', 'create_expose_block', 'update_expose_block', 
    'delete_expose_block', 'set_expose_theme', 'generate_expose_text',
    'get_properties', // Need property data
  ],
  memory: [
    'search_chat_history', 'get_last_conversation', 'get_topic_context',
    'get_long_term_memory', 'update_long_term_memory',
  ],
  multi: [], // Gets ALL tools
};

const CLASSIFICATION_PROMPT = `Du bist ein Intent-Klassifizierer für ein Immobilien-CRM. Klassifiziere die User-Nachricht in GENAU EINE Kategorie.

Kategorien:
- smalltalk: Begrüßung, Smalltalk, Humor, Fragen über dich ("hey", "wie geht's", "was kannst du")
- crm: Leads erstellen/suchen/bearbeiten, Immobilien verwalten, Dashboard-Statistiken, Zuweisungen
- email: E-Mails lesen, schreiben, senden, Entwürfe
- calendar: Termine, Kalender, Verfügbarkeit, Besichtigungen
- expose: Exposés erstellen, bearbeiten, Vorlagen, Blöcke, Themes
- memory: Fragen über vergangene Gespräche ("was haben wir besprochen", "erinnerst du dich")
- multi: Komplexe Anfrage die MEHRERE der obigen Kategorien klar umfasst

Antworte NUR mit dem Kategorienamen, nichts anderes.`;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
}

export class AgentRouter {
  /**
   * Classify user intent (cheap, fast ~100ms with gpt-5-mini)
   */
  static async classify(message: string, tenantId?: string): Promise<AgentCategory> {
    const startTime = Date.now();
    try {
      const openai = getOpenAI();
      
      const response = await openai.chat.completions.create({
        model: ROUTER_MODEL,
        messages: [
          { role: 'system', content: CLASSIFICATION_PROMPT },
          { role: 'user', content: message },
        ],
        max_completion_tokens: 10,
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

      const category = (response.choices[0]?.message?.content || '').trim().toLowerCase() as AgentCategory;
      
      // Validate
      if (TOOL_CATEGORIES[category] !== undefined) {
        console.log(`🧭 Router: "${message.substring(0, 50)}..." → ${category} (${Date.now() - startTime}ms)`);
        return category;
      }

      // Fallback to multi if classification is unclear
      console.warn(`⚠️ Router: Unknown category "${category}", falling back to multi`);
      return 'multi';
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
