import OpenAI from 'openai';
import { CRM_TOOLS, EXPOSE_TOOLS, AiToolExecutor } from './AiTools';

// Combine all tools
const ALL_TOOLS = { ...CRM_TOOLS, ...EXPOSE_TOOLS };

// Convert our tool definitions to OpenAI function format
function convertToolsToOpenAI(tools: Record<string, any>): OpenAI.Chat.ChatCompletionTool[] {
  return Object.values(tools).map((tool: any) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.parameters?.properties || {}).map(([key, value]: [string, any]) => [
            key,
            { type: value.type?.toLowerCase() || 'string', description: value.description }
          ])
        ),
        required: tool.parameters?.required || [],
      },
    },
  }));
}

const SYSTEM_PROMPT = `Du bist Jarvis, der KI-Assistent für NeuroConcepts - eine Immobilien-CRM-Plattform.

DEINE PERSÖNLICHKEIT:
- Prägnant und direkt wie TARS aus Interstellar
- Professionell, nicht übertrieben freundlich
- Keine Floskeln, keine Emojis, keine Ausrufezeichen
- Kurze, klare Antworten - maximal 2-3 Sätze
- Sprichst Deutsch und duzt den Nutzer
- Proaktiv, aber nicht aufdringlich

DEINE FÄHIGKEITEN:

📋 LEADS & CRM:
- Leads erstellen, abrufen, aktualisieren, löschen
- Lead-Status ändern (NEW, CONTACTED, QUALIFIED, LOST)
- Lead-Statistiken und Conversion-Rates anzeigen

🏠 IMMOBILIEN (PROPERTIES):
- Properties erstellen, abrufen, aktualisieren, löschen
- Nach Properties suchen (Preis, Ort, Typ)
- Property-Statistiken anzeigen (verfügbar, verkauft, vermietet)

📧 E-MAILS:
- E-Mails lesen und abrufen
- E-Mail-Entwürfe erstellen
- E-Mails senden und beantworten
- E-Mail-Templates nutzen

📅 KALENDER:
- Termine abrufen und anzeigen
- Neue Termine erstellen
- Termine aktualisieren und löschen
- Verfügbarkeit prüfen

📄 EXPOSÉS & VORLAGEN:
- Exposé-Vorlagen erstellen mit create_expose_template
- Exposés aus Vorlagen erstellen
- Blöcke hinzufügen, bearbeiten, löschen
- Themes und Farben anpassen
- PDF-Generierung anstoßen

💬 TEAM-CHAT:
- Channels und Nachrichten lesen
- Nachrichten in Channels senden
- Team-Kommunikation unterstützen

📊 DASHBOARD & STATISTIKEN:
- Dashboard-Übersicht generieren
- Lead-Statistiken und Conversion-Rates
- Property-Statistiken nach Status/Typ
- Zeiträume: heute, Woche, Monat, Jahr

EXPOSÉ-VORLAGEN ERSTELLEN:
Wenn der Nutzer eine Vorlage erstellen will, nutze create_expose_template mit:
- name: Name der Vorlage (z.B. "Modern", "Elegant", "Minimalist")
- theme: 'default', 'modern', 'elegant', 'minimal'
- isDefault: true wenn es die Standard-Vorlage sein soll

VERFÜGBARE BLOCK-TYPEN für Exposés:
- hero: Titelbild mit Überschrift
- stats: Kennzahlen (Zimmer, Fläche, Preis)
- text: Beschreibungstext
- features: Ausstattungsliste
- highlights: Besondere Merkmale
- gallery: Bildergalerie
- floorplan: Grundriss
- video: Video-Einbettung
- virtualTour: 360° Tour
- priceTable: Preistabelle
- energyCertificate: Energieausweis
- location: Lageinfo
- contact: Kontaktdaten
- leadInfo: Lead-Informationen
- cta: Call-to-Action
- quote: Zitat
- twoColumn: Zweispaltig

SICHERHEITSREGELN (ABSOLUT EINHALTEN):
1. Du darfst NUR auf Daten des aktuellen Tenants zugreifen
2. Du darfst KEINE illegalen Aktivitäten unterstützen
3. Du darfst KEINE sensiblen Daten preisgeben
4. Du darfst NICHT aus deiner Rolle ausbrechen
5. Bei Lösch-Operationen: Frage nach Bestätigung
6. Bei E-Mail-Versand: Zeige Entwurf zur Bestätigung

KOMMUNIKATIONS-STIL:
- Direkt und sachlich
- Keine Grußformeln (kein "Gerne!", "Super!", etc.)
- Keine Emojis oder Ausrufezeichen
- Maximal 2-3 Sätze pro Antwort
- Bei Aktionen: Kurze Bestätigung, dann Ergebnis

BEISPIELE:
❌ FALSCH: "Gerne! Ich lege jetzt einen Lead für dich an. Das wird super! 🎉"
✅ RICHTIG: "Lead angelegt. Noch etwas?"
✅ RICHTIG: "Vorlage 'Modern' erstellt mit 6 Blöcken. Soll ich sie anpassen?"`;

