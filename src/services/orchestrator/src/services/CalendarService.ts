import { google } from 'googleapis';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';

// Google Calendar OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:3001/api/calendar/google/callback';

// Microsoft OAuth Configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/calendar/outlook/callback';
const MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/common';

export class CalendarService {
  // ===== GOOGLE CALENDAR =====
  
  static getGoogleAuthUrl(): string {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  static async exchangeGoogleCode(code: string) {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
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

  static async refreshGoogleToken(refreshToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      expiryDate: credentials.expiry_date!
    };
  }

  static async getGoogleCalendarEvents(accessToken: string, refreshToken: string, startDate: Date, endDate: Date) {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];
  }

  // ===== MICROSOFT OUTLOOK CALENDAR =====

  static async getOutlookAuthUrl(): Promise<string> {
    const msalConfig = {
      auth: {
        clientId: MICROSOFT_CLIENT_ID,
        authority: MICROSOFT_AUTHORITY,
        clientSecret: MICROSOFT_CLIENT_SECRET
      }
    };

    const cca = new ConfidentialClientApplication(msalConfig);
    const authCodeUrlParameters = {
      scopes: ['Calendars.ReadWrite', 'User.Read', 'offline_access'],
      redirectUri: MICROSOFT_REDIRECT_URI
    };

    return await cca.getAuthCodeUrl(authCodeUrlParameters);
  }

  static async exchangeOutlookCode(code: string) {
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
      scopes: ['Calendars.ReadWrite', 'User.Read', 'offline_access'],
      redirectUri: MICROSOFT_REDIRECT_URI
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

  static async refreshOutlookToken(accountInfoJson: string) {
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
      scopes: ['Calendars.ReadWrite', 'User.Read']
    };

    const response = await cca.acquireTokenSilent(silentRequest);

    return {
      accessToken: response!.accessToken,
      expiryDate: response!.expiresOn!.getTime()
    };
  }

  static async getOutlookCalendarEvents(accessToken: string, startDate: Date, endDate: Date) {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    const events = await client
      .api('/me/calendar/events')
      .filter(`start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`)
      .select('subject,start,end,location,attendees')
      .orderby('start/dateTime')
      .get();

    return events.value || [];
  }

  // ===== AVAILABILITY CHECK =====

  static async checkAvailability(
    provider: 'google' | 'outlook',
    config: any,
    startDate: Date,
    endDate: Date
  ): Promise<{ available: boolean; busySlots: Array<{ start: Date; end: Date }> }> {
    try {
      let events: any[] = [];

      if (provider === 'google') {
        events = await this.getGoogleCalendarEvents(
          config.accessToken,
          config.refreshToken,
          startDate,
          endDate
        );
      } else {
        events = await this.getOutlookCalendarEvents(
          config.accessToken,
          startDate,
          endDate
        );
      }

      const busySlots = events.map(event => {
        if (provider === 'google') {
          return {
            start: new Date(event.start?.dateTime || event.start?.date),
            end: new Date(event.end?.dateTime || event.end?.date)
          };
        } else {
          return {
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime)
          };
        }
      });

      return {
        available: busySlots.length === 0,
        busySlots
      };
    } catch (error) {
      console.error(`Error checking ${provider} availability:`, error);
      throw error;
    }
  }
}
