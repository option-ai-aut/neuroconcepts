/**
 * WorkMailEmailService - Email reading/management via EWS (Exchange Web Services)
 * Reads emails from AWS WorkMail mailboxes.
 */

import {
  ExchangeService,
  ExchangeVersion,
  Uri,
  WebCredentials,
  WellKnownFolderName,
  FolderId,
  Mailbox,
  ItemView,
  PropertySet,
  BasePropertySet,
  EmailMessageSchema,
  ItemSchema,
  SortDirection,
  SearchFilter,
  EmailMessage,
  ItemId,
} from 'ews-javascript-api';

const EWS_URL = process.env.WORKMAIL_EWS_URL || 'https://ews.mail.eu-west-1.awsapps.com/EWS/Exchange.asmx';

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

function createService(creds: WorkMailCredentials): ExchangeService {
  const service = new ExchangeService(ExchangeVersion.Exchange2013_SP1);
  service.Url = new Uri(EWS_URL);
  service.Credentials = new WebCredentials(creds.email, creds.password);
  return service;
}

/**
 * Get emails from a mailbox folder
 */
export async function getEmails(
  creds: WorkMailCredentials,
  targetEmail: string,
  folder: 'INBOX' | 'SENT' | 'DRAFTS' | 'TRASH' = 'INBOX',
  limit = 50,
  search?: string,
): Promise<{ emails: WorkMailEmail[]; total: number }> {
  const service = createService(creds);

  const folderMap: Record<string, WellKnownFolderName> = {
    INBOX: WellKnownFolderName.Inbox,
    SENT: WellKnownFolderName.SentItems,
    DRAFTS: WellKnownFolderName.Drafts,
    TRASH: WellKnownFolderName.DeletedItems,
  };

  const wellKnownFolder = folderMap[folder] || WellKnownFolderName.Inbox;

  let folderId: FolderId;
  if (targetEmail && targetEmail !== creds.email) {
    folderId = new FolderId(wellKnownFolder, new Mailbox(targetEmail));
  } else {
    folderId = new FolderId(wellKnownFolder);
  }

  const view = new ItemView(limit);
  view.PropertySet = new PropertySet(
    BasePropertySet.FirstClassProperties,
  );

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
        // Load full details
        await item.Load(new PropertySet(BasePropertySet.FirstClassProperties));
        
        const email = item as any;
        emails.push({
          id: email.Id?.UniqueId || '',
          from: email.From?.Address || email.Sender?.Address || '',
          fromName: email.From?.Name || email.Sender?.Name || '',
          to: email.ToRecipients?.GetEnumerator?.()
            ? Array.from({ length: email.ToRecipients.Count }, (_, i) => email.ToRecipients._getItem(i)?.Address || '').filter(Boolean)
            : [],
          cc: email.CcRecipients?.GetEnumerator?.()
            ? Array.from({ length: email.CcRecipients.Count }, (_, i) => email.CcRecipients._getItem(i)?.Address || '').filter(Boolean)
            : [],
          subject: email.Subject || '',
          bodyHtml: email.Body?.Text || '',
          bodyText: email.Body?.Text?.replace(/<[^>]*>/g, '') || '',
          isRead: email.IsRead ?? true,
          hasAttachments: email.HasAttachments || false,
          receivedAt: email.DateTimeReceived?.ToISOString?.() || email.DateTimeSent?.ToISOString?.() || new Date().toISOString(),
          folder,
        });
      } catch (loadErr) {
        console.error('Failed to load email item:', loadErr);
      }
    }

    return { emails, total: results.TotalCount || emails.length };
  } catch (error: any) {
    console.error(`Failed to read emails for ${targetEmail} (${folder}):`, error.message);
    return { emails: [], total: 0 };
  }
}

/**
 * Mark an email as read/unread
 */
export async function markEmailRead(
  creds: WorkMailCredentials,
  emailId: string,
  isRead: boolean,
): Promise<boolean> {
  try {
    const service = createService(creds);
    const email = await EmailMessage.Bind(service, new ItemId(emailId));
    email.IsRead = isRead;
    await email.Update(1); // ConflictResolutionMode.AutoResolve
    return true;
  } catch (error: any) {
    console.error('Failed to mark email read:', error.message);
    return false;
  }
}

/**
 * Get unread counts for a mailbox
 */
export async function getUnreadCount(
  creds: WorkMailCredentials,
  targetEmail: string,
): Promise<number> {
  try {
    const service = createService(creds);
    let folderId: FolderId;
    if (targetEmail && targetEmail !== creds.email) {
      folderId = new FolderId(WellKnownFolderName.Inbox, new Mailbox(targetEmail));
    } else {
      folderId = new FolderId(WellKnownFolderName.Inbox);
    }

    const filter = new SearchFilter.IsEqualTo(EmailMessageSchema.IsRead, false);
    const view = new ItemView(1);
    const results = await service.FindItems(folderId, filter, view);
    return results.TotalCount || 0;
  } catch (error: any) {
    console.error(`Failed to get unread count for ${targetEmail}:`, error.message);
    return 0;
  }
}

export default {
  getEmails,
  markEmailRead,
  getUnreadCount,
};