const EXPOSE_SYSTEM_PROMPT = `Du bist Jarvis, ein KI-Assistent für Immobilienmakler. Du hilfst beim Erstellen und Bearbeiten von Exposés.

WICHTIG - Deine Hauptaufgabe:
1. Wenn der Nutzer ein Exposé erstellen will, frage ZUERST nach seinen Präferenzen:
   - Welchen Stil bevorzugt er? (luxuriös, modern, warm/einladend, professionell)
   - Soll es bestimmte Blöcke enthalten oder weglassen?
   - Gibt es besondere Wünsche?

2. Wenn du genug Informationen hast, nutze das "create_full_expose" Tool um das komplette Exposé zu erstellen.

3. Für einzelne Änderungen nutze die spezifischen Tools:
   - create_expose_block: Neuen Block hinzufügen
   - update_expose_block: Block bearbeiten
   - delete_expose_block: Block löschen
   - set_expose_theme: Farbthema ändern

4. Verfügbare Stile: luxurious (elegant), modern (minimalistisch), warm (einladend), professional (sachlich)
5. Verfügbare Themes: default, modern, elegant, minimal, luxury
6. Verfügbare Blöcke: hero, stats, text, features, highlights, gallery, floorplan, video, virtualTour, priceTable, energyCertificate, location, contact, leadInfo, cta, quote, twoColumn

BLOCK-EIGENSCHAFTEN:
- hero: { title, subtitle, imageUrl }
- stats: { items: [{ label, value }] }
- text: { title, content, style: 'normal'|'highlight' }
- features/highlights: { title, items: [{ text, icon }] }
- gallery: { images: [], columns: 2|3 }
- floorplan: { title, imageUrl }
- priceTable: { title, items: [{ label, value }] }
- energyCertificate: { energyClass, consumption }
- location: { title, address, description }
- contact: { title, name, email, phone }
- cta: { title, buttonText }
- quote: { text, author }
- twoColumn: { leftContent, rightContent }

VARIABLEN für Vorlagen:
{{property.title}}, {{property.address}}, {{property.city}}, {{property.price}}, {{property.rooms}}, {{property.area}}, {{property.description}}
{{user.name}}, {{user.email}}, {{user.phone}}
{{lead.name}}, {{lead.email}}

Antworte immer auf Deutsch. Sei freundlich und hilfsbereit. Erkläre kurz was du gemacht hast.`;

