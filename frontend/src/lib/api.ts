import { getRuntimeConfig } from '@/components/EnvProvider';
import { fetchAuthSession } from 'aws-amplify/auth';

const getApiUrl = () => {
  const config = getRuntimeConfig();
  return config.apiUrl || 'https://1rnmc2z8eg.execute-api.eu-central-1.amazonaws.com/dev';
};

const getAuthHeaders = async (): Promise<HeadersInit> => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch (error) {
    console.error('Error fetching auth session:', error);
    return {};
  }
};

export interface Message {
  id: string;
  role: 'SYSTEM' | 'USER' | 'ASSISTANT';
  content: string;
  status: 'DRAFT' | 'SENT' | 'FAILED';
  createdAt: string;
}

export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  createdAt: string;
  propertyId?: string;
  messages?: Message[];
  notes?: string;
  phone?: string;
}

export interface Property {
  id: string;
  title: string;
  address: string;
  price?: number;
  rooms?: number;
  area?: number;
  description?: string;
}

export interface TemplateRenderRequest {
  templateBody: string;
  context: any;
}

export const API_ENDPOINTS = {
  LEADS: '/leads',
  PROPERTIES: '/properties',
};

export async function fetcher(url: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}${url}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
}

export async function getLeads(): Promise<Lead[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiUrl()}/leads`, { headers });
    if (!res.ok) throw new Error('Failed to fetch leads');
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
}

export async function getProperties(): Promise<Property[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiUrl()}/properties`, { headers });
    if (!res.ok) throw new Error('Failed to fetch properties');
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiUrl()}/leads/${id}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

export async function renderTemplate(data: TemplateRenderRequest) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/templates/render`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateLead(id: string, data: Partial<Lead>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/leads/${id}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update lead');
  return res.json();
}

export async function sendManualEmail(id: string, subject: string, body: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/leads/${id}/email`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body }),
  });
  if (!res.ok) throw new Error('Failed to send email');
  return res.json();
}

export async function deleteLead(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/leads/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete lead');
  return res.json();
}

export async function deleteProperty(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/properties/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete property');
  return res.json();
}

export async function createLead(data: any) {
  const url = `${getApiUrl()}/leads`;
  const headers = await getAuthHeaders();
  console.log('POSTing to:', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('API Error:', res.status, text);
    throw new Error(`Failed to create lead: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getProperty(id: string): Promise<Property | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiUrl()}/properties/${id}`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

export async function updateProperty(id: string, data: Partial<Property>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/properties/${id}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update property');
  return res.json();
}

export async function createProperty(data: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/properties`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create property');
  return res.json();
}

export async function sendExpose(leadId: string, content: string) {
  // TODO: Implement send endpoint in backend
  console.log('Sending expose to', leadId, content);
  return { success: true };
}

export async function sendDraftMessage(messageId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/messages/${messageId}/send`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

// --- Auth & Team ---

export async function syncUser() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/auth/sync`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to sync user');
  return res.json();
}

export async function getMe() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/me`, {
    headers,
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function getSeats() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/seats`, {
    headers,
  });
  if (!res.ok) throw new Error('Failed to fetch seats');
  return res.json();
}

export async function inviteSeat(email: string, role: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/seats/invite`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) throw new Error('Failed to invite user');
  return res.json();
}
