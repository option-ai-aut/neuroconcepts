import { getRuntimeConfig } from '@/components/EnvProvider';
import { fetchAuthSession } from 'aws-amplify/auth';

export const getApiUrl = () => {
  const config = getRuntimeConfig();
  const url = config.apiUrl || 'https://lcbsl3olre.execute-api.eu-central-1.amazonaws.com/dev';
  // Remove trailing slash to prevent double slashes
  return url.replace(/\/+$/, '');
};

/**
 * Resolves image URLs for display:
 * - S3 URLs (http) with missing region -> fix region
 * - /uploads/ paths (local dev) -> prepend API base URL
 * - Other URLs -> return as-is
 */
export const getImageUrl = (url: string): string => {
  if (!url) return '';
  // Fix S3 URLs missing region (legacy: .s3.amazonaws.com -> .s3.eu-central-1.amazonaws.com)
  if (url.includes('.s3.amazonaws.com/') && !url.includes('.s3.eu-central-1.amazonaws.com/')) {
    return url.replace('.s3.amazonaws.com/', '.s3.eu-central-1.amazonaws.com/');
  }
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads/')) {
    const base = getApiUrl();
    return `${base}${url}`;
  }
  return url;
};

export const getAuthHeaders = async (): Promise<HeadersInit> => {
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
  salutation?: 'NONE' | 'MR' | 'MS' | 'DIVERSE';
  formalAddress?: boolean; // true = "Sie", false = "Du"
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  
  // Buyer Preferences
  budgetMin?: number;
  budgetMax?: number;
  preferredType?: string;
  preferredLocation?: string;
  minRooms?: number;
  minArea?: number;
  timeFrame?: string;
  
  // Financing
  financingStatus?: string;
  hasDownPayment?: boolean;
  
  // Lead Source
  source?: string;
  sourceDetails?: string;
  
  // Status & Notes
  status: string;
  notes?: string;
  
  // Relations
  propertyId?: string;
  messages?: Message[];
  
  // Documents
  documents?: DocumentFile[];
  
  createdAt: string;
}

export interface Property {
  id: string;
  title: string;
  address: string;
  zipCode?: string;
  city?: string;
  country?: string;
  district?: string;
  
  // Type & Marketing
  propertyType?: string;
  marketingType?: string;
  
  // Price (legacy + new)
  price?: number; // Legacy
  salePrice?: number;
  rentCold?: number;
  rentWarm?: number;
  additionalCosts?: number;
  deposit?: string;
  commission?: string;
  
  // Areas & Rooms
  rooms?: number; // Legacy
  area?: number; // Legacy
  livingArea?: number;
  usableArea?: number;
  plotArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  
  // Building Info
  yearBuilt?: number;
  yearRenovated?: number;
  condition?: string;
  buildingType?: string;
  floor?: number;
  totalFloors?: number;
  
  // Energy Certificate
  energyCertificateType?: string;
  energyEfficiencyClass?: string;
  energyConsumption?: number;
  primaryEnergySource?: string;
  energyCertificateValidUntil?: string;
  
  // Features
  features?: any;
  
  // Descriptions
  description?: string;
  locationDescription?: string;
  equipmentDescription?: string;
  
  // AI Context
  aiFacts?: string;
  
  // Media
  images?: string[];
  floorplans?: string[];
  videos?: string[];
  virtualTour?: string;
  
  // Status
  status?: string;
  priority?: string;
  
  // Portal Publishing
  publishedPortals?: string[];
  lastSyncedAt?: string;
  
  // Auto-Exposé Template
  defaultExposeTemplateId?: string;
  defaultExposeTemplate?: { id: string; name: string };
  
  // Documents
  documents?: DocumentFile[];
  
  createdAt: string;
}

// Document type
export interface DocumentFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

// Exposé Types
export interface ExposeBlock {
  id: string;
  type: string;
  [key: string]: any;
}

