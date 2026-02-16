/**
 * AiCostService — Tracks AI usage and calculates costs for all OpenAI/Gemini API calls.
 * Logs every call to the AiUsageLog table for real-time cost monitoring.
 */

import { PrismaClient } from '@prisma/client';

// Pricing per 1M tokens in USD (easily updatable)
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5.2':                { input: 1.75, output: 14.00 },
  'gpt-5.1':                { input: 1.25, output: 10.00 },
  'gpt-5':                  { input: 1.25, output: 10.00 },
  'gpt-5-mini':             { input: 0.25, output: 2.00 },
  'gpt-5-nano':             { input: 0.05, output: 0.20 },
  'gpt-4.1-mini':           { input: 0.40, output: 1.60 },
  'gpt-4.1':                { input: 2.00, output: 8.00 },
  'gpt-4o':                 { input: 2.50, output: 10.00 },
  'gpt-4o-mini':            { input: 0.15, output: 0.60 },
  'gemini-2.5-flash-image': { input: 0.10, output: 0.40 },
  'gemini-3-pro-image-preview': { input: 0.50, output: 1.50 },
};

// Singleton instance
let _prisma: PrismaClient | null = null;

export class AiCostService {
  static setPrisma(prisma: PrismaClient) {
    _prisma = prisma;
  }

  /**
   * Calculate cost in US cents based on model and token counts
   */
  static calculateCostCents(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[model];
    if (!pricing) {
      console.warn(`⚠️ No pricing found for model: ${model}, using gpt-5-mini pricing`);
      const fallback = PRICING['gpt-5-mini'];
      return (inputTokens / 1_000_000 * fallback.input + outputTokens / 1_000_000 * fallback.output) * 100;
    }
    // Convert USD to cents
    return (inputTokens / 1_000_000 * pricing.input + outputTokens / 1_000_000 * pricing.output) * 100;
  }

  /**
   * Log an AI API call to the database for cost tracking
   */
  static async logUsage(params: {
    provider: 'openai' | 'gemini';
    model: string;
    endpoint: string;
    inputTokens: number;
    outputTokens: number;
    durationMs?: number;
    tenantId?: string | null;
    userId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!_prisma) {
      console.warn('⚠️ AiCostService: Prisma not initialized, skipping usage log');
      return;
    }

    const totalTokens = params.inputTokens + params.outputTokens;
    const costCentsUsd = this.calculateCostCents(params.model, params.inputTokens, params.outputTokens);

    try {
      await _prisma.aiUsageLog.create({
        data: {
          provider: params.provider,
          model: params.model,
          endpoint: params.endpoint,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          totalTokens,
          costCentsUsd,
          durationMs: params.durationMs || 0,
          tenantId: params.tenantId || null,
          userId: params.userId || null,
          metadata: params.metadata || undefined,
        },
      });
    } catch (err: any) {
      // Non-critical — don't let cost logging break the app
      console.error('⚠️ AiCostService.logUsage error:', err.message);
    }
  }

  /**
   * Get AI costs aggregated by day for a date range
   */
  static async getCostsByDay(from: Date, to: Date): Promise<{
    date: string;
    provider: string;
    model: string;
    totalCostCents: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCalls: number;
  }[]> {
    if (!_prisma) return [];

    const result = await _prisma.$queryRaw<any[]>`
      SELECT 
        DATE("createdAt") as date,
        "provider",
        "model",
        SUM("costCentsUsd")::float as "totalCostCents",
        SUM("inputTokens")::int as "totalInputTokens",
        SUM("outputTokens")::int as "totalOutputTokens",
        COUNT(*)::int as "totalCalls"
      FROM "AiUsageLog"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY DATE("createdAt"), "provider", "model"
      ORDER BY date DESC, "provider", "model"
    `;

    return result.map(r => ({
      ...r,
      date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    }));
  }

  /**
   * Get AI costs aggregated by model for a date range
   */
  static async getCostsByModel(from: Date, to: Date): Promise<{
    provider: string;
    model: string;
    totalCostCents: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCalls: number;
    avgCostPerCall: number;
  }[]> {
    if (!_prisma) return [];

    return _prisma.$queryRaw<any[]>`
      SELECT 
        "provider",
        "model",
        SUM("costCentsUsd")::float as "totalCostCents",
        SUM("inputTokens")::int as "totalInputTokens",
        SUM("outputTokens")::int as "totalOutputTokens",
        COUNT(*)::int as "totalCalls",
        (SUM("costCentsUsd") / NULLIF(COUNT(*), 0))::float as "avgCostPerCall"
      FROM "AiUsageLog"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY "provider", "model"
      ORDER BY "totalCostCents" DESC
    `;
  }

