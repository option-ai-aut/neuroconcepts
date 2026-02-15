/**
 * ABTestService — A/B Testing Framework for Immivo
 *
 * Features:
 * - Create experiments with multiple variants
 * - Assign users/leads to variants deterministically
 * - Track conversions per variant
 * - Calculate statistical significance
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

let _prisma: PrismaClient | null = null;
export function setABTestPrisma(p: PrismaClient) {
  _prisma = p;
}

interface Variant {
  id: string;
  name: string;
  weight: number; // 0-100 (percentage traffic)
  config: Record<string, any>;
}

interface Experiment {
  id: string;
  name: string;
  description: string;
  type: 'email_template' | 'expose_layout' | 'ai_prompt' | 'pricing' | 'custom';
  variants: Variant[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startedAt?: Date;
  endedAt?: Date;
  results: Record<string, VariantResult>;
}

interface VariantResult {
  impressions: number;
  conversions: number;
  conversionRate: number;
}

interface AssignmentResult {
  experimentId: string;
  variantId: string;
  variantName: string;
  config: Record<string, any>;
}

// In-memory store (would be DB-backed in production)
const experiments = new Map<string, Experiment>();
const assignments = new Map<string, string>(); // `${experimentId}:${identifier}` -> variantId

export class ABTestService {
  /**
   * Create a new experiment
   */
  static createExperiment(params: {
    name: string;
    description: string;
    type: Experiment['type'];
    variants: Omit<Variant, 'id'>[];
  }): Experiment {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const variants: Variant[] = params.variants.map((v, i) => ({
      ...v,
      id: `var_${id}_${i}`,
    }));

    // Validate weights sum to ~100
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 1) {
      throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    const experiment: Experiment = {
      id,
      name: params.name,
      description: params.description,
      type: params.type,
      variants,
      status: 'draft',
      results: {},
    };

    // Initialize results
    for (const v of variants) {
      experiment.results[v.id] = {
        impressions: 0,
        conversions: 0,
        conversionRate: 0,
      };
    }

    experiments.set(id, experiment);
    console.log(`🧪 A/B Test created: ${params.name} (${variants.length} variants)`);
    return experiment;
  }

  /**
   * Start an experiment
   */
  static startExperiment(experimentId: string): void {
    const exp = experiments.get(experimentId);
    if (!exp) throw new Error(`Experiment ${experimentId} not found`);
    exp.status = 'running';
    exp.startedAt = new Date();
    console.log(`🧪 A/B Test started: ${exp.name}`);
  }

  /**
   * Assign a variant to an identifier (user ID, lead ID, email, etc.)
   * Assignment is deterministic — same identifier always gets same variant
   */
  static assign(
    experimentId: string,
    identifier: string
  ): AssignmentResult | null {
    const exp = experiments.get(experimentId);
    if (!exp || exp.status !== 'running') return null;

    const key = `${experimentId}:${identifier}`;

    // Check existing assignment
    let variantId = assignments.get(key);

    if (!variantId) {
      // Deterministic assignment using hash
      const hash = crypto.createHash('md5').update(key).digest('hex');
      const bucket = parseInt(hash.substring(0, 8), 16) % 100;

      let cumWeight = 0;
      for (const variant of exp.variants) {
        cumWeight += variant.weight;
        if (bucket < cumWeight) {
          variantId = variant.id;
          break;
        }
      }

      if (!variantId) variantId = exp.variants[0].id;
      assignments.set(key, variantId);
    }

    const variant = exp.variants.find((v) => v.id === variantId)!;

    // Track impression
    if (exp.results[variantId]) {
      exp.results[variantId].impressions++;
    }

    return {
      experimentId,
      variantId: variant.id,
      variantName: variant.name,
      config: variant.config,
    };
  }

  /**
   * Track a conversion for an assignment
   */
  static trackConversion(experimentId: string, identifier: string): boolean {
    const key = `${experimentId}:${identifier}`;
    const variantId = assignments.get(key);
    if (!variantId) return false;

    const exp = experiments.get(experimentId);
    if (!exp) return false;

    if (exp.results[variantId]) {
      exp.results[variantId].conversions++;
      // Recalculate rate
      const r = exp.results[variantId];
      r.conversionRate =
        r.impressions > 0
          ? Math.round((r.conversions / r.impressions) * 10000) / 100
          : 0;
    }

    return true;
  }

  /**
   * Get experiment results with statistical significance
   */
  static getResults(
    experimentId: string
  ): {
    experiment: Experiment;
    winner: string | null;
    isSignificant: boolean;
    confidenceLevel: number;
  } | null {
    const exp = experiments.get(experimentId);
    if (!exp) return null;

    // Find variant with highest conversion rate
    let winner: string | null = null;
    let bestRate = -1;

    for (const [variantId, result] of Object.entries(exp.results)) {
      if (
        result.conversionRate > bestRate &&
        result.impressions >= 30
      ) {
        // Minimum sample size
        bestRate = result.conversionRate;
        winner = variantId;
      }
    }

    // Calculate statistical significance (simplified Z-test)
    let isSignificant = false;
    let confidenceLevel = 0;

    const variantResults = Object.values(exp.results);
    if (
      variantResults.length === 2 &&
      variantResults.every((r) => r.impressions >= 30)
    ) {
      const [a, b] = variantResults;
      const pA = a.conversions / a.impressions;
      const pB = b.conversions / b.impressions;
      const pPooled =
        (a.conversions + b.conversions) / (a.impressions + b.impressions);
      const se = Math.sqrt(
        pPooled * (1 - pPooled) * (1 / a.impressions + 1 / b.impressions)
      );

      if (se > 0) {
        const zScore = Math.abs(pA - pB) / se;
        // z > 1.96 = 95% confidence, z > 2.58 = 99%
        if (zScore > 2.58) {
          isSignificant = true;
          confidenceLevel = 99;
        } else if (zScore > 1.96) {
          isSignificant = true;
          confidenceLevel = 95;
        } else if (zScore > 1.645) {
          confidenceLevel = 90;
        } else {
          confidenceLevel = Math.round((zScore / 1.96) * 95);
        }
      }
    }

    return { experiment: exp, winner, isSignificant, confidenceLevel };
  }

  /**
   * List all experiments
   */
  static listExperiments(): Experiment[] {
    return Array.from(experiments.values());
  }

  /**
   * End an experiment
   */
  static endExperiment(experimentId: string): void {
    const exp = experiments.get(experimentId);
    if (!exp) return;
    exp.status = 'completed';
    exp.endedAt = new Date();
    console.log(`🧪 A/B Test ended: ${exp.name}`);
  }
}

export default ABTestService;