export interface ExposeTemplate {
  id: string;
  name: string;
  blocks: ExposeBlock[];
  theme: string;
  customColors?: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expose {
  id: string;
  propertyId: string;
  property?: Property;
  templateId?: string;
  template?: { id: string; name: string; updatedAt: string };
  createdFromTemplateAt?: string;
  blocks: ExposeBlock[];
  theme: string;
  customColors?: string[];
  status: 'DRAFT' | 'PUBLISHED';
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRenderRequest {
  templateBody: string;
  context: any;
}

export const API_ENDPOINTS = {
  LEADS: '/leads',
  PROPERTIES: '/properties',
  EXPOSE_TEMPLATES: '/expose-templates',
  EXPOSES: '/exposes',
};

export async function fetcher(url: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}${url}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
}

// Fetch with auth for full URLs (used when apiUrl is already included)
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
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
  } catch {
    // Backend not available - silent fail
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

export async function syncUser(): Promise<{ user: any; tenantId: string; needsOnboarding?: boolean }> {
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

export async function sendPresenceHeartbeat() {
  try {
    const headers = await getAuthHeaders();
    await fetch(`${getApiUrl()}/presence/heartbeat`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch {
    // Silently ignore heartbeat failures
  }
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

export async function deleteSeat(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/seats/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to delete user');
  }
  return res.json();
}

// --- Chat ---

export async function getChannels() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/channels`, { headers });
  if (!res.ok) throw new Error('Failed to fetch channels');
  return res.json();
}

export async function createChannel(data: { name: string; description?: string; type?: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/channels`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create channel');
  }
  return res.json();
}

export async function getOrCreateDM(userId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/channels/dm`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to open DM');
  }
  return res.json();
}

export async function deleteChannel(channelId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/channels/${channelId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete channel');
  }
  return res.json();
}

export async function getChannelMessages(channelId: string, before?: string, limit: number = 30) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  const res = await fetch(`${getApiUrl()}/channels/${channelId}/messages?${params}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function sendChannelMessage(channelId: string, content: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function editChannelMessage(channelId: string, messageId: string, content: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to edit message');
  return res.json();
}

export async function deleteChannelMessage(channelId: string, messageId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete message');
  return res.json();
}

export async function getChannelMembers(channelId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/channels/${channelId}/members`, { headers });
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
}

// --- Exposé Templates ---

export async function getExposeTemplates(): Promise<ExposeTemplate[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/expose-templates`, { headers });
  if (!res.ok) throw new Error('Failed to fetch expose templates');
  return res.json();
}

export async function getExposeTemplate(id: string): Promise<ExposeTemplate | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/expose-templates/${id}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function createExposeTemplate(data: Partial<ExposeTemplate>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/expose-templates`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create expose template');
  return res.json();
}

export async function updateExposeTemplate(id: string, data: Partial<ExposeTemplate>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/expose-templates/${id}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update expose template');
  return res.json();
}

export async function deleteExposeTemplate(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/expose-templates/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete expose template');
  return res.json();
}

// --- Exposés (Instances) ---

export async function getExposes(propertyId?: string): Promise<Expose[]> {
  const headers = await getAuthHeaders();
  const url = propertyId 
    ? `${getApiUrl()}/exposes?propertyId=${propertyId}`
    : `${getApiUrl()}/exposes`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('Failed to fetch exposes');
  return res.json();
}

export async function getExpose(id: string): Promise<Expose | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/exposes/${id}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function createExpose(propertyId: string, templateId?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/exposes`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId, templateId }),
  });
  if (!res.ok) throw new Error('Failed to create expose');
  return res.json();
}

export async function updateExpose(id: string, data: Partial<Expose>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/exposes/${id}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update expose');
  return res.json();
}

export async function regenerateExpose(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/exposes/${id}/regenerate`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to regenerate expose');
  return res.json();
}

export async function deleteExpose(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/exposes/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete expose');
  return res.json();
}

// --- Jarvis AI ---

export async function chatWithJarvisForExpose(exposeId: string, message: string, history: { role: string; content: string }[] = []) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/exposes/${exposeId}/chat`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error('Failed to chat with Jarvis');
  return res.json();
}

export async function generatePropertyText(propertyId: string, textType: 'description' | 'headline' | 'highlights' | 'location', options?: {
  tone?: 'professional' | 'luxurious' | 'friendly' | 'modern';
  maxLength?: number;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/properties/${propertyId}/generate-text`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ textType, ...options }),
  });
  if (!res.ok) throw new Error('Failed to generate text');
  return res.json();
}

// --- PDF Export ---

export async function downloadExposePdf(exposeId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/exposes/${exposeId}/pdf`, { headers });
  
  if (!res.ok) throw new Error('Failed to generate PDF');
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expose-${exposeId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function downloadTemplatePdf(templateId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/expose-templates/${templateId}/pdf`, { headers });
  
  if (!res.ok) throw new Error('Failed to generate PDF');
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vorlage-${templateId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// --- Document Management ---

export async function uploadPropertyDocuments(propertyId: string, files: File[]): Promise<DocumentFile[]> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  files.forEach(file => formData.append('documents', file));
  
  const res = await fetch(`${getApiUrl()}/properties/${propertyId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': (headers as Record<string, string>)['Authorization'] || '',
    },
    body: formData
  });
  
  if (!res.ok) throw new Error('Failed to upload documents');
  const data = await res.json();
  return data.documents;
}

export async function deletePropertyDocument(propertyId: string, documentId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/properties/${propertyId}/documents`, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId })
  });
  
  if (!res.ok) throw new Error('Failed to delete document');
}

export async function uploadLeadDocuments(leadId: string, files: File[]): Promise<DocumentFile[]> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  files.forEach(file => formData.append('documents', file));
  
  const res = await fetch(`${getApiUrl()}/leads/${leadId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': (headers as Record<string, string>)['Authorization'] || '',
    },
    body: formData
  });
  
  if (!res.ok) throw new Error('Failed to upload documents');
  const data = await res.json();
  return data.documents;
}

export async function deleteLeadDocument(leadId: string, documentId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiUrl()}/leads/${leadId}/documents`, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId })
  });
  
  if (!res.ok) throw new Error('Failed to delete document');
}
