import { google } from 'googleapis';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import * as nodemailer from 'nodemailer';

// Helper functions to get config at runtime (not at module load time)
const getGoogleEmailConfig = () => ({
  clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_EMAIL_REDIRECT_URI || 'http://localhost:3001/email/gmail/callback'
});

const getMicrosoftEmailConfig = () => ({
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  redirectUri: process.env.MICROSOFT_EMAIL_REDIRECT_URI || 'http://localhost:3001/email/outlook/callback',
  authority: 'https://login.microsoftonline.com/common'
});

// SMTP Configuration interface
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

// Email sending result
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider: 'gmail' | 'outlook' | 'smtp';
  error?: string;
}

// Tenant email configuration
export interface TenantEmailConfig {
  gmailConfig?: {
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    email: string;
  };
  outlookMailConfig?: {
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    email: string;
  };
  smtpConfig?: SmtpConfig;
}

export class EmailService {
  // ===== GMAIL =====
  
  static getGmailAuthUrl(state?: string): string {
    const config = getGoogleEmailConfig();
    console.log('🔑 Gmail Redirect URI:', config.redirectUri);
    
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: state || undefined
    });
  }

  static async exchangeGmailCode(code: string) {
    const config = getGoogleEmailConfig();
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiryDate: tokens.expiry_date!,
      email: userInfo.data.email!
    };
  }

  static async refreshGmailToken(refreshToken: string) {
    const config = getGoogleEmailConfig();
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      expiryDate: credentials.expiry_date!
    };
  }

  static async sendGmailEmail(accessToken: string, refreshToken: string, to: string, subject: string, body: string, html?: string) {
    const config = getGoogleEmailConfig();
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create email message
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      html || body
    ];
    const message = messageParts.join('\n');

    // Encode to base64url
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return result.data;
  }

  static async getGmailMessages(accessToken: string, refreshToken: string, maxResults: number = 20) {
    const config = getGoogleEmailConfig();
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['INBOX']
    });

    return response.data.messages || [];
  }

  // ===== OUTLOOK MAIL =====

  static async getOutlookMailAuthUrl(state?: string): Promise<string> {
    const config = getMicrosoftEmailConfig();
    const msalConfig = {
      auth: {
        clientId: config.clientId,
        authority: config.authority,
        clientSecret: config.clientSecret
      }
    };

    const cca = new ConfidentialClientApplication(msalConfig);
    const authCodeUrlParameters: any = {
      scopes: ['Mail.ReadWrite', 'Mail.Send', 'User.Read', 'offline_access'],
      redirectUri: config.redirectUri,
      ...(state && { state })
    };

    return await cca.getAuthCodeUrl(authCodeUrlParameters);
  }

  static async exchangeOutlookMailCode(code: string) {
    const config = getMicrosoftEmailConfig();
    const msalConfig = {
      auth: {
        clientId: config.clientId,
        authority: config.authority,
        clientSecret: config.clientSecret
      }
    };

    const cca = new ConfidentialClientApplication(msalConfig);

    const tokenRequest = {
      code: code,
      scopes: ['Mail.ReadWrite', 'Mail.Send', 'User.Read', 'offline_access'],
      redirectUri: config.redirectUri
    };

    const response = await cca.acquireTokenByCode(tokenRequest);

    // Get user email
    const client = Client.init({
      authProvider: (done) => {
        done(null, response!.accessToken);
      }
    });

    const user = await client.api('/me').get();

    // Store the account info as "refresh token" - we'll use it to get new tokens
    const accountInfo = response!.account ? JSON.stringify(response!.account) : '';

    return {
      accessToken: response!.accessToken,
      refreshToken: accountInfo,
      expiryDate: response!.expiresOn!.getTime(),
      email: user.mail || user.userPrincipalName
    };
  }

  static async refreshOutlookMailToken(accountInfoJson: string) {
    const config = getMicrosoftEmailConfig();
    const msalConfig = {
      auth: {
        clientId: config.clientId,
        authority: config.authority,
        clientSecret: config.clientSecret
      }
    };

    const cca = new ConfidentialClientApplication(msalConfig);
    const account = JSON.parse(accountInfoJson);

    const silentRequest = {
      account: account,
      scopes: ['Mail.ReadWrite', 'Mail.Send', 'User.Read']
    };

    const response = await cca.acquireTokenSilent(silentRequest);

    return {
      accessToken: response!.accessToken,
      expiryDate: response!.expiresOn!.getTime()
    };
  }

  static async sendOutlookEmail(
    accessToken: string,
    to: string,
    subject: string,
    body: string,
    html?: string,
    options?: { cc?: string; bcc?: string; attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }> }
  ) {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const toList = to.split(',')
      .map(a => a.trim())
      .filter(a => emailRegex.test(a))
      .map(a => ({ emailAddress: { address: a } }));
    if (toList.length === 0) throw new Error('No valid recipient email addresses provided');
    const ccList = options?.cc ? options.cc.split(',').map(a => ({ emailAddress: { address: a.trim() } })) : undefined;
    const bccList = options?.bcc ? options.bcc.split(',').map(a => ({ emailAddress: { address: a.trim() } })) : undefined;

    const graphAttachments = options?.attachments?.map(att => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: att.filename,
      contentType: att.contentType || 'application/octet-stream',
      contentBytes: Buffer.isBuffer(att.content) ? att.content.toString('base64') : Buffer.from(att.content as string).toString('base64'),
    }));

    const message: any = {
      message: {
        subject,
        body: { contentType: html ? 'HTML' : 'Text', content: html || body },
        toRecipients: toList,
        ...(ccList ? { ccRecipients: ccList } : {}),
        ...(bccList ? { bccRecipients: bccList } : {}),
        ...(graphAttachments && graphAttachments.length > 0 ? { attachments: graphAttachments } : {}),
      },
      saveToSentItems: true,
    };

    await client.api('/me/sendMail').post(message);
  }

  static async getOutlookMessages(accessToken: string, maxResults: number = 20) {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    const messages = await client
      .api('/me/mailFolders/inbox/messages')
      .top(maxResults)
      .select('subject,from,receivedDateTime,bodyPreview,isRead')
      .orderby('receivedDateTime DESC')
      .get();

    return messages.value || [];
  }

  // ===== SMTP =====

  static async sendSmtpEmail(
    config: SmtpConfig,
    to: string,
    subject: string,
    body: string,
    html?: string,
    attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>
  ): Promise<{ messageId: string }> {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: config.from,
      to,
      subject,
      text: body,
      html: html || undefined,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType
      }))
    };

    const result = await transporter.sendMail(mailOptions);
    return { messageId: result.messageId };
  }

  static async testSmtpConnection(config: SmtpConfig): Promise<boolean> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        }
      });

      await transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP connection test failed:', error);
      return false;
    }
  }

  // ===== UNIFIED SEND EMAIL =====

  /**
   * Send an email using the best available provider for the tenant
   * Priority: Gmail > Outlook > SMTP
   */
  static async sendEmail(
    config: TenantEmailConfig,
    params: {
      to: string;
      subject: string;
      body: string;
      html?: string;
      attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
    }
  ): Promise<SendEmailResult> {
    const safeSubject = params.subject.replace(/[\r\n]/g, ' ');
    const safeTo = params.to.replace(/[\r\n]/g, '');
    const { body, html, attachments } = params;
    const to = safeTo;
    const subject = safeSubject;

    // Try Gmail first
    if (config.gmailConfig?.accessToken && config.gmailConfig?.refreshToken) {
      try {
        console.log('📧 Sending email via Gmail...');
        const result = await this.sendGmailEmail(
          config.gmailConfig.accessToken,
          config.gmailConfig.refreshToken,
          to,
          subject,
          body,
          html
        );
        return {
          success: true,
          messageId: result.id || undefined,
          provider: 'gmail'
        };
      } catch (error: any) {
        console.error('Gmail send failed:', error.message);
        // Fall through to try next provider
      }
    }

    // Try Outlook
    if (config.outlookMailConfig?.accessToken) {
      try {
        console.log('📧 Sending email via Outlook...');
        await this.sendOutlookEmail(
          config.outlookMailConfig.accessToken,
          to,
          subject,
          body,
          html
        );
        return {
          success: true,
          provider: 'outlook'
        };
      } catch (error: any) {
        console.error('Outlook send failed:', error.message);
        // Fall through to try SMTP
      }
    }

    // Try SMTP
    if (config.smtpConfig?.host) {
      try {
        console.log('📧 Sending email via SMTP...');
        const result = await this.sendSmtpEmail(
          config.smtpConfig,
          to,
          subject,
          body,
          html,
          attachments
        );
        return {
          success: true,
          messageId: result.messageId,
          provider: 'smtp'
        };
      } catch (error: any) {
        console.error('SMTP send failed:', error.message);
        return {
          success: false,
          provider: 'smtp',
          error: error.message
        };
      }
    }

    // No provider available
    return {
      success: false,
      provider: 'smtp',
      error: 'No email provider configured. Please connect Gmail, Outlook, or configure SMTP.'
    };
  }

  /**
   * Get the configured email address for sending
   */
  static getSenderEmail(config: TenantEmailConfig): string | null {
    if (config.gmailConfig?.email) return config.gmailConfig.email;
    if (config.outlookMailConfig?.email) return config.outlookMailConfig.email;
    if (config.smtpConfig?.from) return config.smtpConfig.from;
    return null;
  }

  /**
   * Check if any email provider is configured
   */
  static hasEmailProvider(config: TenantEmailConfig): boolean {
    return !!(
      config.gmailConfig?.accessToken ||
      config.outlookMailConfig?.accessToken ||
      config.smtpConfig?.host
    );
  }
}
