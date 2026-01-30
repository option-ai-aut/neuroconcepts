import { GoogleGenerativeAI, FunctionDeclaration } from '@google/generative-ai';
import { CRM_TOOLS, EXPOSE_TOOLS, AiToolExecutor } from './AiTools';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Combine all tools
const ALL_TOOLS = { ...CRM_TOOLS, ...EXPOSE_TOOLS };

export class GeminiService {
  private model;
  private exposeModel;

  constructor() {
    // General chat model with CRM tools
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", 
      tools: [{ functionDeclarations: Object.values(CRM_TOOLS) as unknown as FunctionDeclaration[] }]
    });

    // Exposé-specific model with all tools
    this.exposeModel = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", 
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

  // Exposé-specific chat with full tool access
  async exposeChat(message: string, tenantId: string, exposeId: string, history: any[] = []): Promise<{ text: string; actionsPerformed: string[] }> {
    const systemContext = `Aktueller Exposé-Kontext: exposeId=${exposeId}. 
Der Nutzer arbeitet gerade an diesem Exposé.`;

    const chat = this.exposeModel.startChat({
      history: [
        { role: 'user', parts: [{ text: systemContext }] },
        { role: 'model', parts: [{ text: 'Verstanden, ich helfe dir mit diesem Exposé.' }] },
        ...history.map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        }))
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
