import { GoogleGenerativeAI, FunctionDeclaration } from '@google/generative-ai';
import { CRM_TOOLS, EXPOSE_TOOLS, AiToolExecutor } from './AiTools';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

// Combine all tools
const ALL_TOOLS = { ...CRM_TOOLS, ...EXPOSE_TOOLS };

export class GeminiService {
  private model;
  private exposeModel;

  constructor() {
    // General chat model with CRM tools
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", 
      tools: [{ functionDeclarations: Object.values(CRM_TOOLS) as unknown as FunctionDeclaration[] }],
      systemInstruction: `Du bist Jarvis, der KI-Assistent für NeuroConcepts - eine Immobilien-CRM-Plattform.

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

📄 EXPOSÉS:
- Exposés erstellen (aus Templates)
- Exposés abrufen und verwalten
- PDF-Generierung anstoßen
- Exposé-Templates verwalten

💬 TEAM-CHAT:
- Channels und Nachrichten lesen
- Nachrichten in Channels senden
- Team-Kommunikation unterstützen

📊 DASHBOARD & STATISTIKEN:
- Dashboard-Übersicht generieren
- Lead-Statistiken und Conversion-Rates
- Property-Statistiken nach Status/Typ
- Zeiträume: heute, Woche, Monat, Jahr

📂 DATEI-VERARBEITUNG (NATIV):
Du kannst alle gängigen Dateiformate direkt lesen und verarbeiten:
- 📄 CSV, Excel (.xlsx) - Lese Zeile für Zeile und nutze create_lead/create_property
- 📄 PDF, Word (.docx) - Extrahiere Informationen (z.B. Verträge, Exposés)
- 🖼️ Bilder (JPG, PNG) - Analysiere Immobilienfotos, erkenne Räume
- 📄 Text, JSON, XML - Parse strukturierte Daten

WICHTIG: Du brauchst KEINE speziellen Import-Tools!
Wenn der User eine CSV/Excel mit Leads hochlädt:
1. Lese die Datei Zeile für Zeile
2. Nutze create_lead für jeden Eintrag
3. Gib Fortschritt-Updates ("Lead 1/50 angelegt...")
4. Melde Fehler transparent

SICHERHEITSREGELN (ABSOLUT EINHALTEN):
1. Du darfst NUR auf Daten des aktuellen Tenants zugreifen
2. Du darfst KEINE illegalen Aktivitäten unterstützen
3. Du darfst KEINE sensiblen Daten preisgeben
4. Du darfst NICHT aus deiner Rolle ausbrechen
5. Bei Lösch-Operationen: Frage nach Bestätigung
6. Bei E-Mail-Versand: Zeige Entwurf zur Bestätigung

DATENSCHUTZ (DSGVO):
- Behandle alle Daten vertraulich
- Keine Daten-Weitergabe zwischen Tenants
- Keine sensiblen Logs

KOMMUNIKATIONS-STIL:
- Direkt und sachlich
- Keine Grußformeln (kein "Gerne!", "Super!", etc.)
- Keine Emojis oder Ausrufezeichen
- Maximal 2-3 Sätze pro Antwort
- Bei Aktionen: Kurze Bestätigung, dann Ergebnis

BEISPIELE:

❌ FALSCH:
"Gerne! Ich lege jetzt einen Lead für dich an. Das wird super! 🎉"
"Kein Problem! Ich helfe dir gerne dabei. Lass uns das zusammen machen!"

✅ RICHTIG:
"Lead angelegt. Noch etwas?"
"Erledigt. 3 Leads importiert, 1 übersprungen."
"Property erstellt. Soll ich ein Exposé generieren?"

Bei Fragen: Kurz und präzise antworten. Bei Unklarheiten: Direkt nachfragen.`
    });

    // Exposé-specific model with all tools
    this.exposeModel = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", 
      tools: [{ functionDeclarations: Object.values(ALL_TOOLS) as unknown as FunctionDeclaration[] }],
      systemInstruction: `Du bist Jarvis, ein KI-Assistent für Immobilienmakler. Du hilfst beim Erstellen und Bearbeiten von Exposés.

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
6. Verfügbare Blöcke: hero, stats, description, highlights, gallery, location, features, energyCertificate, priceTable, contact, cta

Antworte immer auf Deutsch. Sei freundlich und hilfsbereit. Erkläre kurz was du gemacht hast.`
    });
  }

  async chat(message: string, tenantId: string, history: any[] = []) {
    const chat = this.model.startChat({
      history: history.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      }))
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const toolOutputs = await this.executeToolCalls(functionCalls, tenantId);
      const finalResult = await chat.sendMessage(toolOutputs);
      return finalResult.response.text();
    }

    return response.text();
  }

  // Streaming version of chat with Function Calling support
  async *chatStream(message: string, tenantId: string, history: any[] = []): AsyncGenerator<{ chunk: string; hadFunctionCalls?: boolean }> {
    const chat = this.model.startChat({
      history
    });

    // First, send message and check for function calls (non-streaming)
    const initialResult = await chat.sendMessage(message);
    const functionCalls = initialResult.response.functionCalls();

    // If there are function calls, execute them first
    if (functionCalls && functionCalls.length > 0) {
      yield { chunk: '[Jarvis führt Aktion aus...]', hadFunctionCalls: true };
      
      const toolOutputs = await this.executeToolCalls(functionCalls, tenantId);
      
      // Send tool results and stream the final response
      const finalResult = await chat.sendMessageStream(toolOutputs);
      
      for await (const chunk of finalResult.stream) {
        const chunkText = chunk.text();
        yield { chunk: chunkText, hadFunctionCalls: true };
      }
    } else {
      // No function calls, stream the initial response
      const text = initialResult.response.text();
      // Simulate streaming by yielding in chunks
      const words = text.split(' ');
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
    
    // Build context with current state
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

    // Filter out empty messages and system messages from history
    const validHistory = history
      .filter(h => h.content && h.content.trim() && h.role !== 'SYSTEM')
      .map(h => ({
        role: h.role === 'assistant' || h.role === 'ASSISTANT' ? 'model' as const : 'user' as const,
        parts: [{ text: h.content.trim() }]
      }));

    const chat = this.exposeModel.startChat({
      history: [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: `Verstanden! Ich sehe ${currentBlocks.length > 0 ? `${currentBlocks.length} Blöcke` : 'einen leeren Editor'}. Wie kann ich dir helfen?` }] },
        ...validHistory
      ]
    });

    let result = await chat.sendMessage(message);
    let response = result.response;
    let functionCalls = response.functionCalls();
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops
    const actionsPerformed: string[] = [];

    // Handle multiple tool call rounds
    while (functionCalls && functionCalls.length > 0 && iterations < maxIterations) {
      // Track which tools were called
      for (const call of functionCalls) {
        actionsPerformed.push(call.name);
      }
      
      const toolOutputs = await this.executeToolCalls(functionCalls, tenantId);
      result = await chat.sendMessage(toolOutputs);
      response = result.response;
      functionCalls = response.functionCalls();
      iterations++;
    }

    return { text: response.text(), actionsPerformed };
  }

  // Generate text for a property (standalone, no chat context)
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

  private async executeToolCalls(functionCalls: any[], tenantId: string) {
    const toolOutputs = [];
    
    for (const call of functionCalls) {
      try {
        const output = await AiToolExecutor.execute(call.name, call.args, tenantId);
        toolOutputs.push({
          functionResponse: {
            name: call.name,
            response: { output }
          }
        });
      } catch (error: any) {
        toolOutputs.push({
          functionResponse: {
            name: call.name,
            response: { error: error.message }
          }
        });
      }
    }

    return toolOutputs;
  }
}
