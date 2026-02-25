import { fetchAuthSession } from 'aws-amplify/auth';
import { getRuntimeConfig } from '@/components/EnvProvider';

async function getAdminHeaders(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

function getApiUrl(): string {
  const config = getRuntimeConfig();
  return (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAdminHeaders();
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Types ---

export interface PlatformStats {
  tenants: number;
  users: number;
  leads: number;
  properties: number;
  exposes: number;
  emails: number;
  newTenantsThisMonth: number;
  newLeadsThisMonth: number;
  payingTenants?: number;
  mrrCents?: number;
  stripeCustomers?: number;
  billingEnabled?: boolean;
  leadsByStatus: Record<string, number>;
  propertiesByStatus: Record<string, number>;
  recentActivities: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    tenantName: string;
    leadName: string;
  }[];
}

export interface HealthCheck {
  overall: 'healthy' | 'degraded';
  services: Record<string, { status: string; latency?: number; detail?: string }>;
}

export interface AdminTenant {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
  userCount: number;
  leadCount: number;
  propertyCount: number;
  templateCount: number;
  inboundEmail: string | null;
  autoReply: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  tenantId: string;
  tenantName: string;
  leadCount: number;
}

export interface AuditLogEntry {
  id: string;
  endpoint: string;
  message: string;
  response: string | null;
  flagged: boolean;
  flagReason: string | null;
  userEmail: string;
  userName: string;
  tenantName: string;
  createdAt: string;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pages: number;
}

export interface PlatformSettings {
  ai: { openaiKey: string; geminiKey: string };
  auth: { userPoolId: string; clientId: string; adminUserPoolId: string; adminClientId: string };
  email: { provider: string; resendKey: string; fromEmail: string };
  storage: { mediaBucket: string };
  environment: string;
  region: string;
}

export type BugReportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'WONT_FIX';
export type BugReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BugReport {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  tenantName: string | null;
  title: string;
  description: string;
  page: string | null;
  screenshotUrl: string | null;
  consoleLogs: string | null;
  status: BugReportStatus;
  priority: BugReportPriority;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BugReportsResponse {
  reports: BugReport[];
  counts: Record<string, number>;
  total: number;
}

// --- API Functions ---

export const getAdminStats = () => adminFetch<PlatformStats>('/admin/platform/stats');
export const getAdminHealth = () => adminFetch<HealthCheck>('/admin/platform/health');
export const getAdminTenants = () => adminFetch<AdminTenant[]>('/admin/platform/tenants');
export const getAdminTenantDetail = (id: string) => adminFetch<any>(`/admin/platform/tenants/${id}`);
export const createAdminTenant = (data: { name: string; address?: string }) =>
  adminFetch<AdminTenant>('/admin/platform/tenants', { method: 'POST', body: JSON.stringify(data) });
export const deleteAdminTenant = (id: string) =>
  adminFetch<{ success: boolean }>(`/admin/platform/tenants/${id}`, { method: 'DELETE' });
export const getAdminUsers = () => adminFetch<AdminUser[]>('/admin/platform/users');
export const getAdminAuditLogs = (page = 1, flaggedOnly = false) =>
  adminFetch<AuditLogResponse>(`/admin/platform/audit-logs?page=${page}&flagged=${flaggedOnly}`);
export const getAdminSettings = () => adminFetch<PlatformSettings>('/admin/platform/settings');

// Bug Reports
export const getAdminBugReports = (status?: string) =>
  adminFetch<BugReportsResponse>(`/admin/platform/bug-reports${status && status !== 'ALL' ? `?status=${status}` : ''}`);
export const updateAdminBugReport = (id: string, data: { status?: BugReportStatus; priority?: BugReportPriority; adminNotes?: string }) =>
  adminFetch<BugReport>(`/admin/platform/bug-reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

// User Management
export const updateAdminUser = (id: string, data: { role?: string; firstName?: string; lastName?: string; phone?: string }) =>
  adminFetch<AdminUser>(`/admin/platform/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteAdminUser = (id: string) =>
  adminFetch<{ success: boolean }>(`/admin/platform/users/${id}`, { method: 'DELETE' });

// Admin Emails (WorkMail)
export interface AdminEmail {
  id: string;
  from: string;
  fromName: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isRead: boolean;
  hasAttachments: boolean;
  receivedAt: string;
  folder: string;
  leadId?: string;
  leadName?: string | null;
  providerData?: Record<string, any>;
}

export interface DemoBooking {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string | null;
  start: string;
  end: string;
  eventId: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  adminNotes: string | null;
  createdAt: string;
}

export interface DemoBookingsResponse {
  bookings: DemoBooking[];
  counts: Record<string, number>;
  total: number;
}

export const getAdminDemoBookings = (status?: string) =>
  adminFetch<DemoBookingsResponse>(`/admin/platform/demo-bookings${status && status !== 'ALL' ? `?status=${status}` : ''}`);

export const updateAdminDemoBooking = (id: string, data: { status?: string; adminNotes?: string }) =>
  adminFetch<DemoBooking>(`/admin/platform/demo-bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const backfillPortalEmails = () =>
  adminFetch<{ success: boolean; created: number; skipped: number; total: number }>('/admin/backfill-portal-emails', { method: 'POST' });

export interface AdminEmailsResponse {
  emails: AdminEmail[];
  total: number;
  unreadCounts: Record<string, number>;
  error?: string;
}

export const getAdminEmails = (mailbox: string, folder = 'INBOX', search?: string) =>
  adminFetch<AdminEmailsResponse>(`/admin/emails?mailbox=${encodeURIComponent(mailbox)}&folder=${folder}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
export const getAdminUnreadCounts = () =>
  adminFetch<{ counts: Record<string, number> }>('/admin/emails/unread-counts');
export const markAdminEmailRead = (id: string, isRead: boolean, mailbox?: string) =>
  adminFetch<{ success: boolean }>(`/admin/emails/${id}/read`, { method: 'PATCH', body: JSON.stringify({ isRead, mailbox }) });

export interface SendEmailPayload {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  replyToMessageId?: string;
}
export const sendAdminEmail = (payload: SendEmailPayload) =>
  adminFetch<{ success: boolean }>('/admin/emails/send', { method: 'POST', body: JSON.stringify(payload) });

// Finance / Cost Tracking
export interface FinanceSummary {
  period: { from: string; to: string };
  totalCostCents: number;
  totalCostUsd: number;
  aws: {
    totalCents: number;
    byService: Record<string, number>;
    error?: string;
  };
  ai: {
    totalCostCents: number;
    totalCostUsd: number;
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    byProvider: { provider: string; costCents: number; calls: number }[];
  };
  leads: {
    total: number;
    costPerLeadCents: number;
    costPerLeadUsd: number;
  };
}

export interface AiCostByModel {
  provider: string;
  model: string;
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCalls: number;
  avgCostPerCall: number;
}

export interface AiCostByDay {
  date: string;
  provider: string;
  model: string;
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCalls: number;
}

export interface AiCostByEndpoint {
  endpoint: string;
  totalCostCents: number;
  totalCalls: number;
  avgCostPerCall: number;
}

export interface AwsCostData {
  period: { from: string; to: string };
  granularity: string;
  totalCostCents: number;
  totalCostUsd: number;
  serviceBreakdown: Record<string, number>;
  periods: { start: string; end: string; services: Record<string, { cost: number; usage: number }> }[];
}

export interface CostPerLead {
  period: { from: string; to: string };
  totalCostCents: number;
  totalLeads: number;
  costPerLeadCents: number;
  awsCostCents: number;
  aiCostCents: number;
  dailyTrend: { date: string; leads: number; aiCostCents: number; costPerLeadCents: number }[];
}

export const getFinanceSummary = (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return adminFetch<FinanceSummary>(`/admin/finance/summary?${params}`);
};

export const getAiCosts = (view: 'model' | 'day' | 'endpoint' | 'tenant' = 'model', from?: string, to?: string) => {
  const params = new URLSearchParams({ view });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return adminFetch<{ period: { from: string; to: string }; view: string; data: any[] }>(`/admin/finance/ai-costs?${params}`);
};

export const getAwsCosts = (granularity: 'DAILY' | 'MONTHLY' = 'MONTHLY', from?: string, to?: string) => {
  const params = new URLSearchParams({ granularity });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return adminFetch<AwsCostData>(`/admin/finance/aws-costs?${params}`);
};

export const getCostPerLead = (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return adminFetch<CostPerLead>(`/admin/finance/cost-per-lead?${params}`);
};

export const getAiPricing = () => adminFetch<{ pricing: Record<string, { input: number; output: number }> }>('/admin/finance/pricing');

export interface TenantCost {
  tenantId: string;
  tenantName: string;
  costCents: number;
  costUsd: number;
  calls: number;
  capCents: number;
  capUsd: number;
  percentUsed: number;
}

export const getTenantCosts = () => adminFetch<{ data: TenantCost[] }>('/admin/finance/tenant-costs');

// Stripe Admin
export interface StripeOverview {
  configured: boolean;
  billingEnabled: boolean;
  mrrCents: number;
  activeSubscriptions: number;
  totalCustomers: number;
  recentInvoices: { id: string; number: string | null; status: string; amountPaid: number; currency: string; customerEmail: string | null; createdAt: number }[];
  error?: string;
}

export interface StripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  created: number;
  metadata: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  status: string;
  customerId: string;
  customerEmail: string | null;
  planAmount: number | null;
  planCurrency: string;
  planInterval: string;
  productName: string | null;
  currentPeriodEnd: number;
  created: number;
}

export interface StripeInvoice {
  id: string;
  number: string | null;
  status: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  customerEmail: string | null;
  created: number;
  paid: boolean;
}

export interface StripeSettings {
  configured: boolean;
  billingEnabled: boolean;
  hasWebhookSecret: boolean;
  priceIds: Record<string, Record<string, string>> | null;
  mode: 'live' | 'test' | null;
}

export const getStripeOverview = () => adminFetch<StripeOverview>('/admin/stripe/overview');
export const getStripeCustomers = (limit?: number, startingAfter?: string) => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (startingAfter) params.set('startingAfter', startingAfter);
  return adminFetch<{ data: StripeCustomer[]; hasMore: boolean }>(`/admin/stripe/customers?${params}`);
};
export const getStripeSubscriptions = (status?: string, limit?: number) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (limit) params.set('limit', String(limit));
  return adminFetch<{ data: StripeSubscription[]; hasMore: boolean }>(`/admin/stripe/subscriptions?${params}`);
};
export const getStripeInvoices = (limit?: number, status?: string) => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (status) params.set('status', status);
  return adminFetch<{ data: StripeInvoice[]; hasMore: boolean }>(`/admin/stripe/invoices?${params}`);
};
export const getStripeProducts = () => adminFetch<{
  products: { id: string; name: string; description: string | null }[];
  prices: { priceId: string; productId: string; productName: string; amount: number | null; currency: string; interval: string; type: string }[];
  stripePrices: Record<string, Record<string, string>>;
}>('/admin/stripe/products');
export const getStripeSettings = () => adminFetch<StripeSettings>('/admin/stripe/settings');
