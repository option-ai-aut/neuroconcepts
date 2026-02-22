/**
 * EmailSyncService - Syncs emails from Gmail/Outlook to local database
 * Handles: Fetching, storing, and linking emails to leads
 */

import { PrismaClient, EmailFolder, EmailProvider } from '@prisma/client';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { encryptionService } from './EncryptionService';
import EmailResponseHandler from './EmailResponseHandler';

let prisma: PrismaClient;

export function setEmailSyncPrisma(client: PrismaClient) {
  prisma = client;
}

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

// Helper function to get config at runtime
const getGoogleEmailConfig = () => ({
  clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_EMAIL_REDIRECT_URI || 'http://localhost:3001/email/gmail/callback'
});

interface EmailData {
  messageId: string;
  threadId?: string;
  from: string;
  fromName?: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  folder: EmailFolder;
  isRead: boolean;
  hasAttachments: boolean;
  attachments?: any[];
  receivedAt: Date;
  provider: EmailProvider;
}

export class EmailSyncService {
  /**
   * Sync Gmail emails for a tenant
   */
  static async syncGmail(tenantId: string): Promise<{ synced: number; errors: string[] }> {
    console.log(`📧 Starting Gmail sync for tenant ${tenantId}...`);
    
    const settings = await getPrisma().tenantSettings.findUnique({
      where: { tenantId }
    });

    if (!settings?.gmailConfig) {
      console.log('📧 Gmail not configured for this tenant');
      return { synced: 0, errors: ['Gmail not configured'] };
    }

    const config = settings.gmailConfig as any;
    let accessToken = config.accessToken;
    let refreshToken = config.refreshToken;

    // Decrypt tokens if encrypted
    try {
      accessToken = encryptionService.decrypt(accessToken);
    } catch {
      // Token might not be encrypted
    }
    
    try {
      refreshToken = encryptionService.decrypt(refreshToken);
    } catch {
      // Token might not be encrypted
    }

    console.log(`📧 Gmail tokens loaded, accessToken length: ${accessToken?.length || 0}`);

    const googleConfig = getGoogleEmailConfig();
    const oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const errors: string[] = [];
    let synced = 0;

    try {
      // Get last sync time
      const lastEmail = await getPrisma().email.findFirst({
        where: { tenantId, provider: 'GMAIL' },
        orderBy: { receivedAt: 'desc' }
      });

      console.log(`📧 Fetching Gmail messages...`);
      
      // Fetch messages from inbox - get more emails on first sync
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 100,  // Increased from 50
        labelIds: ['INBOX'],
        q: lastEmail?.receivedAt ? `after:${Math.floor(lastEmail.receivedAt.getTime() / 1000)}` : undefined
      });

      const messages = response.data.messages || [];
      console.log(`📧 Gmail: Found ${messages.length} messages in inbox`);
      
      if (messages.length === 0) {
        console.log('📧 No messages found in Gmail inbox');
      }

      for (const msg of messages) {
        try {
          // Check if already synced
          const existing = await getPrisma().email.findFirst({
            where: { tenantId, messageId: msg.id }
          });

          if (existing) continue;

          // Fetch full message
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full'
          });

          const emailData = this.parseGmailMessage(fullMessage.data);
          
          // Save to database
          const email = await getPrisma().email.create({
            data: {
              tenantId,
              ...emailData
            }
          });

          // Try to link to lead
          await this.linkEmailToLead(email.id, tenantId, emailData.from, emailData.fromName);

