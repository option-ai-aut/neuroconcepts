import Stripe from 'stripe';
import crypto from 'crypto';

// ─── Stripe Price IDs ────────────────────────────────────────────────────────
// These are set in Stripe Dashboard. When switching from sandbox to live,
// update these IDs or move them to environment variables.
export const STRIPE_PRICES = {
  solo: {
    monthly: 'price_1T2XlCRpLZ23qvr06YT1VRj3',
    yearly:  'price_1T2XlGRpLZ23qvr0oX2qjIgZ',
  },
  team: {
    monthly: 'price_1T2XlDRpLZ23qvr0w6FJEsmI',
    yearly:  'price_1T2XlHRpLZ23qvr0RQIKuNO2',
  },
} as const;

export type PlanId = 'free' | 'solo' | 'team' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export const BILLING_ENABLED = process.env.BILLING_ENABLED === 'true';

// ─── Lazy Stripe client with key validation ──────────────────────────────────
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_') && !key.startsWith('rk_test_') && !key.startsWith('rk_live_')) {
      throw new Error('STRIPE_SECRET_KEY has invalid format — must start with sk_test_, sk_live_, rk_test_, or rk_live_');
    }
    _stripe = new Stripe(key, { apiVersion: '2026-01-28.clover', typescript: true });
  }
  return _stripe;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getPriceId(plan: 'solo' | 'team', cycle: BillingCycle): string {
  return STRIPE_PRICES[plan][cycle];
}

/**
 * Generate a deterministic idempotency key to prevent duplicate Checkout Sessions.
 * Based on tenantId + plan + billingCycle + 10-minute time window.
 */
export function checkoutIdempotencyKey(tenantId: string, plan: string, billingCycle: string): string {
  const window = Math.floor(Date.now() / (10 * 60 * 1000));
  return crypto.createHash('sha256').update(`checkout:${tenantId}:${plan}:${billingCycle}:${window}`).digest('hex').slice(0, 48);
}

export interface StripeConfig {
  customerId?: string;
  subscriptionId?: string;
  plan?: PlanId;
  status?: string;
  currentPeriodEnd?: number;
  billingCycle?: BillingCycle;
  /** Unix timestamp (seconds) when the 7-day free trial ends. Set on registration. */
  trialEndsAt?: number;
}

export const TRIAL_DURATION_DAYS = 7;

/** Returns remaining trial days (0 if expired or no trial). */
export function getTrialDaysLeft(trialEndsAt?: number): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt - Date.now() / 1000) / 86400));
}

export function parsePlan(priceId: string): PlanId {
  for (const [plan, prices] of Object.entries(STRIPE_PRICES)) {
    if (Object.values(prices).includes(priceId as any)) return plan as PlanId;
  }
  return 'free';
}
