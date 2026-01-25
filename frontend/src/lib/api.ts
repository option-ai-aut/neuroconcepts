const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://1rnmc2z8eg.execute-api.eu-central-1.amazonaws.com/dev';

export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  createdAt: string;
}

export async function getLeads(): Promise<Lead[]> {
  // Mock data for now if API is empty
  try {
    const res = await fetch(`${API_URL}/leads`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createLead(data: any) {
  const res = await fetch(`${API_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
