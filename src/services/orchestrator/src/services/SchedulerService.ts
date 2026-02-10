/**
 * SchedulerService - AWS EventBridge Scheduler Integration
 * Handles: Auto-reply delays, reminders, escalations
 */

import { 
  SchedulerClient, 
  CreateScheduleCommand, 
  DeleteScheduleCommand,
  GetScheduleCommand
} from '@aws-sdk/client-scheduler';

const scheduler = new SchedulerClient({ 
  region: process.env.AWS_REGION || 'eu-central-1' 
});

const SCHEDULER_ENABLED = process.env.SCHEDULER_ENABLED !== 'false';
const SCHEDULER_GROUP = process.env.SCHEDULER_GROUP || 'immivo-schedules';
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN || '';
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:4000';

interface ScheduleParams {
  name: string;
  scheduleAt: Date;
  endpoint: string;
  payload: Record<string, any>;
  description?: string;
}

/**
 * Create a one-time schedule
 */
export async function createSchedule(params: ScheduleParams): Promise<string | null> {
  const { name, scheduleAt, endpoint, payload, description } = params;

  if (!SCHEDULER_ENABLED) {
    console.log('📅 [SCHEDULER DISABLED] Would create schedule:');
    console.log(`   Name: ${name}`);
    console.log(`   At: ${scheduleAt.toISOString()}`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Payload:`, payload);
    return `mock-schedule-${name}`;
  }

  try {
    // Format: at(yyyy-mm-ddThh:mm:ss)
    const scheduleExpression = `at(${scheduleAt.toISOString().split('.')[0]})`;

    const command = new CreateScheduleCommand({
      Name: name,
      GroupName: SCHEDULER_GROUP,
      ScheduleExpression: scheduleExpression,
      ScheduleExpressionTimezone: 'UTC',
      FlexibleTimeWindow: { Mode: 'OFF' },
      Target: {
        Arn: `arn:aws:lambda:${process.env.AWS_REGION || 'eu-central-1'}:${process.env.AWS_ACCOUNT_ID}:function:immivo-scheduler-handler`,
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({
          endpoint: `${API_ENDPOINT}${endpoint}`,
          payload,
          scheduleName: name
        })
      },
      Description: description,
      ActionAfterCompletion: 'DELETE' // Auto-delete after execution
    });

    await scheduler.send(command);
    console.log(`📅 Created schedule: ${name} for ${scheduleAt.toISOString()}`);
    return name;
  } catch (error: any) {
    console.error(`📅 Failed to create schedule ${name}:`, error.message);
    return null;
  }
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(name: string): Promise<boolean> {
  if (!SCHEDULER_ENABLED) {
    console.log(`📅 [SCHEDULER DISABLED] Would delete schedule: ${name}`);
    return true;
  }

  try {
    const command = new DeleteScheduleCommand({
      Name: name,
      GroupName: SCHEDULER_GROUP
    });

    await scheduler.send(command);
    console.log(`📅 Deleted schedule: ${name}`);
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`📅 Schedule ${name} not found (already deleted)`);
      return true;
    }
    console.error(`📅 Failed to delete schedule ${name}:`, error.message);
    return false;
  }
}

/**
 * Check if a schedule exists
 */
export async function scheduleExists(name: string): Promise<boolean> {
  if (!SCHEDULER_ENABLED) {
    return false;
  }

  try {
    const command = new GetScheduleCommand({
      Name: name,
      GroupName: SCHEDULER_GROUP
    });

    await scheduler.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

// ============================================
// Specific Schedule Types
// ============================================

/**
 * Schedule auto-reply for a lead
 */
export async function scheduleAutoReply(params: {
  leadId: string;
  tenantId: string;
  delayMinutes: number;
}) {
  const { leadId, tenantId, delayMinutes } = params;
  const scheduleAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  return createSchedule({
    name: `auto-reply-${leadId}`,
    scheduleAt,
    endpoint: '/internal/scheduler/auto-reply',
    payload: { leadId, tenantId },
    description: `Auto-reply for lead ${leadId}`
  });
}

/**
 * Schedule reminder for a pending action (24h)
 */
export async function scheduleReminder(params: {
  actionId: string;
  hoursDelay?: number;
}) {
  const { actionId, hoursDelay = 24 } = params;
  const scheduleAt = new Date(Date.now() + hoursDelay * 60 * 60 * 1000);

  return createSchedule({
    name: `reminder-${actionId}`,
    scheduleAt,
    endpoint: '/internal/scheduler/reminder',
    payload: { actionId },
    description: `Reminder for action ${actionId}`
  });
}

/**
 * Schedule escalation for a pending action (48h from creation)
 */
export async function scheduleEscalation(params: {
  actionId: string;
  hoursDelay?: number;
}) {
  const { actionId, hoursDelay = 48 } = params;
  const scheduleAt = new Date(Date.now() + hoursDelay * 60 * 60 * 1000);

  return createSchedule({
    name: `escalation-${actionId}`,
    scheduleAt,
    endpoint: '/internal/scheduler/escalation',
    payload: { actionId },
    description: `Escalation for action ${actionId}`
  });
}

/**
 * Cancel all schedules for a pending action
 */
export async function cancelActionSchedules(actionId: string) {
  await deleteSchedule(`reminder-${actionId}`);
  await deleteSchedule(`escalation-${actionId}`);
}

/**
 * Cancel auto-reply schedule for a lead
 */
export async function cancelAutoReply(leadId: string) {
  return deleteSchedule(`auto-reply-${leadId}`);
}

export default {
  createSchedule,
  deleteSchedule,
  scheduleExists,
  scheduleAutoReply,
  scheduleReminder,
  scheduleEscalation,
  cancelActionSchedules,
  cancelAutoReply
};
