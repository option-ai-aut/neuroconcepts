import { google } from 'googleapis';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';

// Gmail OAuth Configuration (reuse Google credentials with additional scopes)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '';
const GOOGLE_EMAIL_REDIRECT_URI = process.env.GOOGLE_EMAIL_REDIRECT_URI || 'http://localhost:3001/api/email/gmail/callback';

// Microsoft OAuth Configuration (reuse Microsoft credentials with additional scopes)
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_EMAIL_REDIRECT_URI = process.env.MICROSOFT_EMAIL_REDIRECT_URI || 'http://localhost:3001/api/email/outlook/callback';
const MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/common';

export class EmailService {
  // ===== GMAIL =====
  
  static getGmailAuthUrl(): string {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_EMAIL_REDIRECT_URI
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
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  static async exchangeGmailCode(code: string) {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_EMAIL_REDIRECT_URI
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
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_EMAIL_REDIRECT_URI
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      expiryDate: credentials.expiry_date!
    };
  }

  static async sendGmailEmail(accessToken: string, refreshToken: string, to: string, subject: string, body: string, html?: string) {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_EMAIL_REDIRECT_URI
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
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_EMAIL_REDIRECT_URI
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

  static async getOutlookMailAuthUrl(): Promise<string> {
    const msalConfig = {
      auth: {
        clientId: MICROSOFT_CLIENT_ID,
        authority: MICROSOFT_AUTHORITY,
        clientSecret: MICROSOFT_CLIENT_SECRET
      }
    };

    const cca = new ConfidentialClientApplication(msalConfig);
    const authCodeUrlParameters = {
      scopes: ['Mail.ReadWrite', 'Mail.Send', 'User.Read', 'offline_access'],
      redirectUri: MICROSOFT_EMAIL_REDIRECT_URI
    };

    return await cca.getAuthCodeUrl(authCodeUrlParameters);
  }

  static async exchangeOutlookMailCode(code: string) {
    const msalConfig = {
      auth: {
        clientId: MICROSOFT_CLIENT_ID,
        authority: MICROSOFT_AUTHORITY,
        clientSecret: MICROSOFT_CLIENT_SECRET
      }
    };

    const cca = new ConfidentialClientApplication(msalConfig);

    const tokenRequest = {
      code: code,
      scopes: ['Mail.ReadWrite', 'Mail.Send', 'User.Read', 'offline_access'],
      redirectUri: MICROSOFT_EMAIL_REDIRECT_URI
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
    const msalConfig = {
      auth: {
        clientId: MICROSOFT_CLIENT_ID,
        authority: MICROSOFT_AUTHORITY,
        clientSecret: MICROSOFT_CLIENT_SECRET
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

  static async sendOutlookEmail(accessToken: string, to: string, subject: string, body: string, html?: string) {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    const message = {
      message: {
        subject: subject,
        body: {
          contentType: html ? 'HTML' : 'Text',
          content: html || body
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ]
      },
      saveToSentItems: true
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
}
