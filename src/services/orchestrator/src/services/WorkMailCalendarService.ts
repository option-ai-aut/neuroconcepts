/**
 * WorkMailCalendarService - Calendar integration via EWS (Exchange Web Services)
 * Connects to AWS WorkMail calendars for reading/writing events.
 * 
 * WorkMail EWS Endpoint (eu-west-1): https://ews.mail.eu-west-1.awsapps.com/EWS/Exchange.asmx
 * Auth: Basic Auth with WorkMail user credentials
 */

import {
  ExchangeService,
  ExchangeVersion,
  Uri,
  WebCredentials,
  CalendarView,
  WellKnownFolderName,
  Appointment,
  MessageBody,
  DateTime,
  SendInvitationsMode,
  DeleteMode,
  SendCancellationsMode,
  FolderId,
  Mailbox,
  AppointmentSchema,
  PropertySet,
  BasePropertySet,
  ItemId,
  SendInvitationsOrCancellationsMode,
} from 'ews-javascript-api';

// WorkMail EWS endpoint — adjust region if needed
const EWS_URL = process.env.WORKMAIL_EWS_URL || 'https://ews.mail.eu-west-1.awsapps.com/EWS/Exchange.asmx';

export interface WorkMailCredentials {
  email: string;
  password: string;
}

export interface CalendarEvent {
  id?: string;
  subject: string;
  body?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  meetLink?: string;
  isAllDay?: boolean;
  organizer?: string;
}

function createService(creds: WorkMailCredentials): ExchangeService {
  const service = new ExchangeService(ExchangeVersion.Exchange2013_SP1);
  service.Url = new Uri(EWS_URL);
  service.Credentials = new WebCredentials(creds.email, creds.password);
  return service;
}

/**
 * Get calendar events for a user within a date range
 */
export async function getCalendarEvents(
  creds: WorkMailCredentials,
  startDate: Date,
  endDate: Date,
  targetEmail?: string // If set, reads another user's calendar (requires permissions)
): Promise<CalendarEvent[]> {
  const service = createService(creds);

  const view = new CalendarView(
    DateTime.Parse(startDate.toISOString()),
    DateTime.Parse(endDate.toISOString()),
    100 // max items
  );

  view.PropertySet = new PropertySet(
    BasePropertySet.FirstClassProperties,
    AppointmentSchema.Start,
    AppointmentSchema.End,
    AppointmentSchema.Subject,
    AppointmentSchema.Location,
    AppointmentSchema.IsAllDayEvent,
  );

  let folderId: FolderId;
  if (targetEmail && targetEmail !== creds.email) {
    // Access another user's calendar
    folderId = new FolderId(WellKnownFolderName.Calendar, new Mailbox(targetEmail));
  } else {
    folderId = new FolderId(WellKnownFolderName.Calendar);
  }

  const results = await service.FindAppointments(folderId, view);

  return results.Items.map((item: any) => ({
    id: item.Id?.UniqueId,
    subject: item.Subject || '',
    start: new Date(item.Start?.ToISOString() || item.Start),
    end: new Date(item.End?.ToISOString() || item.End),
    location: item.Location || '',
    isAllDay: item.IsAllDayEvent || false,
    organizer: item.Organizer?.Address || '',
  }));
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  creds: WorkMailCredentials,
  event: CalendarEvent
): Promise<{ id: string; meetLink?: string }> {
  const service = createService(creds);

  const appointment = new Appointment(service);
  appointment.Subject = event.subject;
  appointment.Start = DateTime.Parse(event.start.toISOString());
  appointment.End = DateTime.Parse(event.end.toISOString());

  if (event.location) {
    appointment.Location = event.location;
  }

  // Build body with optional Google Meet link
  let bodyContent = event.body || '';
  if (event.meetLink) {
    bodyContent += `\n\n🎥 Google Meet: ${event.meetLink}`;
  }
  if (bodyContent) {
    appointment.Body = new MessageBody(bodyContent);
  }

  if (event.isAllDay) {
    appointment.IsAllDayEvent = true;
  }

  // Add attendees
  if (event.attendees && event.attendees.length > 0) {
    for (const email of event.attendees) {
      appointment.RequiredAttendees.Add(email);
    }
    await appointment.Save(SendInvitationsMode.SendOnlyToAll);
  } else {
    await appointment.Save(SendInvitationsMode.SendToNone);
  }

  return {
    id: appointment.Id?.UniqueId || '',
    meetLink: event.meetLink,
  };
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  creds: WorkMailCredentials,
  eventId: string
): Promise<boolean> {
  const service = createService(creds);

  try {
    const appointment = await Appointment.Bind(service, new ItemId(eventId));
    await appointment.Delete(DeleteMode.MoveToDeletedItems, SendCancellationsMode.SendOnlyToAll);
    return true;
  } catch (error: any) {
    console.error('Failed to delete calendar event:', error.message);
    return false;
  }
}

/**
 * Get free/busy slots for a user within a date range
 * Returns busy time blocks so the frontend can calculate free slots
 */
export async function getBusySlots(
  creds: WorkMailCredentials,
  targetEmail: string,
  startDate: Date,
  endDate: Date
): Promise<{ start: Date; end: Date }[]> {
  // Use FindAppointments to get all events, then return their time blocks
  const events = await getCalendarEvents(creds, startDate, endDate, targetEmail);
  return events
    .filter(e => !e.isAllDay)
    .map(e => ({ start: e.start, end: e.end }));
}

/**
 * Get events for multiple users (admin view)
 */
export async function getMultipleCalendars(
  creds: WorkMailCredentials,
  emails: string[],
  startDate: Date,
  endDate: Date
): Promise<Record<string, CalendarEvent[]>> {
  const result: Record<string, CalendarEvent[]> = {};

  for (const email of emails) {
    try {
      result[email] = await getCalendarEvents(creds, startDate, endDate, email);
    } catch (error: any) {
      console.error(`Failed to read calendar for ${email}:`, error.message);
      result[email] = [];
    }
  }

  return result;
}

export default {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getBusySlots,
  getMultipleCalendars,
};
