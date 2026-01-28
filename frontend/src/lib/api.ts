import { getRuntimeConfig } from '@/components/EnvProvider';

const getApiUrl = () => {
  const config = getRuntimeConfig();
  return config.apiUrl || 'https://1rnmc2z8eg.execute-api.eu-central-1.amazonaws.com/dev';
};

export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  createdAt: string;
  propertyId?: string;
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

export async function getLeads(): Promise<Lead[]> {
  try {
    const res = await fetch(`${getApiUrl()}/leads`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
}

export async function getProperties(): Promise<Property[]> {
  try {
    const res = await fetch(`${getApiUrl()}/properties`);
    if (!res.ok) throw new Error('Failed to fetch properties');
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  try {
    const res = await fetch(`${getApiUrl()}/leads/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

export async function renderTemplate(data: TemplateRenderRequest) {
  const res = await fetch(`${getApiUrl()}/templates/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createProperty(data: any) {
  const res = await fetch(`${getApiUrl()}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
