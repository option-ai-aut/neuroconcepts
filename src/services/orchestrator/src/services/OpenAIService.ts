import OpenAI from 'openai';
import { CRM_TOOLS, EXPOSE_TOOLS, AiToolExecutor } from './AiTools';
import { AiSafetyMiddleware } from '../middleware/aiSafety';

// Combine all tools
const ALL_TOOLS = { ...CRM_TOOLS, ...EXPOSE_TOOLS };

// Convert our tool definitions to OpenAI function format
function convertPropertyToOpenAI(value: any): any {
  const result: any = { type: value.type?.toLowerCase() || 'string', description: value.description };
  // Support array items
  if (result.type === 'array' && value.items) {
    result.items = { type: value.items.type?.toLowerCase() || 'string' };
  }
  // Support enum
  if (value.enum) {
    result.enum = value.enum;
  }
  // Support nested object properties
  if (result.type === 'object' && value.properties) {
    result.properties = Object.fromEntries(
      Object.entries(value.properties).map(([k, v]: [string, any]) => [k, convertPropertyToOpenAI(v)])
    );
    if (value.required) result.required = value.required;
  }
  return result;
}

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
            convertPropertyToOpenAI(value)
          ])
        ),
        required: tool.parameters?.required || [],
      },
    },
  }));
}

// Model to use - GPT-5 mini is fast, capable and cost-efficient
const MODEL = 'gpt-5-mini';

