import { PrismaClient, LeadTimeFrame, FinancingStatus, LeadSource, LeadStatus } from '@prisma/client';

let prisma: PrismaClient;
export function setLeadScoringPrisma(client: PrismaClient) { prisma = client; }

/**
 * Lead Scoring Engine
 * 
 * Calculates a 0-100 score for each lead based on:
 * - Time frame (urgency)
 * - Financing status (qualification)
 * - Budget (ability to buy)
 * - Source quality (conversion rates)
 * - Engagement (messages, activities)
 * - Completeness (how much info we have)
 * 
 * Score breakdown is stored as JSON for transparency.
 */

interface ScoreFactor {
  name: string;
  score: number;
  maxScore: number;
  reason: string;
}

interface ScoringResult {
  totalScore: number;
  factors: ScoreFactor[];
  tier: 'HOT' | 'WARM' | 'COLD' | 'UNQUALIFIED';
}

export class LeadScoringService {

  /**
   * Calculate lead score for a single lead
   */
  static async scoreLead(leadId: string): Promise<ScoringResult> {
    if (!prisma) throw new Error('Prisma not injected');

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        messages: { select: { id: true, role: true } },
        activities: { select: { id: true, type: true } },
        property: { select: { id: true, price: true } },
      }
    });

    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const factors: ScoreFactor[] = [];

    // ── Factor 1: Time Frame (max 25 points) ──
    const timeFrameScore = this.scoreTimeFrame(lead.timeFrame);
    factors.push(timeFrameScore);

    // ── Factor 2: Financing Status (max 25 points) ──
    const financingScore = this.scoreFinancing(lead.financingStatus, lead.hasDownPayment);
    factors.push(financingScore);

    // ── Factor 3: Budget Match (max 15 points) ──
    const budgetScore = this.scoreBudget(lead.budgetMin, lead.budgetMax, lead.property?.price);
    factors.push(budgetScore);

    // ── Factor 4: Source Quality (max 15 points) ──
    const sourceScore = this.scoreSource(lead.source);
    factors.push(sourceScore);

    // ── Factor 5: Engagement (max 10 points) ──
    const engagementScore = this.scoreEngagement(
      lead.messages?.length || 0,
      lead.activities?.length || 0
    );
    factors.push(engagementScore);

    // ── Factor 6: Completeness (max 10 points) ──
    const completenessScore = this.scoreCompleteness(lead);
    factors.push(completenessScore);

    const totalScore = Math.min(100, factors.reduce((sum, f) => sum + f.score, 0));
    
    const tier = totalScore >= 75 ? 'HOT' 
               : totalScore >= 50 ? 'WARM' 
               : totalScore >= 25 ? 'COLD' 
               : 'UNQUALIFIED';

    return { totalScore, factors, tier };
  }

  /**
   * Score and persist for a lead
   */
  static async scoreAndSave(leadId: string): Promise<ScoringResult> {
    const result = await this.scoreLead(leadId);

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        score: result.totalScore,
        scoreFactors: result.factors as any,
      }
    });

    return result;
  }

  /**
   * Rescore all leads for a tenant
   */
  static async rescoreAll(tenantId: string): Promise<number> {
    const leads = await prisma.lead.findMany({
      where: { tenantId, status: { not: LeadStatus.LOST } },
      select: { id: true }
    });

    let count = 0;
    for (const lead of leads) {
      try {
        await this.scoreAndSave(lead.id);
        count++;
      } catch (err) {
        console.error(`Score failed for lead ${lead.id}:`, err);
      }
    }

    console.log(`📊 Rescored ${count}/${leads.length} leads for tenant ${tenantId}`);
    return count;
  }

  // ═══════════════════════════════════════════════════════════
  // Scoring Factors
  // ═══════════════════════════════════════════════════════════

  private static scoreTimeFrame(timeFrame: LeadTimeFrame | null): ScoreFactor {
    const MAX = 25;
    if (!timeFrame) return { name: 'Zeitrahmen', score: 5, maxScore: MAX, reason: 'Nicht angegeben' };

    const scores: Record<LeadTimeFrame, { score: number; reason: string }> = {
      IMMEDIATE: { score: 25, reason: 'Sofort — höchste Dringlichkeit' },
      THREE_MONTHS: { score: 20, reason: '1-3 Monate — aktiv suchend' },
      SIX_MONTHS: { score: 15, reason: '3-6 Monate — mittelfristig' },
      TWELVE_MONTHS: { score: 10, reason: '6-12 Monate — planend' },
      LONGTERM: { score: 5, reason: '>12 Monate — noch nicht dringend' },
    };

    const entry = scores[timeFrame] || { score: 5, reason: 'Unbekannt' };
    return { name: 'Zeitrahmen', score: entry.score, maxScore: MAX, reason: entry.reason };
  }

  private static scoreFinancing(status: FinancingStatus, hasDownPayment: boolean): ScoreFactor {
    const MAX = 25;
    
    const baseScores: Record<FinancingStatus, number> = {
      NOT_CLARIFIED: 5,
      PRE_QUALIFIED: 15,
      APPROVED: 25,
      CASH_BUYER: 25,
    };

    let score = baseScores[status] || 5;
    let reason = `Finanzierung: ${status}`;

    if (hasDownPayment && score < MAX) {
      score = Math.min(MAX, score + 5);
      reason += ' + Eigenkapital vorhanden';
    }

    return { name: 'Finanzierung', score, maxScore: MAX, reason };
  }

  private static scoreBudget(
    budgetMin: any, budgetMax: any, propertyPrice: any
  ): ScoreFactor {
    const MAX = 15;

    if (!budgetMin && !budgetMax) {
      return { name: 'Budget', score: 3, maxScore: MAX, reason: 'Kein Budget angegeben' };
    }

    // If there's a budget range, that's good
    let score = 8;
    let reason = `Budget: ${budgetMin || '?'}€ - ${budgetMax || '?'}€`;

    // If property is assigned and budget matches
    if (propertyPrice) {
      const price = parseFloat(String(propertyPrice));
      const max = budgetMax ? parseFloat(String(budgetMax)) : Infinity;
      const min = budgetMin ? parseFloat(String(budgetMin)) : 0;

      if (price >= min && price <= max) {
        score = 15;
        reason += ' — passt zur Immobilie';
      } else if (price <= max * 1.1) {
        score = 10;
        reason += ' — knapp passend';
      } else {
        score = 5;
        reason += ' — Budget zu niedrig für Immobilie';
      }
    }

    return { name: 'Budget', score, maxScore: MAX, reason };
  }

  private static scoreSource(source: LeadSource): ScoreFactor {
    const MAX = 15;
    
    // Conversion rate based source scoring
    const sourceScores: Record<LeadSource, { score: number; reason: string }> = {
      REFERRAL: { score: 15, reason: 'Empfehlung — höchste Conversion' },
      WEBSITE: { score: 12, reason: 'Eigene Website — gute Qualität' },
      PORTAL: { score: 10, reason: 'Immobilienportal — aktive Suche' },
      SOCIAL_MEDIA: { score: 7, reason: 'Social Media — mittlere Qualität' },
      COLD_CALL: { score: 5, reason: 'Kaltakquise — niedrige Conversion' },
      EVENT: { score: 12, reason: 'Veranstaltung — persönlicher Kontakt' },
      OTHER: { score: 5, reason: 'Andere Quelle' },
    };

    const entry = sourceScores[source] || { score: 5, reason: 'Unbekannte Quelle' };
    return { name: 'Quelle', score: entry.score, maxScore: MAX, reason: entry.reason };
  }

  private static scoreEngagement(messageCount: number, activityCount: number): ScoreFactor {
    const MAX = 10;

    if (messageCount === 0 && activityCount <= 1) {
      return { name: 'Engagement', score: 1, maxScore: MAX, reason: 'Keine Interaktion' };
    }

    let score = Math.min(MAX, 
      Math.min(5, messageCount) +  // Up to 5 points for messages
      Math.min(5, activityCount)   // Up to 5 points for activities
    );

    return { 
      name: 'Engagement', 
      score, 
      maxScore: MAX, 
      reason: `${messageCount} Nachricht(en), ${activityCount} Aktivität(en)` 
    };
  }

  private static scoreCompleteness(lead: any): ScoreFactor {
    const MAX = 10;
    let filledFields = 0;
    const totalFields = 8;

    if (lead.firstName && lead.lastName) filledFields++;
    if (lead.email) filledFields++;
    if (lead.phone) filledFields++;
    if (lead.budgetMin || lead.budgetMax) filledFields++;
    if (lead.preferredLocation) filledFields++;
    if (lead.preferredType) filledFields++;
    if (lead.timeFrame) filledFields++;
    if (lead.notes) filledFields++;

    const score = Math.round((filledFields / totalFields) * MAX);

    return { 
      name: 'Vollständigkeit', 
      score, 
      maxScore: MAX, 
      reason: `${filledFields}/${totalFields} Felder ausgefüllt` 
    };
  }
}
