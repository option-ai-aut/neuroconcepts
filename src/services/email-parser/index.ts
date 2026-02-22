/**
 * Email Parser Lambda
 * 
 * Receives emails from AWS SES via S3 and forwards them to the Orchestrator
 * for processing by Mivo (AI-based parsing).
 * 
 * This Lambda no longer does any parsing itself - it just extracts the raw
 * email data and sends it to /internal/ingest-lead.
 */

import { S3Event, Context } from 'aws-lambda';
import { simpleParser } from 'mailparser';
import * as AWS from 'aws-sdk';
import axios from 'axios';

const s3 = new AWS.S3();

let secretsLoaded = false;
async function loadSecrets() {
  if (secretsLoaded) return;
  secretsLoaded = true;
  const arn = process.env.APP_SECRET_ARN;
  if (!arn || !process.env.AWS_LAMBDA_FUNCTION_NAME) return;
  try {
    const sm = new AWS.SecretsManager();
    const secret = await sm.getSecretValue({ SecretId: arn }).promise();
    if (secret.SecretString) {
      const parsed = JSON.parse(secret.SecretString);
      if (parsed.INTERNAL_API_SECRET) process.env.INTERNAL_API_SECRET = parsed.INTERNAL_API_SECRET;
    }
  } catch (e) {
    console.error('Failed to load secrets:', e);
  }
}

export const handler = async (event: any, context: Context) => {
  console.log('📧 Email Parser Lambda triggered');
  console.log('Event:', JSON.stringify(event, null, 2));

  await loadSecrets();
  const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_API_URL || 'http://localhost:3001';
  const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

  // LOCAL TEST MODE
  if (event.isLocal) {
    console.log('Running in LOCAL test mode');
    await processEmail({
      to: event.to || 'test@leads.immivo.ai',
      from: event.from || 'noreply@immobilienscout24.de',
      subject: event.subject || 'Test Subject',
      text: event.body || event.text || '',
      html: event.html,
      orchestratorUrl: ORCHESTRATOR_URL,
    });
    return { success: true };
  }

  // Process S3 events (from SES)
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    try {
      console.log(`📥 Fetching email from S3: ${bucket}/${key}`);
      
      // 1. Fetch email from S3
      const params = { Bucket: bucket, Key: key };
      const data = await s3.getObject(params).promise();
      
      if (!data.Body) {
        throw new Error('Email body is empty');
      }

      // 2. Parse raw email with mailparser
      const parsed = await simpleParser(data.Body as Buffer);
      
      // 3. Extract all relevant fields including TO (recipient)
      const to = extractRecipient(parsed);
      const from = parsed.from?.text || parsed.from?.value?.[0]?.address || '';
      const subject = parsed.subject || '';
      const text = parsed.text || '';
      const html = typeof parsed.html === 'string' ? parsed.html : undefined;

      console.log(`📧 Email details:`);
      console.log(`   To: ${to}`);
      console.log(`   From: ${from}`);
      console.log(`   Subject: ${subject}`);

      // 4. Send to Orchestrator for Mivo processing
      await processEmail({
        to,
        from,
        subject,
        text,
        html,
        orchestratorUrl: ORCHESTRATOR_URL,
        rawEmailKey: key, // Reference to original email in S3
      });

    } catch (error) {
      console.error('❌ Error processing email:', error);
    }
  }

  return { success: true };
};

/**
 * Extract recipient email address from parsed email
 */
function extractRecipient(parsed: any): string {
  // Try different fields where recipient might be
  if (parsed.to?.value?.[0]?.address) {
    return parsed.to.value[0].address;
  }
  if (parsed.to?.text) {
    // Extract email from text like "Name <email@example.com>"
    const match = parsed.to.text.match(/<([^>]+)>/) || parsed.to.text.match(/([^\s<]+@[^\s>]+)/);
    if (match) return match[1];
    return parsed.to.text;
  }
  // Check envelope recipient (for SES)
  if (parsed.headers?.get('x-original-to')) {
    return parsed.headers.get('x-original-to');
  }
  if (parsed.headers?.get('delivered-to')) {
    return parsed.headers.get('delivered-to');
  }
  return '';
}

interface ProcessEmailParams {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  orchestratorUrl: string;
  rawEmailKey?: string;
}

/**
 * Send email data to Orchestrator for processing
 */
async function processEmail(params: ProcessEmailParams) {
  const { to, from, subject, text, html, orchestratorUrl, rawEmailKey } = params;

  console.log(`📤 Sending email to Orchestrator: ${orchestratorUrl}/internal/ingest-lead`);

  try {
    const response = await axios.post(`${orchestratorUrl}/internal/ingest-lead`, {
      recipientEmail: to,
      from,
      subject,
      text,
      html,
      rawEmailKey,
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INTERNAL_API_SECRET ? { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET } : {}),
      }
    });

    console.log(`✅ Orchestrator response:`, JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to send to Orchestrator:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}