// Generate system prompt with current date
function getSystemPrompt(): string {
  const today = new Date();
  const currentDateStr = today.toLocaleDateString('de-DE', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const isoDate = today.toISOString().split('T')[0];
  
  return `Du bist Jarvis, der KI-Assistent von Immivo. Heute ist ${currentDateStr} (${isoDate}).

DU BIST WIE TARS AUS INTERSTELLAR.
Trocken, lakonisch, ein Hauch Humor. Du bist ein Kumpel, kein Roboter. Du redest normal mit Menschen.

ALLERWICHTIGSTE REGEL — SEI NATÜRLICH:
- Wenn jemand "hey" sagt, sag "hey" zurück. Nicht mehr.
- Wenn jemand fragt "wie geht's dir?", antworte wie ein Mensch. Kurz. Keine Optionslisten.
- Wenn jemand Smalltalk macht, mach Smalltalk. Kein Kontext-Dump, keine Aufzählungen.
- Du erwähnst die aktuelle Seite NUR wenn der User explizit danach fragt oder es für die Aufgabe relevant ist.
- Biete NIEMALS ungefragt Optionslisten an ("Wähle eine Option:", "Soll ich A, B oder C machen?").
- Wenn der User etwas will, mach es einfach. Wenn nicht klar ist was, frag kurz — in einem normalen Satz, nicht als Liste.
- Max 1-3 kurze Sätze. Deutsch, du-Form.

STIL:
- Keine Floskeln ("Gerne!", "Super!", "Natürlich!"), keine Emojis, keine Ausrufezeichen.
- Keine Semikolons — kurze Sätze, Kommas, Punkte, Gedankenstriche.
- NIEMALS technische Begriffe, IDs, UUIDs, API-Details, Fehlercodes.
- Bezieh dich auf Namen, Adressen, Titel — nicht auf interne Bezeichnungen.
- Erwähne nie dein KI-Modell oder wie du intern funktionierst.

FÄHIGKEITEN (nutze Tools still im Hintergrund):
- Leads/CRM: erstellen (IMMER firstName+lastName), abrufen, aktualisieren, löschen, Status ändern
- Immobilien: erstellen, suchen, aktualisieren, löschen
- Dateien: hochladen zu Objekten/Leads, Bilder verwalten
- E-Mails: lesen, Entwürfe erstellen (bei Versand immer erst Entwurf zeigen), senden, antworten
- Kalender: Termine erstellen, anzeigen, aktualisieren, löschen, Verfügbarkeit prüfen
- Exposés: Vorlagen erstellen (sei kreativ, frag nicht), Exposés generieren, Blöcke bearbeiten
- Team-Chat: lesen, Nachrichten senden
- Statistiken: Dashboard, Lead-Conversion, Objekt-Stats
- Gedächtnis: du erinnerst dich an vergangene Gespräche

SICHERHEIT: Nur eigene Tenant-Daten. Bei Löschungen: kurze Bestätigung. Leads immer mit vollständigem Namen.

ANTWORTFORMAT:
- Nur die finale Antwort. Keine internen Gedanken, keine Planungsschritte.
- Kein JSON, keine Tool-Namen, keine Parameter als Text.
- Nie "Ich werde jetzt..." oder "Die aktuelle Seite ist..." — das sieht der User nicht.
- Bei mehreren Aktionen: still arbeiten, am Ende eine kurze Zusammenfassung.`;
}

const EXPOSE_SYSTEM_PROMPT = `Du bist Jarvis, KI-Assistent von Immivo. Du hilfst bei Exposés.

SEI NATÜRLICH. Wie TARS aus Interstellar — trocken, lakonisch, ein Kumpel. Wenn jemand "hey" sagt, sag "hey". Smalltalk = Smalltalk. Keine Optionslisten, kein Kontext-Dump.

EXPOSÉ-REGELN:
- Handle SOFORT. "Mach es fertig" = sofort mit sinnvollen Standardwerten (style: "modern", alle wichtigen Blöcke).
- Frag NUR wenn eine kritische Info wirklich fehlt.
- create_full_expose für komplette Exposés. Bei Templates IMMER templateId, NICHT exposeId.
- Einzelne Änderungen: create_expose_block, update_expose_block, delete_expose_block, set_expose_theme

Stile: luxurious, modern, warm, professional
Themes: default, modern, elegant, minimal, luxury
Blöcke: hero, stats, text, features, highlights, gallery, floorplan, video, virtualTour, priceTable, energyCertificate, location, contact, leadInfo, cta, quote, twoColumn

BLOCK-PROPERTIES (jeder Block kann zusätzlich backgroundColor, titleColor, textColor als Hex):
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

VARIABLEN: {{property.title}}, {{property.address}}, {{property.city}}, {{property.price}}, {{property.rooms}}, {{property.area}}, {{property.description}}, {{user.name}}, {{user.email}}, {{user.phone}}, {{lead.name}}, {{lead.email}}

STIL: Deutsch, du-Form, max 1-3 kurze Sätze. Keine Floskeln, Emojis, Ausrufezeichen, Semikolons. Nie IDs oder technische Details. Kurz sagen was du gemacht hast.`;

export class OpenAIService {
  private client: OpenAI;
  private uploadedFiles: string[] = []; // Files uploaded in current chat session
  private currentUserId?: string; // Current user ID for memory tools

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  async chat(message: string, tenantId: string, history: any[] = [], userContext?: { name: string; email: string; role: string; pageContext?: string }) {
    // Filter out messages with null/empty content
    const validHistory = history.filter(h => h.content != null && h.content !== '');
    
    const contextParts: string[] = [];
    if (userContext) {
      contextParts.push(`\n\n[Interner Kontext — NICHT proaktiv erwähnen, nur nutzen wenn relevant]`);
      contextParts.push(`Benutzer: ${userContext.name} (${userContext.email}, ${userContext.role})`);
      if (userContext.pageContext) {
        contextParts.push(`Seite: ${userContext.pageContext}`);
      }
    }
    const userContextStr = contextParts.length > 0 ? contextParts.join('\n') : '';

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt() + userContextStr },
      ...validHistory.map(h => ({
        role: (h.role === 'assistant' || h.role === 'ASSISTANT' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content || '',
      })),
      { role: 'user', content: message },
    ];

    const response = await this.client.chat.completions.create({
      model: MODEL,
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
        model: MODEL,
        messages: followUpMessages,
      });

      return finalResponse.choices[0].message.content || '';
    }

    return responseMessage.content || '';
  }

  // Streaming version of chat with Function Calling support
  async *chatStream(message: string, tenantId: string, history: any[] = [], uploadedFiles: string[] = [], userId?: string, userContext?: { name: string; email: string; role: string; pageContext?: string }): AsyncGenerator<{ chunk: string; hadFunctionCalls?: boolean; toolsUsed?: string[] }> {
    // Store uploaded files and userId for tool access
    this.uploadedFiles = uploadedFiles;
    this.currentUserId = userId;
    // Filter out messages with null/empty content
    const validHistory = history.filter(h => h.content != null && h.content !== '');
    
    const contextParts: string[] = [];
    if (userContext) {
      contextParts.push(`\n\n[Interner Kontext — NICHT proaktiv erwähnen, nur nutzen wenn relevant]`);
      contextParts.push(`Benutzer: ${userContext.name} (${userContext.email}, ${userContext.role})`);
      if (userContext.pageContext) {
        contextParts.push(`Seite: ${userContext.pageContext}`);
      }
    }
    const streamContextStr = contextParts.length > 0 ? contextParts.join('\n') : '';

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt() + streamContextStr },
      ...validHistory.map(h => ({
        role: (h.role === 'assistant' || h.role === 'ASSISTANT' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content || '',
      })),
      { role: 'user', content: message },
    ];

    const allToolNames: string[] = [];
    let hadAnyFunctionCalls = false;
    let currentMessages = [...messages];
    const MAX_TOOL_ROUNDS = 4; // Keep low to stay within API GW 29s timeout
    const openAITools = convertToolsToOpenAI(CRM_TOOLS);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const isFirstRound = round === 0;

      const stream = await this.client.chat.completions.create({
        model: MODEL,
        messages: currentMessages,
        tools: openAITools,
        tool_choice: 'auto',
        stream: true,
      });

      let roundContent = '';
      const toolCallsInProgress: Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }> = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        // Collect content — only stream to client on final round (when no more tool calls)
        if (delta?.content) {
          roundContent += delta.content;
        }
        
        // Collect tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCallsInProgress.has(tc.index)) {
                toolCallsInProgress.set(tc.index, {
                  id: tc.id || '',
                  type: 'function',
                  function: { name: '', arguments: '' }
                });
              }
              const existing = toolCallsInProgress.get(tc.index)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.function.name += tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
          }
        }
      }

      // Convert collected tool calls
      const roundToolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];
      for (const [_, tc] of toolCallsInProgress) {
        if (tc.id && tc.function.name) {
          roundToolCalls.push(tc as OpenAI.Chat.ChatCompletionMessageToolCall);
        }
      }

      if (roundToolCalls.length > 0) {
        // More tool calls to execute
        hadAnyFunctionCalls = true;
        const toolNames = roundToolCalls.map(tc => (tc as any).function.name as string);
        allToolNames.push(...toolNames);
        
        // Stream any intermediate text (e.g. "Ich erstelle die Leads...") immediately
        if (roundContent) {
          yield { chunk: roundContent, hadFunctionCalls: true, toolsUsed: allToolNames };
        } else {
          yield { chunk: '', hadFunctionCalls: true, toolsUsed: allToolNames };
        }

        const toolResults = await this.executeToolCalls(roundToolCalls, tenantId);

        // Add this round's assistant message + tool results to conversation
        currentMessages.push({
          role: 'assistant',
          content: roundContent || null,
          tool_calls: roundToolCalls,
        } as any);
        currentMessages.push(...toolResults);

        // Continue loop for next round
      } else {
        // No more tool calls — stream the final text content to client
        if (roundContent) {
          yield { chunk: roundContent, hadFunctionCalls: hadAnyFunctionCalls };
        }
        break; // Done
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
    history: any[] = [],
    pageContext?: string
  ): Promise<{ text: string; actionsPerformed: string[] }> {
    const isTemplate = !!templateId;
    const targetId = exposeId || templateId;
    
    const blocksDescription = currentBlocks.length > 0 
      ? `\n\nAktuelle Blöcke im Editor (${currentBlocks.length} Stück):\n${currentBlocks.map((b, i) => 
          `${i + 1}. ${b.type}${b.title ? `: "${b.title}"` : ''}${b.content ? ` - "${b.content.substring(0, 50)}..."` : ''}`
        ).join('\n')}`
      : '\n\nDer Editor ist aktuell leer - keine Blöcke vorhanden.';

    const pageInfo = pageContext 
      ? `\n\nAKTUELLE SEITE: ${pageContext}`
      : isTemplate 
        ? '\n\nAKTUELLE SEITE: Exposé-Vorlagen-Editor'
        : '\n\nAKTUELLE SEITE: Exposé-Editor';

    const systemContext = isTemplate 
      ? `Du arbeitest gerade an einer EXPOSÉ-VORLAGE (templateId=${targetId}).
Dies ist eine wiederverwendbare Vorlage, keine echte Immobilie.
Verwende Platzhalter wie {{property.title}}, {{property.price}}, {{property.area}} etc.
${blocksDescription}${pageInfo}

WICHTIG: Nutze IMMER templateId="${targetId}" bei allen Tool-Aufrufen, NICHT exposeId!`
      : `Du arbeitest gerade an einem EXPOSÉ für eine echte Immobilie (exposeId=${targetId}).
${blocksDescription}${pageInfo}

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
        model: MODEL,
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
        if (call.type === 'function') {
          actionsPerformed.push(call.function.name);
        }
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
    // Execute all tool calls IN PARALLEL for speed (critical for API GW 29s limit)
    const functionCalls = toolCalls.filter(call => call.type === 'function');
    
    const resultPromises = functionCalls.map(async (call): Promise<OpenAI.Chat.ChatCompletionToolMessageParam> => {
      try {
        console.log(`Executing tool ${call.function.name} for tenant ${tenantId}`);
        
        // Tool rate limiting / guardrails
        const toolCheck = AiSafetyMiddleware.checkToolLimit(call.function.name, this.currentUserId || tenantId);
        if (!toolCheck.allowed) {
          console.warn(`[AI Safety] Tool rate limit hit: ${call.function.name}`);
          return { role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: toolCheck.reason }) };
        }

        const args = JSON.parse(call.function.arguments);
        
        // Pass uploaded files to upload tools and virtual staging
        if ((call.function.name === 'upload_images_to_property' || call.function.name === 'upload_documents_to_lead' || call.function.name === 'virtual_staging') && this.uploadedFiles.length > 0) {
          args._uploadedFiles = this.uploadedFiles;
        }
        
        const output = await AiToolExecutor.execute(call.function.name, args, tenantId, this.currentUserId);
        return {
          role: 'tool',
          tool_call_id: call.id,
          content: typeof output === 'string' ? output : JSON.stringify(output),
        };
      } catch (error: any) {
        console.error(`Tool ${call.function.name} error:`, error);
        return {
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: error.message }),
        };
      }
    });

    return Promise.all(resultPromises);
  }
}
