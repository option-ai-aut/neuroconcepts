/**
 * SentimentService — Analyzes sentiment of email responses and lead interactions.
 * Uses gpt-5-mini for cost-efficient sentiment classification.
 */

import OpenAI from 'openai';
import { AiCostService } from './AiCostService';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  return _openai;
}

export type SentimentLevel =
  | 'very_positive'
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'very_negative';
export type UrgencyLevel = 'high' | 'medium' | 'low';

export interface SentimentResult {
  sentiment: SentimentLevel;
  sentimentScore: number; // -1.0 to +1.0
  urgency: UrgencyLevel;
  emotionalTone: string; // e.g. "freundlich", "ungeduldig", "enthusiastisch"
  keyPhrases: string[]; // Important phrases detected
  buyingSignals: string[]; // Positive buying indicators
  riskSignals: string[]; // Risk indicators (might lose the lead)
}

const SENTIMENT_PROMPT = `Du bist ein Sentiment-Analyse-Experte für Immobilien-Kommunikation. Analysiere die folgende Nachricht eines Interessenten.

Antworte NUR mit validem JSON:
{
  "sentiment": "very_positive" | "positive" | "neutral" | "negative" | "very_negative",
  "sentimentScore": -1.0 bis +1.0,
  "urgency": "high" | "medium" | "low",
  "emotionalTone": "Ein Wort das den Ton beschreibt (z.B. freundlich, ungeduldig, enthusiastisch, skeptisch, neutral)",
  "keyPhrases": ["Wichtige Phrasen aus der Nachricht"],
  "buyingSignals": ["Positive Kaufsignale, z.B. 'möchte besichtigen', 'sehr interessiert', 'wann kann ich einziehen'"],
  "riskSignals": ["Risiko-Signale, z.B. 'zu teuer', 'schaue noch andere an', 'muss überlegen'"]
}

Achte besonders auf:
- Dringlichkeit (sucht sofort vs. schaut nur)
- Kaufbereitschaft (Finanzierung, Besichtigung, konkrete Fragen)
- Absprung-Risiko (Preisbeschwerden, Vergleiche, Zögern)`;

export class SentimentService {
  /**
   * Analyze sentiment of a text (email body, chat message, etc.)
   */
  static async analyze(text: string): Promise<SentimentResult> {
    if (!text || text.trim().length < 10) {
      return {
        sentiment: 'neutral',
        sentimentScore: 0,
        urgency: 'low',
        emotionalTone: 'neutral',
        keyPhrases: [],
        buyingSignals: [],
        riskSignals: [],
      };
    }

    try {
      const model = 'gpt-5-mini'; // Cheap + fast for sentiment
      const start = Date.now();

      const response = await getOpenAI().chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SENTIMENT_PROMPT },
          { role: 'user', content: text.substring(0, 2000) }, // Limit input
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 300,
      });

      if (response.usage) {
        AiCostService.logUsage({
          provider: 'openai',
          model,
          endpoint: 'sentiment',
          inputTokens: response.usage.prompt_tokens || 0,
          outputTokens: response.usage.completion_tokens || 0,
          durationMs: Date.now() - start,
        }).catch(() => {});
      }

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        sentiment: result.sentiment || 'neutral',
        sentimentScore: typeof result.sentimentScore === 'number' ? result.sentimentScore : 0,
        urgency: result.urgency || 'low',
        emotionalTone: result.emotionalTone || 'neutral',
        keyPhrases: Array.isArray(result.keyPhrases) ? result.keyPhrases : [],
        buyingSignals: Array.isArray(result.buyingSignals) ? result.buyingSignals : [],
        riskSignals: Array.isArray(result.riskSignals) ? result.riskSignals : [],
      };
    } catch (error: any) {
      console.error('Sentiment analysis error:', error.message);
      return {
        sentiment: 'neutral',
        sentimentScore: 0,
        urgency: 'low',
        emotionalTone: 'unbekannt',
        keyPhrases: [],
        buyingSignals: [],
        riskSignals: [],
      };
    }
  }

  /**
   * Quick sentiment check (returns just the score, cheaper)
   */
  static quickScore(text: string): number {
    if (!text) return 0;
    const lower = text.toLowerCase();

    const positiveWords = [
      'interessiert',
      'besichtigung',
      'gefällt',
      'super',
      'toll',
      'perfekt',
      'sofort',
      'dringend',
      'begeistert',
      'ideal',
      'traumwohnung',
      'zusage',
      'einziehen',
      'kaufen',
      'mieten',
      'finanzierung gesichert',
    ];
    const negativeWords = [
      'zu teuer',
      'leider',
      'absage',
      'kein interesse',
      'nicht mehr',
      'anderes gefunden',
      'überlegen',
      'zu klein',
      'zu groß',
      'schlecht',
      'enttäuscht',
      'problem',
    ];

    let score = 0;
    for (const w of positiveWords) if (lower.includes(w)) score += 0.15;
    for (const w of negativeWords) if (lower.includes(w)) score -= 0.15;

    return Math.max(-1, Math.min(1, score));
  }
}

export default SentimentService;
