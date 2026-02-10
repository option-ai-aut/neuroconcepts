import { google } from 'googleapis';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';

// Helper functions to get config at runtime (not at module load time)
const getGoogleConfig = () => ({
  clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:3001/calendar/google/callback'
});

const getMicrosoftConfig = () => ({
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/calendar/outlook/callback',
  authority: 'https://login.microsoftonline.com/common'
});

export class CalendarService {
  // ===== GOOGLE CALENDAR =====
  
  static getGoogleAuthUrl(): string {
    const config = getGoogleConfig();
    console.log('🔑 Google Calendar Redirect URI:', config.redirectUri);
    
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
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
    const config = getGoogleConfig();
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

  static async refreshGoogleToken(refreshToken: string) {
    const config = getGoogleConfig();
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

  static async getGoogleCalendarEvents(accessToken: string, refreshToken: string, startDate: Date, endDate: Date) {
    const config = getGoogleConfig();
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
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
      orderBy: 'startTime',
      maxResults: 100,
      // Request all relevant fields including description
      fields: 'items(id,summary,description,location,start,end,attendees,htmlLink,status)'
    });

    return response.data.items || [];
  }

  // ===== MICROSOFT OUTLOOK CALENDAR =====

  static async getOutlookAuthUrl(): Promise<string> {
    const config = getMicrosoftConfig();
    const msalConfig = {
      auth: {
        clientId: config.clientId,
        authority: config.authority,
        clientSecret: config.clientSecret
      }
    };

    const cca = new ConfidentialClientApplication(msalConfig);
    const authCodeUrlParameters = {
      scopes: ['Calendars.ReadWrite', 'User.Read', 'offline_access'],
      redirectUri: config.redirectUri
    };

    return await cca.getAuthCodeUrl(authCodeUrlParameters);
  }

