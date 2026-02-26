/**
 * WorkMailEmailService - Email reading/management via EWS (Exchange Web Services)
 *
 * Authentication strategy (in priority order):
 * 1. EWS Impersonation (recommended): One service account (WORKMAIL_EMAIL + WORKMAIL_PASSWORD)
 *    with an impersonation role in WorkMail reads ALL mailboxes — no per-user setup needed.
 *    Setup (one-time in AWS Console): WorkMail → Organization → Impersonation roles → Create role
 *    → grant "Full Access" to WORKMAIL_EMAIL for all users.
 *
 * 2. Per-mailbox credentials fallback (WORKMAIL_CREDENTIALS JSON in Secrets Manager):
 *    {"dennis.kral@immivo.ai": "pass1", "office@immivo.ai": "pass2"}
 *    Used for SMTP sending since impersonation doesn't cover outbound SMTP.
 */

import {
  ExchangeService,
  ExchangeVersion,
  Uri,
  WebCredentials,
  WellKnownFolderName,
  FolderId,
  ItemView,
  PropertySet,
  BasePropertySet,
  EmailMessageSchema,
  ItemSchema,
  SearchFilter,
  EmailMessage,
  ItemId,
  ImpersonatedUserId,
  ConnectingIdType,
} from 'ews-javascript-api';
import * as nodemailer from 'nodemailer';

const EWS_URL = process.env.WORKMAIL_EWS_URL || 'https://ews.mail.eu-west-1.awsapps.com/EWS/Exchange.asmx';
const SMTP_HOST = process.env.WORKMAIL_SMTP_HOST || 'smtp.mail.eu-west-1.awsapps.com';
const SMTP_PORT = parseInt(process.env.WORKMAIL_SMTP_PORT || '465');

export interface WorkMailCredentials {
  email: string;
  password: string;
}

export interface WorkMailEmail {
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
}

/** Returns the service account credentials (WORKMAIL_EMAIL + WORKMAIL_PASSWORD) */
export function getServiceCreds(): WorkMailCredentials | null {
  const email = process.env.WORKMAIL_EMAIL;
  const password = process.env.WORKMAIL_PASSWORD;
  if (email && password) return { email, password };
  return null;
}

/** Returns true if the service account is configured */
export function hasAnyCredentials(): boolean {
  return !!(process.env.WORKMAIL_EMAIL && process.env.WORKMAIL_PASSWORD);
}

/**
 * Per-mailbox credential lookup (used for SMTP sending).
 * Priority: WORKMAIL_CREDENTIALS JSON → service account (only if same email).
 */
export function getMailboxCredentials(mailboxEmail: string): WorkMailCredentials | null {
  const credsRaw = process.env.WORKMAIL_CREDENTIALS;
  if (credsRaw) {
    try {
      const map: Record<string, string> = JSON.parse(credsRaw);
      const password = map[mailboxEmail.toLowerCase()];
      if (password) return { email: mailboxEmail, password };
    } catch {
      console.error('[WorkMail] WORKMAIL_CREDENTIALS is not valid JSON');
    }
  }
  const svc = getServiceCreds();
  if (svc && svc.email.toLowerCase() === mailboxEmail.toLowerCase()) return svc;
  return null;
}

/**
 * Create an EWS service that reads on behalf of `targetEmail` using impersonation.
 * If targetEmail equals the service account, no impersonation header is needed.
 */
function createImpersonatedService(targetEmail: string): ExchangeService {
  const svc = getServiceCreds();
  if (!svc) throw new Error('WorkMail service account (WORKMAIL_EMAIL/PASSWORD) not configured');

  const service = new ExchangeService(ExchangeVersion.Exchange2010_SP1);
  service.Url = new Uri(EWS_URL);
  service.Credentials = new WebCredentials(svc.email, svc.password);

  // Impersonate the target mailbox (no-op if same as service account)
  if (svc.email.toLowerCase() !== targetEmail.toLowerCase()) {
    service.ImpersonatedUserId = new ImpersonatedUserId(ConnectingIdType.SmtpAddress, targetEmail);
  }

  return service;
}

