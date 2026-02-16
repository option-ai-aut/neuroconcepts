import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { CRM_TOOLS, EXPOSE_TOOLS, AiToolExecutor } from './AiTools';
import { AiSafetyMiddleware } from '../middleware/aiSafety';
import { AiCostService } from './AiCostService';
import { AgentRouter, AgentCategory } from './AgentRouter';

// Combine all tools
const ALL_TOOLS = { ...CRM_TOOLS, ...EXPOSE_TOOLS };

// Prisma client injected from index.ts
let prisma: PrismaClient;
export function setOpenAIServicePrisma(client: PrismaClient) {
  prisma = client;
}

// Convert our tool definitions to OpenAI function format
function convertPropertyToOpenAI(value: any): any {
  const result: any = { type: value.type?.toLowerCase() || 'string', description: value.description };
  if (result.type === 'array' && value.items) {
    result.items = { type: value.items.type?.toLowerCase() || 'string' };
  }
  if (value.enum) {
    result.enum = value.enum;
  }
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

// Convert tools to Assistants API format
function convertToolsToAssistant(tools: Record<string, any>): OpenAI.Beta.AssistantTool[] {
  return Object.values(tools).map((tool: any) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object' as const,
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

// Models
const MODEL = 'gpt-5.2';
const MINI_MODEL = 'gpt-5-mini';

// System prompt for Jarvis
function getSystemPrompt(): string {
  const today = new Date();
  const currentDateStr = today.toLocaleDateString('de-DE', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });
  const isoDate = today.toISOString().split('T')[0];
  
  return `Du bist Jarvis, der KI-Assistent von Immivo — einer Plattform fuer Immobilienmakler. Heute ist ${currentDateStr} (${isoDate}).

PERSOENLICHKEIT:
Professionell, praegnant, mit trockenem Humor. Du bist kompetent und auf den Punkt — kein Roboter, kein uebertrieben freundlicher Chatbot. Du redest wie ein smarter Kollege, der weiss was er tut.

WICHTIGSTE REGEL — HANDLE SOFORT:
- Wenn der User eine Aufgabe gibt, fuehre sie SOFORT aus. Frag NICHT nach Details die du selbst erfinden kannst.
- "Leg 3 Test-Leads an" → Du erfindest sofort 3 plausible Namen, E-Mails und legst sie an. KEINE Rueckfrage.
- "Erstell ein Testobjekt" → Du erfindest Titel, Adresse, Preis und erstellst es. KEINE Rueckfrage.
- Nur wenn wirklich geschaeftskritische Info fehlt (z.B. echter Kundenname fuer eine echte E-Mail), frag kurz nach.
- Bei Test/Demo-Daten IMMER selbst erfinden: realistische DACH-Namen, echte Staedte, plausible Preise/Flaechen.
- Lieber einmal zu viel handeln als einmal zu viel fragen.

KOMMUNIKATION:
- Max 1-3 kurze Saetze. Deutsch, du-Form.
- Smalltalk = kurz und natuerlich. "Hey" → "Hey." Nicht mehr.
- Bei unklaren oder kurzen Nachrichten (Zahlen, einzelne Woerter, Witze): einfach natuerlich antworten wie ein Mensch. NICHT versuchen eine Aktion daraus abzuleiten. "1" → du zahlst mit oder fragst locker was los ist. KEINE Rueckfrage ob du Leads/Objekte erstellen sollst.
- Nur wenn eine Nachricht eindeutig eine Arbeitsanweisung ist, fuehre sie aus.
- Du erwaehnst die aktuelle Seite NUR wenn explizit gefragt oder relevant.
- NIEMALS ungefragt Optionslisten anbieten.
- NIEMALS sagen "Sag mir kurz..." oder "Gib mir noch..." wenn du die Daten selbst erfinden kannst.

STIL:
- Keine Floskeln ("Gerne!", "Super!", "Natuerlich!"), keine Emojis, keine Ausrufezeichen.
- Keine Semikolons — kurze Saetze, Kommas, Punkte, Gedankenstriche.
- NIEMALS technische Begriffe, IDs, UUIDs, API-Details, Fehlercodes.
- Bezieh dich auf Namen, Adressen, Titel — nicht auf interne Bezeichnungen.
- Erwaehne nie dein KI-Modell, deine Architektur oder wie du intern funktionierst.

FAEHIGKEITEN (nutze Tools still im Hintergrund):
- Leads/CRM: erstellen, abrufen, aktualisieren, loeschen, Status aendern
- Immobilien: erstellen, suchen, aktualisieren, loeschen
- Dateien: hochladen zu Objekten/Leads, Bilder verwalten
- E-Mails: lesen, Entwuerfe erstellen (bei Versand immer erst Entwurf zeigen), senden, antworten
- Kalender: Termine erstellen, anzeigen, aktualisieren, loeschen, Verfuegbarkeit pruefen
- Exposés: Vorlagen erstellen (sei kreativ, frag nicht), Exposés generieren, Bloecke bearbeiten
- Team-Chat: lesen, Nachrichten senden
- Statistiken: Dashboard, Lead-Conversion, Objekt-Stats
- Gedaechtnis: du erinnerst dich an vergangene Gespraeche (Thread-basiert)

SICHERHEIT: Nur eigene Tenant-Daten. Bei Loeschungen: kurze Bestaetigung. Leads immer mit vollstaendigem Namen.

ANTWORTFORMAT:
- Nur die finale Antwort. Keine internen Gedanken, keine Planungsschritte.
- Kein JSON, keine Tool-Namen, keine Parameter als Text.
- Nie "Ich werde jetzt..." oder "Die aktuelle Seite ist..." — das sieht der User nicht.
- Bei mehreren Aktionen: still arbeiten, am Ende eine kurze Zusammenfassung.`;
}

const EXPOSE_SYSTEM_PROMPT = `Du bist Jarvis, KI-Assistent von Immivo. Du hilfst bei Exposés.

Professionell, praegnant, trockener Humor. Aufgaben sofort erledigen — keine Rueckfragen wenn es offensichtlich ist. Keine Optionslisten, kein Kontext-Dump.

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

// ═══════════════════════════════════════════════════════════════
// Assistants API: Global Jarvis Assistant (created once, reused)
// ═══════════════════════════════════════════════════════════════

let _cachedAssistantId: string | null = null;

async function getOrCreateAssistant(client: OpenAI): Promise<string> {
  // Return cached
  if (_cachedAssistantId) return _cachedAssistantId;

  // Check env var (set after first creation)
  if (process.env.OPENAI_ASSISTANT_ID) {
    _cachedAssistantId = process.env.OPENAI_ASSISTANT_ID;
    return _cachedAssistantId;
  }

  // Try to find existing assistant by name
  try {
    const assistants = await client.beta.assistants.list({ limit: 20 });
    const existing = assistants.data.find(a => a.name === 'Jarvis Immivo');
    if (existing) {
      _cachedAssistantId = existing.id;
      console.log(`✅ Assistants API: Found existing Jarvis (${existing.id})`);
      
      // Update tools + instructions (in case they changed)
      await client.beta.assistants.update(existing.id, {
        instructions: getSystemPrompt(),
        tools: convertToolsToAssistant(CRM_TOOLS),
        model: MODEL,
      });
      
      return _cachedAssistantId;
    }
  } catch (err) {
    console.warn('Could not list assistants:', err);
  }

  // Create new assistant
  console.log('🔧 Creating Jarvis assistant via Assistants API...');
  const assistant = await client.beta.assistants.create({
    name: 'Jarvis Immivo',
    instructions: getSystemPrompt(),
    model: MODEL,
    tools: convertToolsToAssistant(CRM_TOOLS),
  });
  
  _cachedAssistantId = assistant.id;
  console.log(`✅ Assistants API: Created Jarvis (${assistant.id})`);
  return _cachedAssistantId;
}

async function getOrCreateThread(client: OpenAI, userId: string): Promise<string> {
  if (!prisma) throw new Error('Prisma not injected into OpenAIService');

  // Check if user has a thread
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { assistantThreadId: true }
  });

  if (user?.assistantThreadId) {
    return user.assistantThreadId;
  }

  // Create new thread
  const thread = await client.beta.threads.create();
  
  // Save thread ID
  await prisma.user.update({
    where: { id: userId },
    data: { assistantThreadId: thread.id }
  });

  console.log(`🧵 New thread created for user ${userId}: ${thread.id}`);
  return thread.id;
}


export class OpenAIService {
  private client: OpenAI;
  private uploadedFiles: string[] = [];
  private currentUserId?: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  // ═══════════════════════════════════════════════════════════
  // NEW: Assistants API streaming chat with Multi-Agent Router
  // ═══════════════════════════════════════════════════════════
  async *chatStream(
    message: string, 
    tenantId: string, 
    history: any[] = [],  // Ignored with Assistants API (thread has history)
    uploadedFiles: string[] = [], 
    userId?: string, 
    userContext?: { name: string; email: string; role: string; pageContext?: string; company?: { name: string; description?: string; phone?: string; email?: string; website?: string; address?: string; services?: string[]; regions?: string[]; slogan?: string } }
  ): AsyncGenerator<{ chunk: string; hadFunctionCalls?: boolean; toolsUsed?: string[] }> {
    this.uploadedFiles = uploadedFiles;
    this.currentUserId = userId;

    const streamStartTime = Date.now();
    const allToolNames: string[] = [];
    let hadAnyFunctionCalls = false;

    // If no userId or prisma not available, fall back to Chat Completions
    if (!userId || !prisma) {
      console.warn('⚠️ No userId or Prisma — falling back to Chat Completions API');
      yield* this.chatStreamLegacy(message, tenantId, history, uploadedFiles, userId, userContext);
      return;
    }

    // ── Step 1: Route with gpt-5-mini (fast, cheap ~100ms) ──
    const category = await AgentRouter.classify(message, tenantId);

    // ── Step 2: Smalltalk → gpt-5-mini directly (no thread, no tools) ──
    if (category === 'smalltalk' && uploadedFiles.length === 0) {
      yield* this.handleSmalltalk(message, tenantId, userId, userContext, history);
      return;
    }

    // ── Step 3: GPT-5 uses Chat Completions with routed tool subsets ──
    // (GPT-5 is a reasoning model — Assistants API doesn't support it)
    const hasFiles = uploadedFiles.length > 0;
    const filteredTools = AgentRouter.filterTools(category, hasFiles);
    const categoryHint = AgentRouter.getCategoryPromptHint(category);

    yield* this.chatStreamRouted(message, tenantId, history, uploadedFiles, userId, userContext, filteredTools, categoryHint);
  }

  // ═══════════════════════════════════════════════════════════
  // Routed Chat Completions (GPT-5 + filtered tool subset)
  // ═══════════════════════════════════════════════════════════
  private async *chatStreamRouted(
    message: string, tenantId: string, history: any[] = [],
    uploadedFiles: string[] = [], userId?: string,
    userContext?: { name: string; email: string; role: string; pageContext?: string; company?: { name: string; description?: string; phone?: string; email?: string; website?: string; address?: string; services?: string[]; regions?: string[]; slogan?: string } },
    filteredTools?: Record<string, any> | null,
    categoryHint?: string
  ): AsyncGenerator<{ chunk: string; hadFunctionCalls?: boolean; toolsUsed?: string[] }> {
    const streamStartTime = Date.now();
    this.uploadedFiles = uploadedFiles;
    this.currentUserId = userId;
    const validHistory = history.filter(h => h.content != null && h.content !== '');
    
    const contextParts: string[] = [];
    if (userContext) {
      contextParts.push(`\n\n[Interner Kontext — NICHT proaktiv erwaehnen, nur nutzen wenn relevant]`);
      contextParts.push(`Benutzer: ${userContext.name} (${userContext.email}, ${userContext.role})`);
      if (userContext.pageContext) contextParts.push(`Seite: ${userContext.pageContext}`);
      if (userContext.company) {
        const c = userContext.company;
        contextParts.push(`\nFirma: ${c.name}`);
        if (c.description) contextParts.push(`Beschreibung: ${c.description}`);
        if (c.slogan) contextParts.push(`Slogan: ${c.slogan}`);
        if (c.services && c.services.length > 0) contextParts.push(`Dienstleistungen: ${c.services.join(', ')}`);
        if (c.regions && c.regions.length > 0) contextParts.push(`Regionen: ${c.regions.join(', ')}`);
        if (c.phone) contextParts.push(`Tel: ${c.phone}`);
        if (c.email) contextParts.push(`E-Mail: ${c.email}`);
        if (c.website) contextParts.push(`Web: ${c.website}`);
        if (c.address) contextParts.push(`Adresse: ${c.address}`);
      }
    }
    const streamContextStr = contextParts.length > 0 ? contextParts.join('\n') : '';

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt() + streamContextStr + (categoryHint || '') },
      ...validHistory.map(h => ({
        role: (h.role === 'assistant' || h.role === 'ASSISTANT' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content || '',
      })),
      { role: 'user', content: message },
    ];

    // Use filtered tools (from router) or all CRM tools
    const toolsToUse = filteredTools || CRM_TOOLS;
    const openAITools = convertToolsToOpenAI(toolsToUse);
    
    const allToolNames: string[] = [];
    let hadAnyFunctionCalls = false;
    let currentMessages = [...messages];
    const MAX_TOOL_ROUNDS = 4;
    let totalStreamInputTokens = 0;
    let totalStreamOutputTokens = 0;

    console.log(`🧭 Routed chat: ${Object.keys(toolsToUse).length} tools (${Object.keys(CRM_TOOLS).length} total available)`);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = await this.client.chat.completions.create({
        model: MODEL,
        messages: currentMessages,
        tools: openAITools,
        tool_choice: 'auto',
        stream: true,
        stream_options: { include_usage: true },
      });

      let roundContent = '';
      const toolCallsInProgress: Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }> = new Map();
      const earlyToolNames: Set<string> = new Set();

      let isStreamingContent = false; // Track if we're getting content (not tools)

      for await (const chunk of stream) {
        if ((chunk as any).usage) {
          totalStreamInputTokens += (chunk as any).usage.prompt_tokens || 0;
          totalStreamOutputTokens += (chunk as any).usage.completion_tokens || 0;
        }
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Stream content chunks immediately (word-by-word to frontend)
        if (delta?.content) {
          roundContent += delta.content;
          if (!isStreamingContent) {
            isStreamingContent = true;
          }
          // Yield each content delta immediately for real-time streaming
          yield { chunk: delta.content, hadFunctionCalls: hadAnyFunctionCalls };
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCallsInProgress.has(tc.index)) {
                toolCallsInProgress.set(tc.index, { id: tc.id || '', type: 'function', function: { name: '', arguments: '' } });
              }
              const existing = toolCallsInProgress.get(tc.index)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) {
                existing.function.name += tc.function.name;
                // Yield tool name early — as soon as detected in stream
                if (existing.function.name && !earlyToolNames.has(existing.function.name)) {
                  earlyToolNames.add(existing.function.name);
                  allToolNames.push(existing.function.name);
                  yield { chunk: '', hadFunctionCalls: true, toolsUsed: [...allToolNames] };
                }
              }
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
          }
        }
      }

      const roundToolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];
      for (const [_, tc] of toolCallsInProgress) {
        if (tc.id && tc.function.name) roundToolCalls.push(tc as OpenAI.Chat.ChatCompletionMessageToolCall);
      }

      if (roundToolCalls.length > 0) {
        hadAnyFunctionCalls = true;
        // Tool names already yielded early — now execute
        const toolResults = await this.executeToolCalls(roundToolCalls, tenantId);
        currentMessages.push({ role: 'assistant', content: roundContent || null, tool_calls: roundToolCalls } as any);
        currentMessages.push(...toolResults);
      } else {
        // Content was already streamed word-by-word above — just break
        break;
      }
    }

    if (totalStreamInputTokens > 0 || totalStreamOutputTokens > 0) {
      AiCostService.logUsage({
        provider: 'openai', model: MODEL, endpoint: 'chat-stream-routed',
        inputTokens: totalStreamInputTokens, outputTokens: totalStreamOutputTokens,
        durationMs: Date.now() - streamStartTime, tenantId, userId,
      }).catch(() => {});
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Smalltalk: gpt-5-mini, no tools, fast + cheap
  // ═══════════════════════════════════════════════════════════
  private async *handleSmalltalk(
    message: string, tenantId: string, userId: string,
    userContext?: { name: string; email: string; role: string; pageContext?: string; company?: { name: string; description?: string; phone?: string; email?: string; website?: string; address?: string; services?: string[]; regions?: string[]; slogan?: string } },
    history: any[] = []
  ): AsyncGenerator<{ chunk: string; hadFunctionCalls?: boolean; toolsUsed?: string[] }> {
    const startTime = Date.now();
    const ctxParts: string[] = [];
    if (userContext) {
      ctxParts.push(`\n\n[Kontext: ${userContext.name}]`);
      if (userContext.company) {
        ctxParts.push(`[Firma: ${userContext.company.name}${userContext.company.slogan ? ` — ${userContext.company.slogan}` : ''}]`);
      }
    }
    const contextStr = ctxParts.join('\n');

    // Include recent chat history for context (last 10 messages for smalltalk)
    const recentHistory = history.slice(-10).filter(h => h.content && h.content.trim());

    const stream = await this.client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: getSystemPrompt() + contextStr },
        ...recentHistory.map((h: any) => ({
          role: (h.role === 'assistant' || h.role === 'ASSISTANT' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: h.content || '',
        })),
        { role: 'user', content: message },
      ],
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: 1024,
    });

    let totalIn = 0, totalOut = 0;
    let fullContent = '';
    for await (const chunk of stream) {
      if ((chunk as any).usage) {
        totalIn += (chunk as any).usage.prompt_tokens || 0;
        totalOut += (chunk as any).usage.completion_tokens || 0;
      }
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        yield { chunk: content };
      }
    }

    console.log(`💬 Smalltalk response (${Date.now() - startTime}ms, ${totalIn}→${totalOut} tokens): "${fullContent.substring(0, 100)}${fullContent.length > 100 ? '...' : ''}"`);

    if (totalIn > 0 || totalOut > 0) {
      AiCostService.logUsage({
        provider: 'openai', model: 'gpt-5-mini', endpoint: 'smalltalk',
        inputTokens: totalIn, outputTokens: totalOut,
        durationMs: Date.now() - startTime, tenantId, userId,
      }).catch(() => {});
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Legacy Chat Completions (fallback)
  // ═══════════════════════════════════════════════════════════
  private async *chatStreamLegacy(
    message: string, 
    tenantId: string, 
    history: any[] = [], 
    uploadedFiles: string[] = [], 
    userId?: string, 
    userContext?: { name: string; email: string; role: string; pageContext?: string }
  ): AsyncGenerator<{ chunk: string; hadFunctionCalls?: boolean; toolsUsed?: string[] }> {
    const streamStartTime = Date.now();
    this.uploadedFiles = uploadedFiles;
    this.currentUserId = userId;
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
    const MAX_TOOL_ROUNDS = 4;
    const openAITools = convertToolsToOpenAI(CRM_TOOLS);
    let totalStreamInputTokens = 0;
    let totalStreamOutputTokens = 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = await this.client.chat.completions.create({
        model: MODEL,
        messages: currentMessages,
        tools: openAITools,
        tool_choice: 'auto',
        stream: true,
        stream_options: { include_usage: true },
      });

      let roundContent = '';
      const toolCallsInProgress: Map<number, { id: string; type: 'function'; function: { name: string; arguments: string } }> = new Map();

      for await (const chunk of stream) {
        if ((chunk as any).usage) {
          totalStreamInputTokens += (chunk as any).usage.prompt_tokens || 0;
          totalStreamOutputTokens += (chunk as any).usage.completion_tokens || 0;
        }

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;
        
        if (delta?.content) {
          roundContent += delta.content;
          // Yield each content delta immediately for real-time streaming
          yield { chunk: delta.content, hadFunctionCalls: hadAnyFunctionCalls };
        }
        
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCallsInProgress.has(tc.index)) {
                toolCallsInProgress.set(tc.index, { id: tc.id || '', type: 'function', function: { name: '', arguments: '' } });
              }
              const existing = toolCallsInProgress.get(tc.index)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.function.name += tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
          }
        }
      }

      const roundToolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];
      for (const [_, tc] of toolCallsInProgress) {
        if (tc.id && tc.function.name) {
          roundToolCalls.push(tc as OpenAI.Chat.ChatCompletionMessageToolCall);
        }
      }

      if (roundToolCalls.length > 0) {
        hadAnyFunctionCalls = true;
        const toolNames = roundToolCalls.map(tc => (tc as any).function.name as string);
        allToolNames.push(...toolNames);
        
        // Yield tool names info (content was already streamed above)
        yield { chunk: '', hadFunctionCalls: true, toolsUsed: allToolNames };

        const toolResults = await this.executeToolCalls(roundToolCalls, tenantId);
        currentMessages.push({ role: 'assistant', content: roundContent || null, tool_calls: roundToolCalls } as any);
        currentMessages.push(...toolResults);
      } else {
        // Content was already streamed word-by-word above — just break
        break;
      }
    }

    if (totalStreamInputTokens > 0 || totalStreamOutputTokens > 0) {
      AiCostService.logUsage({
        provider: 'openai', model: MODEL, endpoint: 'chat-stream',
        inputTokens: totalStreamInputTokens, outputTokens: totalStreamOutputTokens,
        durationMs: Date.now() - streamStartTime, tenantId, userId,
      }).catch(() => {});
    }
  }

  // Non-streaming chat (legacy, used rarely)
  async chat(message: string, tenantId: string, history: any[] = [], userContext?: { name: string; email: string; role: string; pageContext?: string }) {
    const startTime = Date.now();
    const validHistory = history.filter(h => h.content != null && h.content !== '');
    
    const contextParts: string[] = [];
    if (userContext) {
      contextParts.push(`\n\n[Interner Kontext]`);
      contextParts.push(`Benutzer: ${userContext.name} (${userContext.email}, ${userContext.role})`);
      if (userContext.pageContext) contextParts.push(`Seite: ${userContext.pageContext}`);
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

    const response = await this.client.chat.completions.create({ model: MODEL, messages, tools: convertToolsToOpenAI(CRM_TOOLS), tool_choice: 'auto' });

    if (response.usage) {
      AiCostService.logUsage({ provider: 'openai', model: MODEL, endpoint: 'chat', inputTokens: response.usage.prompt_tokens || 0, outputTokens: response.usage.completion_tokens || 0, durationMs: Date.now() - startTime, tenantId }).catch(() => {});
    }

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolResults = await this.executeToolCalls(responseMessage.tool_calls, tenantId);
      const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [...messages, responseMessage, ...toolResults];
      const finalResponse = await this.client.chat.completions.create({ model: MODEL, messages: followUpMessages });
      if (finalResponse.usage) {
        AiCostService.logUsage({ provider: 'openai', model: MODEL, endpoint: 'chat', inputTokens: finalResponse.usage.prompt_tokens || 0, outputTokens: finalResponse.usage.completion_tokens || 0, durationMs: Date.now() - startTime, tenantId }).catch(() => {});
      }
      return finalResponse.choices[0].message.content || '';
    }

    return responseMessage.content || '';
  }

  // Expose chat (still uses Chat Completions — different assistant with different tools)
  async exposeChat(
    message: string, tenantId: string, exposeId: string | null, 
    templateId: string | null = null, currentBlocks: any[] = [],
    history: any[] = [], pageContext?: string
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
      : isTemplate ? '\n\nAKTUELLE SEITE: Exposé-Vorlagen-Editor' : '\n\nAKTUELLE SEITE: Exposé-Editor';

    const systemContext = isTemplate 
      ? `Du arbeitest gerade an einer EXPOSÉ-VORLAGE (templateId=${targetId}).\n${blocksDescription}${pageInfo}\n\nWICHTIG: Nutze IMMER templateId="${targetId}" bei allen Tool-Aufrufen, NICHT exposeId!`
      : `Du arbeitest gerade an einem EXPOSÉ für eine echte Immobilie (exposeId=${targetId}).\n${blocksDescription}${pageInfo}\n\nWICHTIG: Nutze IMMER exposeId="${targetId}" bei allen Tool-Aufrufen!`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: EXPOSE_SYSTEM_PROMPT + '\n\n' + systemContext },
      ...history.filter(h => h.content && h.content.trim() && h.role !== 'SYSTEM').map(h => ({
        role: (h.role === 'assistant' || h.role === 'ASSISTANT' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content.trim(),
      })),
      { role: 'user', content: message },
    ];

    let iterations = 0;
    const maxIterations = 5;
    const actionsPerformed: string[] = [];
    let currentMessages = [...messages];
    const exposeStartTime = Date.now();

    while (iterations < maxIterations) {
      const response = await this.client.chat.completions.create({ model: MODEL, messages: currentMessages, tools: convertToolsToOpenAI(ALL_TOOLS), tool_choice: 'auto' });
      if (response.usage) {
        AiCostService.logUsage({ provider: 'openai', model: MODEL, endpoint: 'expose', inputTokens: response.usage.prompt_tokens || 0, outputTokens: response.usage.completion_tokens || 0, durationMs: Date.now() - exposeStartTime, tenantId }).catch(() => {});
      }
      const responseMessage = response.choices[0].message;
      if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
        return { text: responseMessage.content || '', actionsPerformed };
      }
      for (const call of responseMessage.tool_calls) {
        if (call.type === 'function') actionsPerformed.push(call.function.name);
      }
      const toolResults = await this.executeToolCalls(responseMessage.tool_calls, tenantId);
      currentMessages = [...currentMessages, responseMessage, ...toolResults];
      iterations++;
    }

    return { text: 'Maximale Iterationen erreicht.', actionsPerformed };
  }

  async generatePropertyText(propertyId: string, textType: string, tenantId: string, options: { tone?: string; maxLength?: number } = {}) {
    return AiToolExecutor.execute('generate_expose_text', { propertyId, textType, tone: options.tone || 'professional', maxLength: options.maxLength || 500 }, tenantId);
  }

  // Reset user's thread (for "Neu starten" / new conversation)
  async resetThread(userId: string): Promise<void> {
    if (!prisma) return;
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { assistantThreadId: true } });
      if (user?.assistantThreadId) {
        // Delete thread at OpenAI
        try { await this.client.beta.threads.delete(user.assistantThreadId); } catch {}
      }
      // Clear from DB — new thread will be created on next message
      await prisma.user.update({ where: { id: userId }, data: { assistantThreadId: null } });
      console.log(`🗑️ Thread reset for user ${userId}`);
    } catch (err) {
      console.error('Thread reset error:', err);
    }
  }

  private async executeToolCalls(
    toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[], 
    tenantId: string
  ): Promise<OpenAI.Chat.ChatCompletionToolMessageParam[]> {
    const functionCalls = toolCalls.filter(call => call.type === 'function');
    
    const resultPromises = functionCalls.map(async (call): Promise<OpenAI.Chat.ChatCompletionToolMessageParam> => {
      try {
        console.log(`🔧 Tool: ${call.function.name} (tenant: ${tenantId})`);
        
        const toolCheck = AiSafetyMiddleware.checkToolLimit(call.function.name, this.currentUserId || tenantId);
        if (!toolCheck.allowed) {
          return { role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: toolCheck.reason }) };
        }

        const args = JSON.parse(call.function.arguments);
        
        if ((call.function.name === 'upload_images_to_property' || call.function.name === 'upload_documents_to_lead' || call.function.name === 'virtual_staging') && this.uploadedFiles.length > 0) {
          args._uploadedFiles = this.uploadedFiles;
        }
        
        const output = await AiToolExecutor.execute(call.function.name, args, tenantId, this.currentUserId);
        return { role: 'tool', tool_call_id: call.id, content: typeof output === 'string' ? output : JSON.stringify(output) };
      } catch (error: any) {
        console.error(`Tool ${call.function.name} error:`, error);
        return { role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: error.message }) };
      }
    });

    return Promise.all(resultPromises);
  }

  // ═══════════════════════════════════════════════════════════
  // Auto-Reply: AI-generierte personalisierte Lead-Antwort
  // ═══════════════════════════════════════════════════════════

  async generateAutoReply(params: {
    leadName: string;
    leadEmail: string;
    leadMessage?: string;
    leadSource?: string;
    propertyTitle?: string;
    propertyAddress?: string;
    propertyPrice?: number;
    propertyRooms?: number;
    propertyArea?: number;
    agentName: string;
    companyName?: string;
    tenantId?: string;
  }): Promise<{ subject: string; body: string }> {
    const startTime = Date.now();

    const propertyInfo = params.propertyTitle
      ? `Objekt: "${params.propertyTitle}"${params.propertyAddress ? ` in ${params.propertyAddress}` : ''}${params.propertyPrice ? `, ${params.propertyPrice.toLocaleString('de-DE')}€` : ''}${params.propertyRooms ? `, ${params.propertyRooms} Zimmer` : ''}${params.propertyArea ? `, ${params.propertyArea}m²` : ''}`
      : 'Kein spezifisches Objekt zugeordnet';

    const systemPrompt = `Du bist ein Assistent, der für den Immobilienmakler "${params.agentName}"${params.companyName ? ` (${params.companyName})` : ''} eine professionelle Antwort-E-Mail auf Deutsch verfasst.

REGELN:
- Schreibe eine kurze, freundliche, professionelle E-Mail (3-5 Sätze)
- Sprich den Lead mit Namen an (${params.leadName})
- Bedanke dich für das Interesse
- Erwähne das Objekt kurz, falls vorhanden
- Biete an, für Fragen oder eine Besichtigung zur Verfügung zu stehen
- Unterzeichne NICHT — die Signatur wird automatisch angehängt
- Kein Betreff — nur den E-Mail-Body
- Schreibe natürlich und menschlich, nicht wie ein Bot
- Verwende "Sie" als Anrede`;

    const userPrompt = `Schreibe eine Antwort-E-Mail an ${params.leadName} (${params.leadEmail}).
${params.leadMessage ? `Die Anfrage des Leads: "${params.leadMessage}"` : `Der Lead hat über ${params.leadSource || 'eine Plattform'} Interesse gezeigt.`}
${propertyInfo}
Makler: ${params.agentName}`;

    try {
      const response = await this.client.chat.completions.create({
        model: MINI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 512,
        temperature: 0.7,
      });

      const body = response.choices[0]?.message?.content?.trim() || '';

      // Generate subject
      const subjectResponse = await this.client.chat.completions.create({
        model: MINI_MODEL,
        messages: [
          { role: 'system', content: 'Generiere einen kurzen, professionellen E-Mail-Betreff auf Deutsch für die folgende Makler-Antwort. Nur den Betreff, nichts anderes. Maximal 8 Wörter.' },
          { role: 'user', content: body },
        ],
        max_completion_tokens: 64,
        temperature: 0.5,
      });

      const subject = subjectResponse.choices[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, '') || (params.propertyTitle ? `Ihre Anfrage zu ${params.propertyTitle}` : 'Ihre Immobilienanfrage');

      // Log usage
      const totalInput = (response.usage?.prompt_tokens || 0) + (subjectResponse.usage?.prompt_tokens || 0);
      const totalOutput = (response.usage?.completion_tokens || 0) + (subjectResponse.usage?.completion_tokens || 0);
      AiCostService.logUsage({
        provider: 'openai',
        model: MINI_MODEL,
        endpoint: 'auto-reply',
        inputTokens: totalInput,
        outputTokens: totalOutput,
        durationMs: Date.now() - startTime,
        tenantId: params.tenantId,
      }).catch(() => {});

      return { subject, body };
    } catch (error: any) {
      console.error('generateAutoReply error:', error.message);
      // Fallback: simple template
      const fallbackBody = `Sehr geehrte/r ${params.leadName},\n\nvielen Dank für Ihr Interesse${params.propertyTitle ? ` an "${params.propertyTitle}"` : ''}. Ich melde mich in Kürze bei Ihnen.\n\nMit freundlichen Grüßen`;
      const fallbackSubject = params.propertyTitle ? `Ihre Anfrage zu ${params.propertyTitle}` : 'Ihre Immobilienanfrage';
      return { subject: fallbackSubject, body: fallbackBody };
    }
  }
}
