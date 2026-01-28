import { S3Event, Context } from 'aws-lambda';
import { simpleParser } from 'mailparser';
import * as AWS from 'aws-sdk';
import axios from 'axios';
import { EmailParser, ExtractedLead } from './parsers/types';
import { ImmoScoutParser } from './parsers/ImmoScoutParser';
import { WillhabenParser } from './parsers/WillhabenParser';
import { ImmoweltParser } from './parsers/ImmoweltParser';

import { ImmoScoutCHParser } from './parsers/ImmoScoutCHParser';
import { HomegateParser } from './parsers/HomegateParser';
import { KleinanzeigenParser } from './parsers/KleinanzeigenParser';

const s3 = new AWS.S3();

// Strategy Registry
const parsers: EmailParser[] = [
  new ImmoScoutParser(),
  new WillhabenParser(),
  new ImmoweltParser(),
  new ImmoScoutCHParser(),
  new HomegateParser(),
  new KleinanzeigenParser()
];

export const handler = async (event: any, context: Context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Get Orchestrator API URL from env
  const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_API_URL || 'http://localhost:3001';

  // LOCAL TEST MODE
  if (event.isLocal) {
    console.log('Running in LOCAL mode');
    const text = event.body;
    const subject = event.subject;
    const from = event.from;
    
    await processEmail(text, subject, from, ORCHESTRATOR_URL);
    return;
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
      const html = parsed.html || undefined; // Pass HTML if available
      const from = parsed.from?.text || '';

      await processEmail(text, subject, from, ORCHESTRATOR_URL, html);

    } catch (error) {
      console.error('Error processing email:', error);
    }
  }
};

async function processEmail(text: string, subject: string, from: string, orchestratorUrl: string, html?: string) {
  console.log('Processing email from:', from);
  console.log('Subject:', subject);

  // 3. Find Matching Parser
  let lead: ExtractedLead | null = null;
  const parser = parsers.find(p => p.canParse(from, subject));

  if (parser) {
    console.log(`Using parser: ${parser.constructor.name}`);
    lead = parser.parse(text, subject, html);
  } else {
    console.log('No specific parser found. Using generic fallback.');
    // Fallback: Try to extract from standard email
    lead = {
      email: extractEmail(text) || 'unknown@lead.com',
      firstName: 'Unbekannt',
      lastName: 'Lead',
      message: text.substring(0, 500), // Truncate message
      source: 'Other'
    };
  }

  if (lead) {
    console.log('Extracted Lead:', JSON.stringify(lead, null, 2));

    // 4. Send to Orchestrator
    try {
      await axios.post(`${orchestratorUrl}/leads`, {
        ...lead,
        tenantId: 'default-tenant' 
      });
      console.log('Lead sent to Orchestrator');
    } catch (error) {
      console.error('Failed to send lead to orchestrator:', error);
    }
  }
}

// Helper for generic extraction
function extractEmail(text: string): string | null {
  const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
  return match ? match[1] : null;
}