  /**
   * Get AI costs per tenant for a date range
   */
  static async getCostsByTenant(from: Date, to: Date): Promise<{
    tenantId: string | null;
    totalCostCents: number;
    totalCalls: number;
    totalTokens: number;
  }[]> {
    if (!_prisma) return [];

    return _prisma.$queryRaw<any[]>`
      SELECT 
        "tenantId",
        SUM("costCentsUsd")::float as "totalCostCents",
        COUNT(*)::int as "totalCalls",
        SUM("totalTokens")::int as "totalTokens"
      FROM "AiUsageLog"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY "tenantId"
      ORDER BY "totalCostCents" DESC
    `;
  }

  /**
   * Get AI costs by endpoint (chat, email-parse, etc.) for a date range
   */
  static async getCostsByEndpoint(from: Date, to: Date): Promise<{
    endpoint: string;
    totalCostCents: number;
    totalCalls: number;
    avgCostPerCall: number;
  }[]> {
    if (!_prisma) return [];

    return _prisma.$queryRaw<any[]>`
      SELECT 
        "endpoint",
        SUM("costCentsUsd")::float as "totalCostCents",
        COUNT(*)::int as "totalCalls",
        (SUM("costCentsUsd") / NULLIF(COUNT(*), 0))::float as "avgCostPerCall"
      FROM "AiUsageLog"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      GROUP BY "endpoint"
      ORDER BY "totalCostCents" DESC
    `;
  }

  /**
   * Get total summary for a date range
   */
  static async getSummary(from: Date, to: Date): Promise<{
    totalCostCents: number;
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    byProvider: { provider: string; costCents: number; calls: number }[];
  }> {
    if (!_prisma) return { totalCostCents: 0, totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, byProvider: [] };

    const [totals, byProvider] = await Promise.all([
      _prisma.$queryRaw<any[]>`
        SELECT 
          COALESCE(SUM("costCentsUsd"), 0)::float as "totalCostCents",
          COUNT(*)::int as "totalCalls",
          COALESCE(SUM("inputTokens"), 0)::int as "totalInputTokens",
          COALESCE(SUM("outputTokens"), 0)::int as "totalOutputTokens",
          COALESCE(SUM("totalTokens"), 0)::int as "totalTokens"
        FROM "AiUsageLog"
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      `,
      _prisma.$queryRaw<any[]>`
        SELECT 
          "provider",
          SUM("costCentsUsd")::float as "costCents",
          COUNT(*)::int as "calls"
        FROM "AiUsageLog"
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
        GROUP BY "provider"
      `,
    ]);

    const t = totals[0] || { totalCostCents: 0, totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0 };
    return { ...t, byProvider };
  }

  /**
   * Get cost per lead for a date range
   */
  static async getCostPerLead(from: Date, to: Date): Promise<{
    totalCostCents: number;
    totalLeads: number;
    costPerLeadCents: number;
    awsCostCents: number;
    aiCostCents: number;
    dailyTrend: { date: string; leads: number; aiCostCents: number; costPerLeadCents: number }[];
  }> {
    if (!_prisma) return { totalCostCents: 0, totalLeads: 0, costPerLeadCents: 0, awsCostCents: 0, aiCostCents: 0, dailyTrend: [] };

    const [aiSummary, leadCount, dailyData] = await Promise.all([
      _prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM("costCentsUsd"), 0)::float as "totalCostCents"
        FROM "AiUsageLog"
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      `,
      _prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int as count
        FROM "Lead"
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      `,
      _prisma.$queryRaw<any[]>`
        SELECT 
          d.date,
          COALESCE(l.leads, 0)::int as leads,
          COALESCE(a."aiCostCents", 0)::float as "aiCostCents"
        FROM (
          SELECT generate_series(${from}::date, ${to}::date, '1 day'::interval)::date as date
        ) d
        LEFT JOIN (
          SELECT DATE("createdAt") as date, COUNT(*) as leads
          FROM "Lead"
          WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
          GROUP BY DATE("createdAt")
        ) l ON l.date = d.date
        LEFT JOIN (
          SELECT DATE("createdAt") as date, SUM("costCentsUsd") as "aiCostCents"
          FROM "AiUsageLog"
          WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
          GROUP BY DATE("createdAt")
        ) a ON a.date = d.date
        ORDER BY d.date
      `,
    ]);

