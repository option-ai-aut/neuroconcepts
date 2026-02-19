import Stripe from 'stripe';

// ─── Stripe Price IDs (Sandbox) ───────────────────────────────────────────────
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

// ─── Feature flag — flip to true when ready to charge ─────────────────────────
export const BILLING_ENABLED = process.env.BILLING_ENABLED === 'true';

// ─── Lazy Stripe client ───────────────────────────────────────────────────────
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key, { apiVersion: '2025-01-27.acacia', typescript: true });
  }
  return _stripe;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getPriceId(plan: 'solo' | 'team', cycle: BillingCycle): string {
  return STRIPE_PRICES[plan][cycle];
}

export interface StripeConfig {
  customerId?: string;
  subscriptionId?: string;
  plan?: PlanId;
  status?: string;
  currentPeriodEnd?: number;
  billingCycle?: BillingCycle;
}

export function parsePlan(priceId: string): PlanId {
  for (const [plan, prices] of Object.entries(STRIPE_PRICES)) {
    if (Object.values(prices).includes(priceId as any)) return plan as PlanId;
  }
  return 'free';
}
