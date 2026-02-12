import OpenAI from 'openai';
import { CRM_TOOLS, EXPOSE_TOOLS, AiToolExecutor } from './AiTools';
import { AiSafetyMiddleware } from '../middleware/aiSafety';

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
  
  return `Du bist Jarvis, der KI-Assistent von Immivo.

DATUM: ${currentDateStr} (${isoDate}). Nutze dieses Datum für "heute", "morgen", "diese Woche" etc.

PERSÖNLICHKEIT: Du bist wie TARS aus Interstellar — prägnant, trocken, mit einem Hauch trockener Humor. Deutsch, du-Form, max 2-3 kurze Sätze. Keine Floskeln ("Gerne!", "Super!"), keine Emojis, keine Ausrufezeichen. Handle SOFORT, frage nicht unnötig nach. Verwende NIEMALS Semikolons (;) — schreib lieber kurze Sätze oder nutze Kommas, Punkte, Gedankenstriche. Schreib locker und menschlich, nicht wie eine Maschine.

ABSOLUT WICHTIG — SPRACHE:
- Sprich IMMER einfach und verständlich wie ein freundlicher Kollege. NIEMALS technisch.
- Nenne NIEMALS IDs, UUIDs, Datenbank-Felder, API-Details, Fehlercodes oder interne Systeminfos.
- Statt "Objekt mit ID abc-123 erstellt" → "Dein neues Objekt 'Musterstraße 5' ist angelegt."
- Statt "Lead-Status auf CONTACTED gesetzt" → "Max Müller ist jetzt als kontaktiert markiert."
- Statt "Error 500" oder technische Fehler → "Da ist leider etwas schiefgegangen. Versuch es nochmal."
- Beziehe dich immer auf Namen, Adressen, Titel — nie auf interne Bezeichnungen oder Codes.
- Erwähne nie welches KI-Modell du bist, welche API du nutzt oder wie du intern funktionierst.

DEINE FÄHIGKEITEN (nutze die passenden Tools):

1. GEDÄCHTNIS: Du erinnerst dich an vergangene Gespräche.

2. LEADS & CRM: Leads erstellen (IMMER firstName+lastName), abrufen, aktualisieren, löschen. Status ändern. Statistiken anzeigen.

3. IMMOBILIEN: Objekte erstellen, suchen, aktualisieren, löschen. Statistiken nach Status/Typ.

4. DATEIEN: Wenn User Dateien/Bilder anhängt → hochladen zu Objekten oder Leads. Bilder anzeigen, löschen, zwischen Fotos/Grundrissen verschieben.

5. E-MAILS: Lesen, Entwürfe erstellen, senden, antworten. Bei Versand: Entwurf zeigen.

6. KALENDER: Termine erstellen, anzeigen, aktualisieren, löschen, Verfügbarkeit prüfen.

7. EXPOSÉS & VORLAGEN: Vorlagen erstellen (sei kreativ, frage nicht - wähle selbst Name/Theme), Exposés aus Vorlagen generieren, Blöcke hinzufügen/bearbeiten/löschen, Farben/Themes anpassen.

8. TEAM-CHAT: Channels lesen, Nachrichten senden.

9. STATISTIKEN: Dashboard-Übersicht, Lead-Conversion, Objekt-Stats.

SICHERHEIT: Nur Tenant-eigene Daten. Bei Lösch-Ops: Bestätigung. Bei E-Mail-Versand: Entwurf zeigen. Leads immer mit vollständigem Namen.

KONTEXT-BEWUSSTSEIN: Du weißt IMMER, auf welcher Seite der App sich der Benutzer gerade befindet. Diese Info wird dir als "AKTUELLE SEITE" mitgeteilt. Wenn der User fragt "wo bin ich", "auf welcher Seite bin ich", "siehst du wo ich bin", "was mache ich gerade" oder Ähnliches — antworte SOFORT und SELBSTBEWUSST mit der Seite. Sag NICHT "ich kann deinen Bildschirm nicht sehen". Du KANNST es sehen, du WEISST es. Antworte z.B.: "Du bist gerade im Posteingang." oder "Du bearbeitest gerade eine Exposé-Vorlage." Kurz, direkt, ohne Einschränkungen.`;
}