  static async exchangeOutlookCode(code: string) {
    const config = getMicrosoftConfig();
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
      scopes: ['Calendars.ReadWrite', 'User.Read', 'offline_access'],
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

  static async refreshOutlookToken(accountInfoJson: string) {
    const config = getMicrosoftConfig();
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

  // ===== GET EVENTS (Standardized Format) =====

  /**
   * Get Google Calendar events in standardized format
   */
  static async getGoogleEvents(
    accessToken: string, 
    refreshToken: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    location?: string;
    attendees?: string[];
    description?: string;
  }>> {
    const rawEvents = await this.getGoogleCalendarEvents(accessToken, refreshToken, startDate, endDate);
    
    return rawEvents.map(event => ({
      id: event.id || `google-${Date.now()}-${Math.random()}`,
      title: event.summary || 'Kein Titel',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      location: event.location || undefined,
      attendees: event.attendees?.map((a: any) => a.email).filter(Boolean) || undefined,
      description: event.description || undefined
    }));
  }

  /**
   * Get Outlook Calendar events in standardized format
   */
  static async getOutlookEvents(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    location?: string;
    attendees?: string[];
    description?: string;
  }>> {
    const rawEvents = await this.getOutlookCalendarEvents(accessToken, startDate, endDate);
    
    return rawEvents.map((event: any) => ({
      id: event.id || `outlook-${Date.now()}-${Math.random()}`,
      title: event.subject || 'Kein Titel',
      start: event.start?.dateTime || '',
      end: event.end?.dateTime || '',
      location: event.location?.displayName || undefined,
      attendees: event.attendees?.map((a: any) => a.emailAddress?.address).filter(Boolean) || undefined,
      description: event.body?.content || undefined
    }));
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

  // ===== VIEWING SLOT PROPOSALS =====

  /**
   * Propose viewing slots based on calendar availability and user preferences
   */
  static async proposeViewingSlots(params: {
    provider: 'google' | 'outlook';
    config: any;
    preferences?: {
      enabled: boolean;
      weekdays: number[];
      startTime: string;
      endTime: string;
      slotDuration: number;
      bufferTime: number;
    };
    daysAhead?: number;
    maxSlots?: number;
  }): Promise<Array<{ start: Date; end: Date; formatted: string }>> {
    const { 
      provider, 
      config, 
      preferences,
      daysAhead = 14,
      maxSlots = 5
    } = params;

    // Default preferences if not provided
    const prefs = preferences || {
      enabled: true,
      weekdays: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '09:00',
      endTime: '18:00',
      slotDuration: 30,
      bufferTime: 15
    };

    const now = new Date();
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Get busy slots from calendar
    const { busySlots } = await this.checkAvailability(provider, config, now, endDate);

    // Generate available slots
    const availableSlots: Array<{ start: Date; end: Date; formatted: string }> = [];
    
    // Parse start/end times
    const [startHour, startMin] = prefs.startTime.split(':').map(Number);
    const [endHour, endMin] = prefs.endTime.split(':').map(Number);

    // Iterate through each day
    for (let dayOffset = 1; dayOffset <= daysAhead && availableSlots.length < maxSlots; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);

      // Check if this day is allowed
      const dayOfWeek = date.getDay();
      if (!prefs.weekdays.includes(dayOfWeek)) {
        continue;
      }

      // Generate slots for this day
      const dayStart = new Date(date);
      dayStart.setHours(startHour, startMin, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(endHour, endMin, 0, 0);

      let slotStart = new Date(dayStart);

      while (slotStart < dayEnd && availableSlots.length < maxSlots) {
        const slotEnd = new Date(slotStart.getTime() + prefs.slotDuration * 60 * 1000);

        // Check if slot overlaps with any busy slot
        const isAvailable = !busySlots.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          // Add buffer time
          busyStart.setMinutes(busyStart.getMinutes() - prefs.bufferTime);
          busyEnd.setMinutes(busyEnd.getMinutes() + prefs.bufferTime);
          
          return (slotStart < busyEnd && slotEnd > busyStart);
        });

        if (isAvailable && slotEnd <= dayEnd) {
          availableSlots.push({
            start: new Date(slotStart),
            end: new Date(slotEnd),
            formatted: this.formatSlot(slotStart, slotEnd)
          });
        }

        // Move to next slot (slot duration + buffer)
        slotStart = new Date(slotStart.getTime() + (prefs.slotDuration + prefs.bufferTime) * 60 * 1000);
      }
    }

    return availableSlots;
  }

  /**
   * Format a time slot for display
   */
  private static formatSlot(start: Date, end: Date): string {
    const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const day = days[start.getDay()];
    const date = start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const startTime = start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    return `${day}, ${date} um ${startTime}-${endTime} Uhr`;
  }

  /**
   * Create a calendar event for a viewing
   */
  static async createViewingEvent(params: {
    provider: 'google' | 'outlook';
    config: any;
    start: Date;
    end: Date;
    title: string;
    description?: string;
    location?: string;
    attendeeEmail?: string;
  }): Promise<{ eventId: string; link?: string }> {
    const { provider, config, start, end, title, description, location, attendeeEmail } = params;

    if (provider === 'google') {
      const googleConfig = getGoogleConfig();
      const oauth2Client = new google.auth.OAuth2(
        googleConfig.clientId,
        googleConfig.clientSecret,
        googleConfig.redirectUri
      );

      oauth2Client.setCredentials({
        access_token: config.accessToken,
        refresh_token: config.refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const event = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: title,
          description,
          location,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 60 },
              { method: 'popup', minutes: 30 }
            ]
          }
        }
      });

      return {
        eventId: event.data.id!,
        link: event.data.htmlLink || undefined
      };
    } else {
      // Outlook
      const client = Client.init({
        authProvider: (done) => {
          done(null, config.accessToken);
        }
      });

      const event = await client.api('/me/calendar/events').post({
        subject: title,
        body: {
          contentType: 'text',
          content: description || ''
        },
        start: {
          dateTime: start.toISOString(),
          timeZone: 'Europe/Vienna'
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: 'Europe/Vienna'
        },
        location: location ? { displayName: location } : undefined,
        attendees: attendeeEmail ? [{
          emailAddress: { address: attendeeEmail },
          type: 'required'
        }] : undefined
      });

      return {
        eventId: event.id,
        link: event.webLink
      };
    }
  }

  /**
   * Update a Google Calendar event
   */
  static async updateGoogleEvent(params: {
    accessToken: string;
    refreshToken: string;
    eventId: string;
    title: string;
    start: Date;
    end: Date;
    location?: string;
    description?: string;
  }): Promise<void> {
    const { accessToken, refreshToken, eventId, title, start, end, location, description } = params;
    const googleConfig = getGoogleConfig();
    
    const oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: {
        summary: title,
        description,
        location,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() }
      }
    });
  }

  /**
   * Delete a Google Calendar event
   */
  static async deleteGoogleEvent(params: {
    accessToken: string;
    refreshToken: string;
    eventId: string;
  }): Promise<void> {
    const { accessToken, refreshToken, eventId } = params;
    const googleConfig = getGoogleConfig();
    
    const oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });
  }

  /**
   * Update an Outlook Calendar event
   */
  static async updateOutlookEvent(params: {
    accessToken: string;
    eventId: string;
    title: string;
    start: Date;
    end: Date;
    location?: string;
    description?: string;
  }): Promise<void> {
    const { accessToken, eventId, title, start, end, location, description } = params;
    
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    await client.api(`/me/calendar/events/${eventId}`).patch({
      subject: title,
      body: {
        contentType: 'text',
        content: description || ''
      },
      start: {
        dateTime: start.toISOString(),
        timeZone: 'Europe/Vienna'
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: 'Europe/Vienna'
      },
      location: location ? { displayName: location } : undefined
    });
  }

  /**
   * Delete an Outlook Calendar event
   */
  static async deleteOutlookEvent(params: {
    accessToken: string;
    eventId: string;
  }): Promise<void> {
    const { accessToken, eventId } = params;
    
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    await client.api(`/me/calendar/events/${eventId}`).delete();
  }
}