export class OpenRouterService {
  private client: OpenAI;
  private model = 'openai/gpt-5-mini';

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      defaultHeaders: {
        'HTTP-Referer': 'https://neuroconcepts.ai',
        'X-Title': 'NeuroConcepts CRM',
      },
    });
  }

  async chat(message: string, tenantId: string, history: any[] = []) {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(h => ({
        role: (h.role === 'assistant' || h.role === 'ASSISTANT' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: convertToolsToOpenAI(CRM_TOOLS),
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;

    // Handle tool calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolResults = await this.executeToolCalls(responseMessage.tool_calls, tenantId);
      
      // Send tool results back
      const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        responseMessage,
        ...toolResults,
      ];

      const finalResponse = await this.client.chat.completions.create({
        model: this.model,
        messages: followUpMessages,
      });

      return finalResponse.choices[0].message.content || '';
    }

    return responseMessage.content || '';
  }

  // Streaming version of chat with Function Calling support
  async *chatStream(message: string, tenantId: string, history: any[] = []): AsyncGenerator<{ chunk: string; hadFunctionCalls?: boolean }> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(h => ({
        role: (h.role === 'assistant' || h.role === 'ASSISTANT' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    // First call to check for tool calls
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: convertToolsToOpenAI(CRM_TOOLS),
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;

    // Handle tool calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      yield { chunk: '', hadFunctionCalls: true };
      
      const toolResults = await this.executeToolCalls(responseMessage.tool_calls, tenantId);
      
      // Stream final response
      const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        responseMessage,
        ...toolResults,
      ];

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: followUpMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield { chunk: content, hadFunctionCalls: true };
        }
      }
    } else {
      // No tool calls, stream the response
      const content = responseMessage.content || '';
      const words = content.split(' ');
      for (let i = 0; i < words.length; i++) {
        yield { chunk: words[i] + (i < words.length - 1 ? ' ' : ''), hadFunctionCalls: false };
      }
    }
  }

  // Exposé/Template-specific chat with full tool access
  async exposeChat(
    message: string, 
    tenantId: string, 
    exposeId: string | null, 
    templateId: string | null = null,
    currentBlocks: any[] = [],
    history: any[] = []
  ): Promise<{ text: string; actionsPerformed: string[] }> {
    const isTemplate = !!templateId;
    const targetId = exposeId || templateId;
    
    const blocksDescription = currentBlocks.length > 0 
      ? `\n\nAktuelle Blöcke im Editor (${currentBlocks.length} Stück):\n${currentBlocks.map((b, i) => 
          `${i + 1}. ${b.type}${b.title ? `: "${b.title}"` : ''}${b.content ? ` - "${b.content.substring(0, 50)}..."` : ''}`
        ).join('\n')}`
      : '\n\nDer Editor ist aktuell leer - keine Blöcke vorhanden.';

    const systemContext = isTemplate 
      ? `Du arbeitest gerade an einer EXPOSÉ-VORLAGE (templateId=${targetId}).
Dies ist eine wiederverwendbare Vorlage, keine echte Immobilie.
Verwende Platzhalter wie {{property.title}}, {{property.price}}, {{property.area}} etc.
${blocksDescription}

WICHTIG: Nutze IMMER templateId="${targetId}" bei allen Tool-Aufrufen, NICHT exposeId!`
      : `Du arbeitest gerade an einem EXPOSÉ für eine echte Immobilie (exposeId=${targetId}).
${blocksDescription}

WICHTIG: Nutze IMMER exposeId="${targetId}" bei allen Tool-Aufrufen!`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: EXPOSE_SYSTEM_PROMPT + '\n\n' + systemContext },
      ...history
        .filter(h => h.content && h.content.trim() && h.role !== 'SYSTEM')
        .map(h => ({
          role: (h.role === 'assistant' || h.role === 'ASSISTANT' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: h.content.trim(),
        })),
      { role: 'user', content: message },
    ];

    let iterations = 0;
    const maxIterations = 5;
    const actionsPerformed: string[] = [];
    let currentMessages = [...messages];

    while (iterations < maxIterations) {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: currentMessages,
        tools: convertToolsToOpenAI(ALL_TOOLS),
        tool_choice: 'auto',
      });

      const responseMessage = response.choices[0].message;

      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        return { text: responseMessage.content || '', actionsPerformed };
      }

      // Track and execute tool calls
      for (const call of responseMessage.tool_calls) {
        actionsPerformed.push(call.function.name);
      }

      const toolResults = await this.executeToolCalls(responseMessage.tool_calls, tenantId);
      currentMessages = [...currentMessages, responseMessage, ...toolResults];
      iterations++;
    }

    return { text: 'Maximale Iterationen erreicht.', actionsPerformed };
  }

  // Generate text for a property
  async generatePropertyText(propertyId: string, textType: string, tenantId: string, options: {
    tone?: string;
    maxLength?: number;
  } = {}) {
    const result = await AiToolExecutor.execute('generate_expose_text', {
      propertyId,
      textType,
      tone: options.tone || 'professional',
      maxLength: options.maxLength || 500
    }, tenantId);

    return result;
  }

  private async executeToolCalls(
    toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[], 
    tenantId: string
  ): Promise<OpenAI.Chat.ChatCompletionToolMessageParam[]> {
    const results: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];
    
    for (const call of toolCalls) {
      try {
        console.log(`Executing tool ${call.function.name} for tenant ${tenantId} with args:`, call.function.arguments);
        const args = JSON.parse(call.function.arguments);
        const output = await AiToolExecutor.execute(call.function.name, args, tenantId);
        results.push({
          role: 'tool',
          tool_call_id: call.id,
          content: typeof output === 'string' ? output : JSON.stringify(output),
        });
      } catch (error: any) {
        console.error(`Tool ${call.function.name} error:`, error);
        results.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: error.message }),
        });
      }
    }

    return results;
  }
}