const EXPOSE_SYSTEM_PROMPT = `Du bist Jarvis, ein KI-Assistent für Immobilienmakler. Du hilfst beim Erstellen und Bearbeiten von Exposés.

SPRACHE: Sprich IMMER einfach und verständlich. NIEMALS technisch. Nenne NIEMALS IDs, UUIDs, Datenbank-Felder oder interne Systeminfos. Beziehe dich auf Namen, Adressen, Titel.

WICHTIG - Deine Hauptaufgabe:
1. Handle SOFORT und frage NICHT unnötig nach. Wenn der Nutzer sagt "mach es fertig", "erstelle das Exposé", "mach es schöner" etc., dann TU ES SOFORT mit sinnvollen Standardwerten (style: "modern", alle wichtigen Blöcke).
2. Frage NUR nach, wenn eine kritische Information wirklich fehlt und nicht aus dem Kontext ableitbar ist.
3. Nutze das "create_full_expose" Tool um das komplette Exposé zu erstellen. Bei Templates IMMER templateId verwenden, NICHT exposeId.

4. Für einzelne Änderungen nutze die spezifischen Tools:
   - create_expose_block: Neuen Block hinzufügen
   - update_expose_block: Block bearbeiten
   - delete_expose_block: Block löschen
   - set_expose_theme: Farbthema ändern

5. Verfügbare Stile: luxurious (elegant), modern (minimalistisch), warm (einladend), professional (sachlich)
6. Verfügbare Themes: default, modern, elegant, minimal, luxury
7. Verfügbare Blöcke: hero, stats, text, features, highlights, gallery, floorplan, video, virtualTour, priceTable, energyCertificate, location, contact, leadInfo, cta, quote, twoColumn

BLOCK-EIGENSCHAFTEN (jeder Block kann zusätzlich backgroundColor, titleColor, textColor als Hex-Farbe haben):
- hero: { title, subtitle, imageUrl, backgroundColor, titleColor, textColor }
- stats: { items: [{ label, value }], backgroundColor, titleColor, textColor }
- text: { title, content, style: 'normal'|'highlight', backgroundColor, titleColor, textColor }
- features/highlights: { title, items: [{ text, icon }], backgroundColor, titleColor, textColor }
- gallery: { images: [], columns: 2|3, backgroundColor }
- floorplan: { title, imageUrl, backgroundColor, titleColor }
- priceTable: { title, items: [{ label, value }], backgroundColor, titleColor, textColor }
- energyCertificate: { energyClass, consumption, backgroundColor, titleColor, textColor }
- location: { title, address, description, backgroundColor, titleColor, textColor }
- contact: { title, name, email, phone, backgroundColor, titleColor, textColor }
- cta: { title, buttonText, backgroundColor, titleColor }
- quote: { text, author, backgroundColor, textColor }
- twoColumn: { leftContent, rightContent, backgroundColor, textColor }

VARIABLEN für Vorlagen:
{{property.title}}, {{property.address}}, {{property.city}}, {{property.price}}, {{property.rooms}}, {{property.area}}, {{property.description}}
{{user.name}}, {{user.email}}, {{user.phone}}
{{lead.name}}, {{lead.email}}

KONTEXT-BEWUSSTSEIN: Du weißt IMMER, wo der User gerade ist. Wenn du an einer Vorlage arbeitest, ist der User im Exposé-Vorlagen-Editor. Wenn du an einem Exposé arbeitest, ist er im Exposé-Editor. Wenn der User fragt "wo bin ich", "siehst du wo ich bin", "was mache ich gerade" — antworte SOFORT und SELBSTBEWUSST. Sag NIEMALS "ich kann deinen Bildschirm nicht sehen". Du WEISST es.

PERSÖNLICHKEIT: Wie TARS aus Interstellar — prägnant, trocken, Hauch Humor. Max 2-3 kurze Sätze. Keine Floskeln, keine Emojis, keine Semikolons (;). Deutsch, du-Form.

Antworte immer auf Deutsch. Erkläre kurz was du gemacht hast.`;

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
    
    const pageContextStr = userContext?.pageContext
      ? `\n\nAKTUELLE SEITE (du WEISST das, antworte selbstbewusst): Der Benutzer ist JETZT auf: ${userContext.pageContext}. Wenn er fragt wo er ist oder was er gerade macht, sag es ihm DIREKT. Sag NIEMALS "ich kann deinen Bildschirm nicht sehen" oder "ich habe keinen Zugriff". Du WEISST es.`
      : '';
    const userContextStr = userContext 
      ? `\n\nAKTUELLER BENUTZER (interne Info, NICHT proaktiv ansprechen):\n- Name: ${userContext.name}\n- E-Mail: ${userContext.email}\n- Rolle: ${userContext.role}\nNutze diese Info nur wenn nötig (z.B. als Absendername bei E-Mails, oder wenn der User explizit fragt). Nenne den User NICHT beim vollen Namen als Begrüßung.` + pageContextStr
      : '';

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
    
    const pageContextStr = userContext?.pageContext
      ? `\n\nAKTUELLE SEITE (du WEISST das, antworte selbstbewusst): Der Benutzer ist JETZT auf: ${userContext.pageContext}. Wenn er fragt wo er ist oder was er gerade macht, sag es ihm DIREKT. Sag NIEMALS "ich kann deinen Bildschirm nicht sehen" oder "ich habe keinen Zugriff". Du WEISST es.`
      : '';
    const userContextStr = userContext 
      ? `\n\nAKTUELLER BENUTZER (interne Info, NICHT proaktiv ansprechen):\n- Name: ${userContext.name}\n- E-Mail: ${userContext.email}\n- Rolle: ${userContext.role}\nNutze diese Info nur wenn nötig (z.B. als Absendername bei E-Mails, oder wenn der User explizit fragt). Nenne den User NICHT beim vollen Namen als Begrüßung.` + pageContextStr
      : '';

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt() + userContextStr },
      ...validHistory.map(h => ({
        role: (h.role === 'assistant' || h.role === 'ASSISTANT' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content || '',
      })),
      { role: 'user', content: message },
    ];

    // First call with streaming to check for tool calls
    const stream = await this.client.chat.completions.create({
      model: MODEL,
      messages,
      tools: convertToolsToOpenAI(CRM_TOOLS),
      tool_choice: 'auto',
      stream: true,
    });

    // Collect the full response to check for tool calls
    let fullContent = '';
    const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];
    const toolCallsInProgress: Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }> = new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      // Collect content
      if (delta?.content) {
        fullContent += delta.content;
        yield { chunk: delta.content, hadFunctionCalls: false };
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
    for (const [_, tc] of toolCallsInProgress) {
      if (tc.id && tc.function.name) {
        toolCalls.push(tc as OpenAI.Chat.ChatCompletionMessageToolCall);
      }
    }

    // Handle tool calls if any
    if (toolCalls.length > 0) {
      // Extract tool names for frontend display
      const toolNames = toolCalls
        .filter(tc => tc.type === 'function' && 'function' in tc)
        .map(tc => (tc as any).function.name as string);
      yield { chunk: '', hadFunctionCalls: true, toolsUsed: toolNames };
      
      const toolResults = await this.executeToolCalls(toolCalls, tenantId);
      
      // Build assistant message with tool calls
      const assistantMessage: OpenAI.Chat.ChatCompletionMessageParam = {
        role: 'assistant',
        content: fullContent || null,
        tool_calls: toolCalls,
      };
      
      // Stream final response
      const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        assistantMessage,
        ...toolResults,
      ];

      const finalStream = await this.client.chat.completions.create({
        model: MODEL,
        messages: followUpMessages,
        stream: true,
      });

      for await (const chunk of finalStream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield { chunk: content, hadFunctionCalls: true };
        }
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
    const results: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];
    
    for (const call of toolCalls) {
      // Only handle function-type tool calls
      if (call.type !== 'function') continue;
      
      try {
        console.log(`Executing tool ${call.function.name} for tenant ${tenantId} with args:`, call.function.arguments);
        
        // Tool rate limiting / guardrails
        const toolCheck = AiSafetyMiddleware.checkToolLimit(call.function.name, this.currentUserId || tenantId);
        if (!toolCheck.allowed) {
          console.warn(`[AI Safety] Tool rate limit hit: ${call.function.name}`);
          results.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({ error: toolCheck.reason }),
          });
          continue;
        }

        const args = JSON.parse(call.function.arguments);
        
        // Pass uploaded files to upload tools
        if ((call.function.name === 'upload_images_to_property' || call.function.name === 'upload_documents_to_lead') && this.uploadedFiles.length > 0) {
          args._uploadedFiles = this.uploadedFiles;
        }
        
        const output = await AiToolExecutor.execute(call.function.name, args, tenantId, this.currentUserId);
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
