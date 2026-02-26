/**
 * SystemEmailService - Sends system emails via Resend
 * Used for: Registration confirmations, password resets, Mivo notifications, escalations
 * NOT for lead communication (that uses EmailService with user's connected provider)
 */

import { Resend } from 'resend';

// Initialize Resend client (lazy — created on first use)
let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.SES_FROM_EMAIL || 'noreply@immivo.ai';
const FROM_NAME = process.env.RESEND_FROM_NAME || process.env.SES_FROM_NAME || 'Immivo';
const EMAIL_ENABLED = process.env.RESEND_ENABLED !== 'false' && process.env.SES_ENABLED !== 'false';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

/**
 * Send a system email via Resend
 */
export async function sendSystemEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, html, text, replyTo, attachments } = params;
  const recipients = Array.isArray(to) ? to : [to];

  // Log in development mode
  if (!EMAIL_ENABLED) {
    console.log('📧 [EMAIL DISABLED] Would send email:');
    console.log('   To:', recipients.join(', '));
    console.log('   Subject:', subject);
    console.log('   Body preview:', html.substring(0, 200) + '...');
    return true;
  }

  try {
    const resend = getResend();

    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipients,
      subject,
      html,
      ...(text && { text }),
      ...(replyTo && { replyTo }),
      ...(attachments && attachments.length > 0 && {
        attachments: attachments.map(a => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString('base64'),
        })),
      }),
    });

    if (error) {
      console.error('📧 Resend error:', error);
      return false;
    }

    console.log('📧 Email sent successfully to:', recipients.join(', '));
    return true;
  } catch (error: any) {
    console.error('📧 Failed to send email:', error.message);
    // Don't throw - email failures shouldn't break the app flow
    return false;
  }
}

// ============================================
// Email Templates
// ============================================

/**
 * Mivo Question Email - When Mivo needs user input
 */
export function renderMivoQuestionEmail(params: {
  userName: string;
  question: string;
  leadName?: string;
  propertyTitle?: string;
  actionUrl: string;
}): string {
  const { userName, question, leadName, propertyTitle, actionUrl } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; border-radius: 16px 16px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Mivo benötigt deine Hilfe</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
    <p style="margin-top: 0;">Hallo ${userName},</p>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">${question}</p>
    </div>
    
    ${leadName ? `<p><strong>Lead:</strong> ${leadName}</p>` : ''}
    ${propertyTitle ? `<p><strong>Objekt:</strong> ${propertyTitle}</p>` : ''}
    
    <a href="${actionUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px;">
      Jetzt antworten
    </a>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
      Diese Nachricht wurde automatisch von Mivo gesendet.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Reminder Email - 24h reminder for pending actions
 */
export function renderReminderEmail(params: {
  userName: string;
  question: string;
  hoursWaiting: number;
  actionUrl: string;
}): string {
  const { userName, question, hoursWaiting, actionUrl } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f59e0b; padding: 30px; border-radius: 16px 16px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Erinnerung: Mivo wartet auf dich</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
    <p style="margin-top: 0;">Hallo ${userName},</p>
    
    <p>Mivo wartet seit <strong>${hoursWaiting} Stunden</strong> auf deine Antwort:</p>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">${question}</p>
    </div>
    
    <p style="color: #dc2626; font-weight: 600;">
      Ohne deine Antwort kann Mivo nicht fortfahren.
    </p>
    
    <a href="${actionUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px;">
      Jetzt antworten
    </a>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escalation Email - When action is escalated to admin
 */
export function renderEscalationEmail(params: {
  adminName: string;
  agentName: string;
  question: string;
  hoursWaiting: number;
  leadName?: string;
  actionUrl: string;
}): string {
  const { adminName, agentName, question, hoursWaiting, leadName, actionUrl } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #dc2626; padding: 30px; border-radius: 16px 16px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Eskalation: Keine Antwort von ${agentName}</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
    <p style="margin-top: 0;">Hallo ${adminName},</p>
    
    <p><strong>${agentName}</strong> hat seit <strong>${hoursWaiting} Stunden</strong> nicht auf folgende Mivo-Anfrage reagiert:</p>
    
    <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-weight: 600; color: #991b1b;">${question}</p>
    </div>
    
    ${leadName ? `<p><strong>Betroffener Lead:</strong> ${leadName}</p>` : ''}
    
    <p>Bitte übernimm diese Anfrage oder kontaktiere ${agentName}.</p>
    
    <a href="${actionUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px;">
      Anfrage übernehmen
    </a>
  </div>
</body>
</html>
  `.trim();
}

/**
 * New Lead Email - Notification when a new lead comes in
 */
export function renderNewLeadEmail(params: {
  userName: string;
  leadName: string;
  leadEmail: string;
  propertyTitle?: string;
  message?: string;
  actionUrl: string;
}): string {
  const { userName, leadName, leadEmail, propertyTitle, message, actionUrl } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Neuer Lead eingegangen!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
    <p style="margin-top: 0;">Hallo ${userName},</p>
    
    <p>Ein neuer Interessent hat sich gemeldet:</p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${leadName}</p>
      <p style="margin: 0 0 8px 0;"><strong>E-Mail:</strong> ${leadEmail}</p>
      ${propertyTitle ? `<p style="margin: 0 0 8px 0;"><strong>Objekt:</strong> ${propertyTitle}</p>` : ''}
    </div>
    
    ${message ? `
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-style: italic; color: #1e40af;">"${message.substring(0, 300)}${message.length > 300 ? '...' : ''}"</p>
    </div>
    ` : ''}
    
    <a href="${actionUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px;">
      Lead ansehen
    </a>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Lead Response Email - When a lead replies
 */
export function renderLeadResponseEmail(params: {
  userName: string;
  leadName: string;
  propertyTitle?: string;
  message: string;
  actionUrl: string;
}): string {
  const { userName, leadName, propertyTitle, message, actionUrl } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 16px 16px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">📬 ${leadName} hat geantwortet</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
    <p style="margin-top: 0;">Hallo ${userName},</p>
    
    <p><strong>${leadName}</strong> hat auf deine Nachricht geantwortet${propertyTitle ? ` (${propertyTitle})` : ''}:</p>
    
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; white-space: pre-wrap;">${message.substring(0, 500)}${message.length > 500 ? '...' : ''}</p>
    </div>
    
    <a href="${actionUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px;">
      Konversation öffnen
    </a>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate an ICS calendar invite as a string (RFC 5545)
 */
export function generateIcs(params: {
  uid: string;
  subject: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  organizer?: string;
  attendees?: string[];
}): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Immivo AI//NONSGML//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${params.uid}@immivo.ai`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(params.start)}`,
    `DTEND:${fmt(params.end)}`,
    `SUMMARY:${esc(params.subject)}`,
  ];
  if (params.description) lines.push(`DESCRIPTION:${esc(params.description)}`);
  if (params.location) lines.push(`LOCATION:${esc(params.location)}`);
  if (params.organizer) lines.push(`ORGANIZER;CN=Immivo AI:MAILTO:${params.organizer}`);
  for (const a of params.attendees || []) {
    lines.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:MAILTO:${a}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export default {
  sendSystemEmail,
  generateIcs,
  renderMivoQuestionEmail,
  renderReminderEmail,
  renderEscalationEmail,
  renderNewLeadEmail,
  renderLeadResponseEmail
};