    const aiCostCents = aiSummary[0]?.totalCostCents || 0;
    const totalLeads = leadCount[0]?.count || 0;
    const costPerLeadCents = totalLeads > 0 ? aiCostCents / totalLeads : 0;

    return {
      totalCostCents: aiCostCents,
      totalLeads,
      costPerLeadCents,
      awsCostCents: 0, // Will be filled by caller with AWS Cost Explorer data
      aiCostCents,
      dailyTrend: dailyData.map((d: any) => ({
        date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date),
        leads: d.leads,
        aiCostCents: d.aiCostCents,
        costPerLeadCents: d.leads > 0 ? d.aiCostCents / d.leads : 0,
      })),
    };
  }

  /**
   * Check if a tenant has exceeded their monthly AI cost cap.
   * Returns { exceeded: boolean, currentCostCents, capCents, remainingCents }
   */
  static async checkCostCap(tenantId: string): Promise<{
    exceeded: boolean;
    currentCostCents: number;
    capCents: number;
    remainingCents: number;
  }> {
    if (!_prisma) return { exceeded: false, currentCostCents: 0, capCents: 2000, remainingCents: 2000 };

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const [usageResult, settings] = await Promise.all([
        _prisma.$queryRaw<any[]>`
          SELECT COALESCE(SUM("costCentsUsd"), 0)::float as "totalCostCents"
          FROM "AiUsageLog"
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${monthStart}
            AND "createdAt" <= ${monthEnd}
        `,
        _prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { aiCostCapCentsUsd: true },
        }).catch(() => null),
      ]);

      const currentCostCents = usageResult[0]?.totalCostCents || 0;
      const capCents = settings?.aiCostCapCentsUsd ?? 2000;
      const remainingCents = Math.max(0, capCents - currentCostCents);

      return {
        exceeded: currentCostCents >= capCents,
        currentCostCents,
        capCents,
        remainingCents,
      };
    } catch (err) {
      console.warn('checkCostCap failed (column may not exist yet):', (err as Error).message);
      return { exceeded: false, currentCostCents: 0, capCents: 2000, remainingCents: 2000 };
    }
  }

  /**
   * Get monthly cost for a specific tenant
   */
  static async getTenantMonthlyCost(tenantId: string): Promise<{
    costCents: number;
    costUsd: number;
    calls: number;
    capCents: number;
    capUsd: number;
    percentUsed: number;
  }> {
    if (!_prisma) return { costCents: 0, costUsd: 0, calls: 0, capCents: 2000, capUsd: 20, percentUsed: 0 };

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const [usageResult, settings] = await Promise.all([
        _prisma.$queryRaw<any[]>`
          SELECT 
            COALESCE(SUM("costCentsUsd"), 0)::float as "totalCostCents",
            COUNT(*)::int as "totalCalls"
          FROM "AiUsageLog"
          WHERE "tenantId" = ${tenantId}
            AND "createdAt" >= ${monthStart}
            AND "createdAt" <= ${monthEnd}
        `,
        _prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { aiCostCapCentsUsd: true },
        }).catch(() => null),
      ]);

      const costCents = usageResult[0]?.totalCostCents || 0;
      const calls = usageResult[0]?.totalCalls || 0;
      const capCents = settings?.aiCostCapCentsUsd ?? 2000;
      const percentUsed = capCents > 0 ? (costCents / capCents) * 100 : 0;

      return {
        costCents,
        costUsd: costCents / 100,
        calls,
        capCents,
        capUsd: capCents / 100,
        percentUsed: Math.min(100, percentUsed),
      };
    } catch (err) {
      console.warn('getTenantMonthlyCost failed:', (err as Error).message);
      return { costCents: 0, costUsd: 0, calls: 0, capCents: 2000, capUsd: 20, percentUsed: 0 };
    }
  }

  /**
   * Get the current pricing table (for display in admin UI)
   */
  static getPricingTable(): Record<string, { input: number; output: number }> {
    return { ...PRICING };
  }
}