          synced++;
        } catch (error: any) {
          errors.push(`Message ${msg.id}: ${error.message}`);
        }
      }

      // Also sync sent folder
      const sentResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        labelIds: ['SENT']
      });

      for (const msg of sentResponse.data.messages || []) {
        try {
          const existing = await getPrisma().email.findFirst({
            where: { tenantId, messageId: msg.id }
          });

          if (existing) continue;

          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full'
          });

          const emailData = this.parseGmailMessage(fullMessage.data);
          emailData.folder = 'SENT';

          await getPrisma().email.create({
            data: {
              tenantId,
              ...emailData
            }
          });

          synced++;
        } catch (error: any) {
          errors.push(`Sent message ${msg.id}: ${error.message}`);
        }
      }

    } catch (error: any) {
      console.error('❌ Gmail sync error:', error);
      errors.push(`Gmail sync error: ${error.message}`);
    }

    console.log(`📧 Gmail sync complete: ${synced} emails synced, ${errors.length} errors`);
    if (errors.length > 0) {
      console.log('📧 Gmail errors:', errors);
    }
    return { synced, errors };
  }

  /**
   * Parse Gmail message into our format
   */
  private static parseGmailMessage(message: any): EmailData {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const from = getHeader('From');
    const fromMatch = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
    const fromName = fromMatch?.[1]?.trim();
    const fromEmail = fromMatch?.[2]?.trim() || from;

    const to = getHeader('To').split(',').map((e: string) => e.trim()).filter(Boolean);
    const cc = getHeader('Cc').split(',').map((e: string) => e.trim()).filter(Boolean);

    // Get body
    let bodyHtml = '';
    let bodyText = '';

    // Collect inline images keyed by Content-ID for cid: substitution
    const inlineImages: Record<string, string> = {};
    const MAX_INLINE_IMAGE_BYTES = 500 * 1024; // 500 KB limit per image

    const extractBody = (parts: any[]): void => {
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType?.startsWith('image/') && part.body?.data) {
          // Extract inline images — parts with a Content-ID header are cid: references
          const partHeaders: any[] = part.headers || [];
          const contentId = partHeaders.find((h: any) => h.name.toLowerCase() === 'content-id')?.value;
          if (contentId) {
            const rawData = part.body.data as string;
            const byteSize = Math.ceil(rawData.length * 0.75); // base64url → approx bytes
            if (byteSize <= MAX_INLINE_IMAGE_BYTES) {
              // Content-ID can be wrapped in <...>
              const cleanCid = contentId.replace(/^<|>$/g, '').trim();
              // Gmail uses base64url encoding; convert to standard base64 for data URLs
              const base64 = rawData.replace(/-/g, '+').replace(/_/g, '/');
              inlineImages[cleanCid] = `data:${part.mimeType};base64,${base64}`;
            }
          }
        } else if (part.parts) {
          extractBody(part.parts);
        }
      }
    };

    if (message.payload?.parts) {
      extractBody(message.payload.parts);
    } else if (message.payload?.body?.data) {
      const content = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
      if (message.payload.mimeType === 'text/html') {
        bodyHtml = content;
      } else {
        bodyText = content;
      }
    }

    // Replace cid: references in HTML with base64 data URLs so images display without external requests
    if (bodyHtml && Object.keys(inlineImages).length > 0) {
      for (const [cid, dataUrl] of Object.entries(inlineImages)) {
        // Escape special regex chars in the CID, match both cid:XXX and cid:XXX with optional spaces
        const escaped = cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        bodyHtml = bodyHtml.replace(new RegExp(`cid:${escaped}`, 'gi'), dataUrl);
      }
    }

    // hasAttachments: true only for real (non-inline) attachments
    const hasAttachments = (message.payload?.parts || []).some(
      (p: any) => p.filename && p.filename.length > 0 && !p.headers?.some(
        (h: any) => h.name.toLowerCase() === 'content-disposition' && h.value.startsWith('inline')
      )
    );

    return {
      messageId: message.id,
      threadId: message.threadId,
      from: fromEmail,
      fromName,
      to,
      cc,
      subject: getHeader('Subject'),
      bodyHtml,
      bodyText,
      folder: 'INBOX',
      isRead: !message.labelIds?.includes('UNREAD'),
      hasAttachments,
      receivedAt: new Date(parseInt(message.internalDate)),
      provider: 'GMAIL'
    };
  }

  /**
   * Sync Outlook emails for a tenant
   */
  static async syncOutlook(tenantId: string): Promise<{ synced: number; errors: string[] }> {
    const settings = await getPrisma().tenantSettings.findUnique({
      where: { tenantId }
    });

    if (!settings?.outlookMailConfig) {
      return { synced: 0, errors: ['Outlook not configured'] };
    }

    const config = settings.outlookMailConfig as any;
    let accessToken = config.accessToken;

    // Decrypt token if encrypted
    try {
      accessToken = encryptionService.decrypt(accessToken);
    } catch {
      // Token might not be encrypted
    }

    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    const errors: string[] = [];
    let synced = 0;

    try {
      // Fetch inbox messages
      const response = await client
        .api('/me/mailFolders/inbox/messages')
        .top(50)
        .select('id,conversationId,from,toRecipients,ccRecipients,subject,body,bodyPreview,receivedDateTime,isRead,hasAttachments')
        .orderby('receivedDateTime DESC')
        .get();

      const messages = response.value || [];
      console.log(`📧 Outlook: Found ${messages.length} messages to sync`);

      for (const msg of messages) {
        try {
          // Check if already synced
          const existing = await getPrisma().email.findFirst({
            where: { tenantId, messageId: msg.id }
          });

          if (existing) continue;

          const emailData = this.parseOutlookMessage(msg);

          const email = await getPrisma().email.create({
            data: {
              tenantId,
              ...emailData
            }
          });

          // Try to link to lead
          await this.linkEmailToLead(email.id, tenantId, emailData.from, emailData.fromName);

          synced++;
        } catch (error: any) {
          errors.push(`Message ${msg.id}: ${error.message}`);
        }
      }

      // Also sync sent folder
      const sentResponse = await client
        .api('/me/mailFolders/sentItems/messages')
        .top(50)
        .select('id,conversationId,from,toRecipients,ccRecipients,subject,body,bodyPreview,sentDateTime,isRead,hasAttachments')
        .orderby('sentDateTime DESC')
        .get();

      for (const msg of sentResponse.value || []) {
        try {
          const existing = await getPrisma().email.findFirst({
            where: { tenantId, messageId: msg.id }
          });

          if (existing) continue;

          const emailData = this.parseOutlookMessage(msg);
          emailData.folder = 'SENT';
          emailData.receivedAt = new Date(msg.sentDateTime);

          await getPrisma().email.create({
            data: {
              tenantId,
              ...emailData
            }
          });

          synced++;
        } catch (error: any) {
          errors.push(`Sent message ${msg.id}: ${error.message}`);
        }
      }

    } catch (error: any) {
      errors.push(`Outlook sync error: ${error.message}`);
    }

    console.log(`📧 Outlook sync complete: ${synced} emails synced, ${errors.length} errors`);
    return { synced, errors };
  }

  /**
   * Parse Outlook message into our format
   */
  private static parseOutlookMessage(msg: any): EmailData {
    const from = msg.from?.emailAddress?.address || '';
    const fromName = msg.from?.emailAddress?.name;
    const to = (msg.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
    const cc = (msg.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);

    return {
      messageId: msg.id,
      threadId: msg.conversationId,
      from,
      fromName,
      to,
      cc,
      subject: msg.subject || '',
      bodyHtml: msg.body?.contentType === 'html' ? msg.body.content : undefined,
      bodyText: msg.body?.contentType === 'text' ? msg.body.content : msg.bodyPreview,
      folder: 'INBOX',
      isRead: msg.isRead || false,
      hasAttachments: msg.hasAttachments || false,
      receivedAt: new Date(msg.receivedDateTime),
      provider: 'OUTLOOK'
    };
  }

  /**
   * Link an email to a lead if possible
   */
  private static async linkEmailToLead(
    emailId: string,
    tenantId: string,
    fromEmail: string,
    fromName?: string
  ): Promise<void> {
    try {
      const lead = await EmailResponseHandler.findLeadByEmailOrName(fromEmail, fromName, tenantId);
      
      if (lead) {
        await getPrisma().email.update({
          where: { id: emailId },
          data: { leadId: lead.id }
        });
        console.log(`📧 Linked email ${emailId} to lead ${lead.id}`);
      }
    } catch (error: any) {
      console.error(`Failed to link email to lead: ${error.message}`);
    }
  }

  /**
   * Sync all configured email providers for a tenant
   */
  static async syncAll(tenantId: string): Promise<{ gmail: any; outlook: any }> {
    const [gmail, outlook] = await Promise.all([
      this.syncGmail(tenantId),
      this.syncOutlook(tenantId)
    ]);

    return { gmail, outlook };
  }

  /**
   * Get sync status for a tenant
   */
  static async getSyncStatus(tenantId: string) {
    const settings = await getPrisma().tenantSettings.findUnique({
      where: { tenantId }
    });

    const lastGmailEmail = await getPrisma().email.findFirst({
      where: { tenantId, provider: 'GMAIL' },
      orderBy: { receivedAt: 'desc' }
    });

    const lastOutlookEmail = await getPrisma().email.findFirst({
      where: { tenantId, provider: 'OUTLOOK' },
      orderBy: { receivedAt: 'desc' }
    });

    const totalEmails = await getPrisma().email.count({
      where: { tenantId }
    });

    return {
      gmail: {
        connected: !!settings?.gmailConfig,
        lastSync: lastGmailEmail?.receivedAt
      },
      outlook: {
        connected: !!settings?.outlookMailConfig,
        lastSync: lastOutlookEmail?.receivedAt
      },
      totalEmails
    };
  }
  /**
   * Mark a Gmail message as read/unread by modifying labels
   */
  static async markGmailAsRead(tenantId: string, messageId: string, isRead: boolean): Promise<boolean> {
    const prisma = getPrisma();
    const config = getGoogleEmailConfig();
    
    try {
      const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
      const gmailConfig = settings?.gmailConfig as any;
      if (!gmailConfig?.refreshToken) return false;
      
      const { google } = await import('googleapis');
      const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ refresh_token: gmailConfig.refreshToken });
      
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: isRead ? [] : ['UNREAD'],
          removeLabelIds: isRead ? ['UNREAD'] : [],
        },
      });
      
      return true;
    } catch (error) {
      console.error('Failed to mark Gmail message as read:', error);
      return false;
    }
  }
}

export default EmailSyncService;
