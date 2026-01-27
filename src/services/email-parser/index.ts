import { S3Event, Context } from 'aws-lambda';
import { simpleParser } from 'mailparser';
import * as AWS from 'aws-sdk';
import axios from 'axios';

const s3 = new AWS.S3();

interface ExtractedLead {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  message?: string;
  propertyId?: string; // Extracted from subject or body (e.g. "Objekt 123")
  source: 'ImmoScout24' | 'Willhaben' | 'Other';
}

export const handler = async (event: S3Event, context: Context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Get Orchestrator API URL from env
  const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_API_URL;
  if (!ORCHESTRATOR_URL) {
    throw new Error('ORCHESTRATOR_API_URL env var is missing');
  }

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    try {
      // 1. Fetch email from S3
      const params = { Bucket: bucket, Key: key };
      const data = await s3.getObject(params).promise();
      
      if (!data.Body) {
        throw new Error('Email body is empty');
      }

      // 2. Parse Email
      const parsed = await simpleParser(data.Body as Buffer);
      const subject = parsed.subject || '';
      const text = parsed.text || '';
      const from = parsed.from?.text || '';

      console.log('Processing email from:', from);
      console.log('Subject:', subject);

      // 3. Extract Lead Data
      let lead: ExtractedLead | null = null;

      if (from.includes('immobilienscout24.de')) {
        lead = parseImmoScout(text, subject);
      } else if (from.includes('willhaben.at')) {
        lead = parseWillhaben(text, subject);
      } else {
        // Fallback: Try to extract from standard email
        lead = {
          email: parsed.from?.value?.[0]?.address || '',
          firstName: '',
          lastName: parsed.from?.value?.[0]?.name || '',
          message: text,
          source: 'Other'
        };
      }

      if (lead) {
        console.log('Extracted Lead:', JSON.stringify(lead, null, 2));

        // 4. Send to Orchestrator
        // Note: In a real scenario, we might need an API Key for authentication
        await axios.post(`${ORCHESTRATOR_URL}/leads`, {
          ...lead,
          tenantId: 'default-tenant' // TODO: Determine tenant from recipient email (e.g. immo-meier@system.com)
        });
        console.log('Lead sent to Orchestrator');
      }

    } catch (error) {
      console.error('Error processing email:', error);
      // Don't throw error to avoid S3 retry loop for malformed emails, just log it.
      // In production, move to Dead Letter Queue.
    }
  }
};

function parseImmoScout(text: string, subject: string): ExtractedLead {
  // Example logic - needs to be refined with real email samples
  const nameMatch = text.match(/Name:\s*(.*)/i);
  const emailMatch = text.match(/E-Mail:\s*(.*)/i);
  const phoneMatch = text.match(/Telefon:\s*(.*)/i);
  const messageMatch = text.match(/Nachricht:\s*([\s\S]*?)(\n\n|$)/i);

  // Extract Property ID from Subject (e.g. "Anfrage zu Objekt 12345")
  const propertyIdMatch = subject.match(/Objekt\s*(\d+)/i) || subject.match(/ID\s*(\d+)/i);

  return {
    firstName: nameMatch ? nameMatch[1].split(' ')[0] : '',
    lastName: nameMatch ? nameMatch[1].split(' ').slice(1).join(' ') : '',
    email: emailMatch ? emailMatch[1].trim() : '',
    phone: phoneMatch ? phoneMatch[1].trim() : undefined,
    message: messageMatch ? messageMatch[1].trim() : undefined,
    propertyId: propertyIdMatch ? propertyIdMatch[1] : undefined,
    source: 'ImmoScout24'
  };
}

function parseWillhaben(text: string, subject: string): ExtractedLead {
  // Placeholder logic for Willhaben
  const nameMatch = text.match(/Anfrage von:\s*(.*)/i);
  const emailMatch = text.match(/E-Mail:\s*(.*)/i);
  
  return {
    firstName: nameMatch ? nameMatch[1].split(' ')[0] : '',
    lastName: nameMatch ? nameMatch[1].split(' ').slice(1).join(' ') : '',
    email: emailMatch ? emailMatch[1].trim() : '',
    message: text,
    source: 'Willhaben'
  };
}
