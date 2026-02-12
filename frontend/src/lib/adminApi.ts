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
  return (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
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