function extractAddresses(recipients: any): string[] {
  if (!recipients) return [];
  try {
    const count = recipients.Count || 0;
    return Array.from({ length: count }, (_, i) => recipients._getItem?.(i)?.Address || '').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get emails from a mailbox folder using EWS impersonation.
 * No per-mailbox credentials needed — the service account reads on behalf of targetEmail.
 */
export async function getEmails(
  _creds: WorkMailCredentials,
  targetEmail: string,
  folder: 'INBOX' | 'SENT' | 'DRAFTS' | 'TRASH' = 'INBOX',
  limit = 50,
  search?: string,
): Promise<{ emails: WorkMailEmail[]; total: number; error?: string }> {
  const folderMap: Record<string, WellKnownFolderName> = {
    INBOX: WellKnownFolderName.Inbox,
    SENT: WellKnownFolderName.SentItems,
    DRAFTS: WellKnownFolderName.Drafts,
    TRASH: WellKnownFolderName.DeletedItems,
  };

  const service = createImpersonatedService(targetEmail);
  const folderId = new FolderId(folderMap[folder] || WellKnownFolderName.Inbox);

  const view = new ItemView(limit);
  view.PropertySet = new PropertySet(BasePropertySet.FirstClassProperties);

  try {
    let results;
    if (search) {
      const filter = new SearchFilter.ContainsSubstring(ItemSchema.Subject, search);
      results = await service.FindItems(folderId, filter, view);
    } else {
      results = await service.FindItems(folderId, view);
    }

    const emails: WorkMailEmail[] = [];
    for (const item of results.Items) {
      try {
        await item.Load(new PropertySet(BasePropertySet.FirstClassProperties));
        const email = item as any;
        const rawBody: string = email.Body?.Text || '';
        const isHtml = email.Body?.BodyType === 1 || rawBody.trimStart().startsWith('<') || rawBody.includes('</');
        emails.push({
          id: email.Id?.UniqueId || '',
          from: email.From?.Address || email.Sender?.Address || '',
          fromName: email.From?.Name || email.Sender?.Name || '',
          to: extractAddresses(email.ToRecipients),
          cc: extractAddresses(email.CcRecipients),
          subject: email.Subject || '',
          bodyHtml: isHtml ? rawBody : '',
          bodyText: isHtml ? rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : rawBody,
          isRead: email.IsRead ?? true,
          hasAttachments: email.HasAttachments || false,
          receivedAt: email.DateTimeReceived?.ToISOString?.() || email.DateTimeSent?.ToISOString?.() || new Date().toISOString(),
          folder,
        });
      } catch (loadErr: any) {
        console.error('[WorkMail] Failed to load item:', loadErr?.message);
      }
    }

    return { emails, total: results.TotalCount || emails.length };
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error(`[WorkMail] Failed to read ${targetEmail} (${folder}):`, msg);
    return {
      emails: [],
      total: 0,
      error: msg.includes('Access is denied') || msg.includes('ErrorImpersonateUserDenied')
        ? `Impersonation für ${targetEmail} nicht erlaubt. Bitte WorkMail-Impersonation-Rolle einrichten (einmalig).`
        : msg,
    };
  }
}

/**
 * Mark an email as read/unread using impersonation.
 */
export async function markEmailRead(
  _creds: WorkMailCredentials,
  emailId: string,
  isRead: boolean,
  mailboxEmail?: string,
): Promise<boolean> {
  try {
    const service = createImpersonatedService(mailboxEmail || process.env.WORKMAIL_EMAIL || '');
    const email = await EmailMessage.Bind(service, new ItemId(emailId));
    email.IsRead = isRead;
    await email.Update(1);
    return true;
  } catch (error: any) {
    console.error('[WorkMail] Failed to mark read:', error?.message);
    return false;
  }
}

/**
 * Get unread count using impersonation.
 */
export async function getUnreadCount(
  _creds: WorkMailCredentials,
  targetEmail: string,
): Promise<number> {
  try {
    const service = createImpersonatedService(targetEmail);
    const folderId = new FolderId(WellKnownFolderName.Inbox);
    const filter = new SearchFilter.IsEqualTo(EmailMessageSchema.IsRead, false);
    const view = new ItemView(1);
    const results = await service.FindItems(folderId, filter, view);
    return results.TotalCount || 0;
  } catch (error: any) {
    console.error(`[WorkMail] Failed to get unread count for ${targetEmail}:`, error?.message);
    return 0;
  }
}

export interface SendEmailOptions {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  replyToMessageId?: string;
}

/**
 * Send an email via WorkMail SMTP.
 * Uses per-mailbox credentials from WORKMAIL_CREDENTIALS if available,
 * otherwise falls back to the service account (only works for the service account's own address).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const senderCreds = getMailboxCredentials(opts.from) || getServiceCreds();
  if (!senderCreds) {
    return { success: false, error: 'WorkMail service account nicht konfiguriert' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: senderCreds.email, pass: senderCreds.password },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `${opts.from} <${opts.from}>`,
      to: opts.to,
      cc: opts.cc,
      bcc: opts.bcc,
      subject: opts.subject,
      html: opts.bodyHtml,
      text: opts.bodyText || (opts.bodyHtml ? opts.bodyHtml.replace(/<[^>]*>/g, ' ').trim() : ''),
    };
    if (opts.replyToMessageId) {
      (mailOptions as any).inReplyTo = opts.replyToMessageId;
      (mailOptions as any).references = opts.replyToMessageId;
    }

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error: any) {
    console.error('[WorkMail] Failed to send:', error?.message);
    return { success: false, error: error?.message || 'Fehler beim Senden' };
  }
}

export default { getEmails, markEmailRead, getUnreadCount, sendEmail, getMailboxCredentials, hasAnyCredentials };
