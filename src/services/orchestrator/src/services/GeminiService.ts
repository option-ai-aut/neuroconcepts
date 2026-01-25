import { GoogleGenerativeAI, FunctionDeclaration } from '@google/generative-ai';
import { CRM_TOOLS, AiToolExecutor } from './AiTools';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export class GeminiService {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", 
      tools: [{ functionDeclarations: Object.values(CRM_TOOLS) as unknown as FunctionDeclaration[] }]
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
      // Execute tools
      const toolOutputs = [];
      for (const call of functionCalls) {
        try {
          const output = await AiToolExecutor.execute(call.name, call.args, tenantId);
          toolOutputs.push({
            functionResponse: {
              name: call.name,
              response: { output: output }
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

      // Send tool outputs back to model
      const finalResult = await chat.sendMessage(toolOutputs);
      return finalResult.response.text();
    }

    return response.text();
  }
}
