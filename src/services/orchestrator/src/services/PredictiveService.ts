/**
 * PredictiveService — Predictive Analytics for Immivo
 *
 * Features:
 * - Lead conversion probability (based on historical patterns)
 * - Optimal contact time prediction
 * - Property price estimation (comparable analysis)
 */

import { PrismaClient } from '@prisma/client';

let _prisma: PrismaClient | null = null;
export function setPredictivePrisma(p: PrismaClient) {
  _prisma = p;
}
function getPrisma(): PrismaClient {
  if (!_prisma) throw new Error('PredictiveService: Prisma not injected');
  return _prisma;
}

export interface ConversionPrediction {
  probability: number; // 0-100%
  factors: {
    factor: string;
    impact: number; // -20 to +20
    description: string;
  }[];
  recommendation: string;
  estimatedDaysToConvert: number | null;
}

export interface ContactTimePrediction {
  bestHour: number; // 0-23
  bestDay: string; // 'monday' etc.
  responseRateByHour: Record<number, number>;
  reason: string;
}

export interface PriceEstimation {
  estimatedPrice: number;
  priceRange: { min: number; max: number };
  pricePerSqm: number;
  comparables: number; // How many comparables were used
  confidence: number; // 0-100
  factors: string[];
}

export class PredictiveService {
  /**
   * Predict lead conversion probability based on historical data patterns
   */
  static async predictConversion(
    leadId: string,
    tenantId: string
  ): Promise<ConversionPrediction> {
    const prisma = getPrisma();

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { property: true },
    });
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    // Get historical conversion data for this tenant
    const [totalLeads, convertedLeads, lostLeads] = await Promise.all([
      prisma.lead.count({ where: { tenantId } }),
      prisma.lead.count({ where: { tenantId, status: 'BOOKED' } }),
      prisma.lead.count({ where: { tenantId, status: 'LOST' } }),
    ]);

    const baseRate =
      totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 15; // Default 15% if no data

    const factors: ConversionPrediction['factors'] = [];
    let adjustedProbability = baseRate;

    // Factor 1: Lead Score (if available)
    if (lead.score) {
      const scoreImpact = (lead.score - 50) / 5; // -10 to +10
      factors.push({
        factor: 'Lead Score',
        impact: Math.round(scoreImpact),
        description: `Score: ${lead.score}/100`,
      });
      adjustedProbability += scoreImpact;
    }

    // Factor 2: Response time (time since creation to first activity)
    const firstActivity = await prisma.leadActivity.findFirst({
      where: {
        leadId,
        type: { in: ['EMAIL_SENT', 'VIEWING_SCHEDULED'] },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (firstActivity) {
      const responseHours =
        (firstActivity.createdAt.getTime() - lead.createdAt.getTime()) /
        (1000 * 60 * 60);
      if (responseHours < 1) {
        factors.push({
          factor: 'Antwortzeit',
          impact: 15,
          description: 'Innerhalb 1 Stunde kontaktiert',
        });
        adjustedProbability += 15;
      } else if (responseHours < 24) {
        factors.push({
          factor: 'Antwortzeit',
          impact: 5,
          description: 'Innerhalb 24 Stunden kontaktiert',
        });
        adjustedProbability += 5;
      } else {
        factors.push({
          factor: 'Antwortzeit',
          impact: -10,
          description: `Erst nach ${Math.round(responseHours)}h kontaktiert`,
        });
        adjustedProbability -= 10;
      }
    } else {
      factors.push({
        factor: 'Antwortzeit',
        impact: -5,
        description: 'Noch nicht kontaktiert',
      });
      adjustedProbability -= 5;
    }

    // Factor 3: Financing status
    const financing = (lead as any).financingStatus;
    if (financing === 'APPROVED' || financing === 'CASH_BUYER') {
      factors.push({
        factor: 'Finanzierung',
        impact: 15,
        description:
          financing === 'CASH_BUYER' ? 'Barkäufer' : 'Finanzierung genehmigt',
      });
      adjustedProbability += 15;
    } else if (financing === 'IN_PROGRESS') {
      factors.push({
        factor: 'Finanzierung',
        impact: 5,
        description: 'Finanzierung in Bearbeitung',
      });
      adjustedProbability += 5;
    } else if (financing === 'NONE') {
      factors.push({
        factor: 'Finanzierung',
        impact: -10,
        description: 'Keine Finanzierung',
      });
      adjustedProbability -= 10;
    }

    // Factor 4: Source quality
    if (lead.source === 'REFERRAL') {
      factors.push({ factor: 'Quelle', impact: 15, description: 'Empfehlung' });
      adjustedProbability += 15;
    } else if (lead.source === 'WEBSITE') {
      factors.push({
        factor: 'Quelle',
        impact: 10,
        description: 'Website-Anfrage',
      });
      adjustedProbability += 10;
    } else if (lead.source === 'PORTAL') {
      factors.push({
        factor: 'Quelle',
        impact: 0,
        description: 'Portal-Anfrage',
      });
    }

    // Factor 5: Activity count (engagement)
    const activityCount = await prisma.leadActivity.count({ where: { leadId } });
    if (activityCount > 5) {
      factors.push({
        factor: 'Engagement',
        impact: 10,
        description: `${activityCount} Aktivitäten`,
      });
      adjustedProbability += 10;
    } else if (activityCount > 2) {
      factors.push({
        factor: 'Engagement',
        impact: 5,
        description: `${activityCount} Aktivitäten`,
      });
      adjustedProbability += 5;
    }

    // Factor 6: Property has been viewed
    const viewings = await prisma.leadActivity.count({
      where: { leadId, type: 'VIEWING_SCHEDULED' },
    });
    if (viewings > 0) {
      factors.push({
        factor: 'Besichtigung',
        impact: 20,
        description: `${viewings} Besichtigung(en) geplant`,
      });
      adjustedProbability += 20;
    }

    // Clamp probability
    adjustedProbability = Math.max(1, Math.min(99, adjustedProbability));

    // Estimate days to convert based on historical data
    let estimatedDays: number | null = null;
    if (convertedLeads > 0) {
      const avgConversion = await prisma.$queryRawUnsafe<
        { avg_days: number }[]
      >(
        `SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400)::int as avg_days
         FROM "Lead" WHERE "tenantId" = $1 AND "status" = 'BOOKED'`,
        tenantId
      );
      estimatedDays = avgConversion[0]?.avg_days || null;
    }

    // Generate recommendation
    let recommendation = '';
    if (adjustedProbability > 70)
      recommendation =
        'Heißer Lead — sofort persönlich kontaktieren und Besichtigung anbieten';
    else if (adjustedProbability > 40)
      recommendation =
        'Warmer Lead — Follow-up senden und offene Fragen klären';
    else if (adjustedProbability > 20)
      recommendation = 'Lauwarmer Lead — in Nurture-Sequenz aufnehmen';
    else
      recommendation =
        'Kalter Lead — geringe Priorität, nur automatische Follow-ups';

    return {
      probability: Math.round(adjustedProbability),
      factors,
      recommendation,
      estimatedDaysToConvert: estimatedDays,
    };
  }

  /**
   * Predict optimal contact time for a lead based on tenant's response patterns
   */
  static async predictContactTime(
    tenantId: string
  ): Promise<ContactTimePrediction> {
    const prisma = getPrisma();

    // Analyze when leads respond (based on email receipt times)
    const activities = await prisma.leadActivity.findMany({
      where: {
        lead: { tenantId },
        type: { in: ['EMAIL_RECEIVED', 'PORTAL_INQUIRY'] },
      },
      select: { createdAt: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });

    // Build hour distribution
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<string, number> = {};
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];

    for (let h = 0; h < 24; h++) hourCounts[h] = 0;
    for (const d of days) dayCounts[d] = 0;

    for (const a of activities) {
      const hour = a.createdAt.getHours();
      const day = days[a.createdAt.getDay()];
      hourCounts[hour]++;
      dayCounts[day]++;
    }

    // Find best hour and day
    let bestHour = 10; // Default
    let bestHourCount = 0;
    for (const [h, count] of Object.entries(hourCounts)) {
      if (count > bestHourCount) {
        bestHour = parseInt(h);
        bestHourCount = count;
      }
    }

    let bestDay = 'tuesday'; // Default
    let bestDayCount = 0;
    for (const [d, count] of Object.entries(dayCounts)) {
      if (count > bestDayCount) {
        bestDay = d;
        bestDayCount = count;
      }
    }

    // Normalize to response rates (percentage)
    const totalResponses = activities.length || 1;
    const responseRateByHour: Record<number, number> = {};
    for (const [h, count] of Object.entries(hourCounts)) {
      responseRateByHour[parseInt(h)] = Math.round((count / totalResponses) * 100);
    }

    const dayMap: Record<string, string> = {
      monday: 'Montag',
      tuesday: 'Dienstag',
      wednesday: 'Mittwoch',
      thursday: 'Donnerstag',
      friday: 'Freitag',
      saturday: 'Samstag',
      sunday: 'Sonntag',
    };

    return {
      bestHour,
      bestDay,
      responseRateByHour,
      reason:
        activities.length > 20
          ? `Basierend auf ${activities.length} Interaktionen: Beste Zeit ist ${dayMap[bestDay]} um ${bestHour}:00 Uhr`
          : `Noch wenig Daten (${activities.length} Interaktionen). Standard-Empfehlung: Dienstag 10:00 Uhr`,
    };
  }

  /**
   * Estimate property price based on comparable properties
   */
  static async estimatePrice(params: {
    tenantId: string;
    city?: string;
    zipCode?: string;
    propertyType?: string;
    livingArea?: number;
    rooms?: number;
  }): Promise<PriceEstimation> {
    const prisma = getPrisma();
    const { tenantId, city, zipCode, propertyType, livingArea, rooms } = params;

    // Find comparable properties (same tenant, similar characteristics)
    const where: any = { tenantId };
    if (city) where.city = city;
    if (zipCode) where.zipCode = zipCode;
    if (propertyType) where.propertyType = propertyType;

    let comparables = await prisma.property.findMany({
      where: { ...where, salePrice: { gt: 0 } },
      select: {
        salePrice: true,
        livingArea: true,
        rooms: true,
        city: true,
        zipCode: true,
      },
      take: 50,
    });

    // If too few results, relax criteria
    if (comparables.length < 3 && zipCode) {
      comparables = await prisma.property.findMany({
        where: { tenantId, city, salePrice: { gt: 0 } },
        select: {
          salePrice: true,
          livingArea: true,
          rooms: true,
          city: true,
          zipCode: true,
        },
        take: 50,
      });
    }

    if (comparables.length === 0) {
      return {
        estimatedPrice: 0,
        priceRange: { min: 0, max: 0 },
        pricePerSqm: 0,
        comparables: 0,
        confidence: 0,
        factors: ['Keine vergleichbaren Objekte gefunden'],
      };
    }

    // Calculate price per sqm for comparables
    const pricesPerSqm = comparables
      .filter((c) => c.livingArea && c.livingArea > 0 && c.salePrice)
      .map((c) => Number(c.salePrice) / Number(c.livingArea));

    if (pricesPerSqm.length === 0) {
      return {
        estimatedPrice: 0,
        priceRange: { min: 0, max: 0 },
        pricePerSqm: 0,
        comparables: comparables.length,
        confidence: 10,
        factors: ['Keine Flächendaten bei Vergleichsobjekten'],
      };
    }

    // Remove outliers (outside 1.5 IQR)
    pricesPerSqm.sort((a, b) => a - b);
    const q1 = pricesPerSqm[Math.floor(pricesPerSqm.length * 0.25)];
    const q3 = pricesPerSqm[Math.floor(pricesPerSqm.length * 0.75)];
    const iqr = q3 - q1;
    const filtered = pricesPerSqm.filter(
      (p) => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr
    );

    const avgPricePerSqm =
      filtered.reduce((sum, p) => sum + p, 0) / filtered.length;
    const area = livingArea || 80; // Default 80 sqm if not provided

    const estimatedPrice = Math.round(avgPricePerSqm * area);
    const stdDev = Math.sqrt(
      filtered.reduce((sum, p) => sum + Math.pow(p - avgPricePerSqm, 2), 0) /
        filtered.length
    );

    const factors: string[] = [];
    factors.push(`${filtered.length} Vergleichsobjekte analysiert`);
    factors.push(`Durchschnitt: ${Math.round(avgPricePerSqm)} €/m²`);
    if (city) factors.push(`Stadt: ${city}`);
    if (zipCode) factors.push(`PLZ: ${zipCode}`);

    // Confidence based on number of comparables and stddev
    let confidence = Math.min(90, filtered.length * 10);
    if (stdDev / avgPricePerSqm > 0.3) confidence -= 20; // High variance reduces confidence

    return {
      estimatedPrice,
      priceRange: {
        min: Math.round((avgPricePerSqm - stdDev) * area),
        max: Math.round((avgPricePerSqm + stdDev) * area),
      },
      pricePerSqm: Math.round(avgPricePerSqm),
      comparables: filtered.length,
      confidence: Math.max(5, Math.round(confidence)),
      factors,
    };
  }
}

export default PredictiveService;
