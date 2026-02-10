/**
 * JarvisActionService - Manages Jarvis pending actions and questions
 * Handles: Creating questions, reminders, escalations, resolutions
 */

import { PrismaClient, PendingActionType, PendingActionStatus, NotificationType } from '@prisma/client';
import { 
  sendSystemEmail, 
  renderJarvisQuestionEmail, 
  renderReminderEmail, 
  renderEscalationEmail 
} from './SystemEmailService';

const prisma = new PrismaClient();

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

interface CreateActionParams {
  tenantId: string;
  userId: string;
  leadId?: string;
  type: PendingActionType;
  question: string;
  context?: Record<string, any>;
}

/**
 * Create a new pending action and notify the user
 */
export async function createPendingAction(params: CreateActionParams) {
  const { tenantId, userId, leadId, type, question, context } = params;

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get lead and property info if available
  let leadName: string | undefined;
  let propertyTitle: string | undefined;

  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { property: true }
    });
    if (lead) {
      leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email;
      propertyTitle = lead.property?.title;
    }
  }

  // Create the pending action
  const action = await prisma.jarvisPendingAction.create({
    data: {
      tenantId,
      userId,
      leadId,
      type,
      question,
      context: context || {},
      status: 'PENDING'
    }
  });

  // Create in-app notification
  await prisma.notification.create({
    data: {
      tenantId,
      userId,
      type: 'JARVIS_QUESTION',
      title: 'Jarvis benötigt deine Hilfe',
      message: question,
      metadata: { actionId: action.id, leadId, type }
    }
  });

  // Send email notification if enabled
  if (user.settings?.emailNotifications !== false) {
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    const actionUrl = `${APP_URL}/dashboard/assistant?action=${action.id}`;

    await sendSystemEmail({
      to: user.email,
      subject: `Jarvis: ${question.substring(0, 50)}...`,
      html: renderJarvisQuestionEmail({
        userName,
        question,
        leadName,
        propertyTitle,
        actionUrl
      })
    });
  }

  console.log(`📋 Created pending action ${action.id} for user ${userId}: ${type}`);
  return action;
}

/**
 * Send reminder for a pending action (called by EventBridge after 24h)
 */
export async function sendReminder(actionId: string) {
  const action = await prisma.jarvisPendingAction.findUnique({
    where: { id: actionId },
    include: { user: { include: { settings: true } } }
  });

  if (!action || action.status !== 'PENDING') {
    console.log(`⏭️ Skipping reminder for action ${actionId}: already resolved or not found`);
    return;
  }

  const user = action.user;
  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  const hoursWaiting = Math.round((Date.now() - action.createdAt.getTime()) / (1000 * 60 * 60));
  const actionUrl = `${APP_URL}/dashboard/assistant?action=${action.id}`;

  // Update action status
  await prisma.jarvisPendingAction.update({
    where: { id: actionId },
    data: { 
      status: 'REMINDED',
      reminderSentAt: new Date()
    }
  });

  // Create reminder notification
  await prisma.notification.create({
    data: {
      tenantId: action.tenantId,
      userId: user.id,
      type: 'REMINDER',
      title: 'Erinnerung: Jarvis wartet auf dich',
      message: action.question,
      metadata: { actionId: action.id }
    }
  });

  // Send email
  if (user.settings?.emailNotifications !== false) {
    await sendSystemEmail({
      to: user.email,
      subject: `⏰ Erinnerung: ${action.question.substring(0, 40)}...`,
      html: renderReminderEmail({
        userName,
        question: action.question,
        hoursWaiting,
        actionUrl
      })
    });
  }

  console.log(`⏰ Sent reminder for action ${actionId}`);
}

/**
 * Escalate a pending action to admin (called by EventBridge after 48h)
 */
export async function escalateAction(actionId: string) {
  const action = await prisma.jarvisPendingAction.findUnique({
    where: { id: actionId },
    include: { 
      user: true
    }
  });

  if (!action || action.status === 'RESOLVED' || action.status === 'CANCELLED') {
    console.log(`⏭️ Skipping escalation for action ${actionId}: already resolved`);
    return;
  }

  // Find admin(s) in the tenant
  const admins = await prisma.user.findMany({
    where: {
      tenantId: action.tenantId,
      role: { in: ['ADMIN', 'SUPER_ADMIN'] }
    },
    include: { settings: true }
  });

  if (admins.length === 0) {
    console.log(`⚠️ No admins found in tenant ${action.tenantId} for escalation`);
    return;
  }

  const agentName = [action.user.firstName, action.user.lastName].filter(Boolean).join(' ') || action.user.email;
  const hoursWaiting = Math.round((Date.now() - action.createdAt.getTime()) / (1000 * 60 * 60));
  const actionUrl = `${APP_URL}/dashboard/assistant?action=${action.id}`;

  // Get lead name if available
  let leadName: string | undefined;
  if (action.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: action.leadId } });
    if (lead) {
      leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email;
    }
  }

  // Update action status
  await prisma.jarvisPendingAction.update({
    where: { id: actionId },
    data: { 
      status: 'ESCALATED',
      escalatedAt: new Date()
    }
  });

  // Notify all admins
  for (const admin of admins) {
    const adminName = [admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email;

    // Create escalation notification
    await prisma.notification.create({
      data: {
        tenantId: action.tenantId,
        userId: admin.id,
        type: 'ESCALATION',
        title: `Eskalation: ${agentName} antwortet nicht`,
        message: action.question,
        metadata: { actionId: action.id, agentId: action.userId }
      }
    });

    // Send email
    if (admin.settings?.emailNotifications !== false) {
      await sendSystemEmail({
        to: admin.email,
        subject: `🚨 Eskalation: ${agentName} antwortet nicht`,
        html: renderEscalationEmail({
          adminName,
          agentName,
          question: action.question,
          hoursWaiting,
          leadName,
          actionUrl
        })
      });
    }
  }

  console.log(`🚨 Escalated action ${actionId} to ${admins.length} admin(s)`);
}

/**
 * Resolve a pending action
 */
export async function resolveAction(actionId: string, resolution: string, resolvedBy?: string) {
  const action = await prisma.jarvisPendingAction.update({
    where: { id: actionId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolution
    }
  });

  console.log(`✅ Resolved action ${actionId}: ${resolution.substring(0, 50)}...`);
  return action;
}

/**
 * Cancel a pending action
 */
export async function cancelAction(actionId: string, reason?: string) {
  const action = await prisma.jarvisPendingAction.update({
    where: { id: actionId },
    data: {
      status: 'CANCELLED',
      resolvedAt: new Date(),
      resolution: reason || 'Cancelled'
    }
  });

  console.log(`❌ Cancelled action ${actionId}`);
  return action;
}

/**
 * Get pending actions for a user
 */
export async function getPendingActionsForUser(userId: string) {
  return prisma.jarvisPendingAction.findMany({
    where: {
      userId,
      status: { in: ['PENDING', 'REMINDED', 'ESCALATED'] }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get all pending actions for a tenant (for admin view)
 */
export async function getPendingActionsForTenant(tenantId: string) {
  return prisma.jarvisPendingAction.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING', 'REMINDED', 'ESCALATED'] }
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export default {
  createPendingAction,
  sendReminder,
  escalateAction,
  resolveAction,
  cancelAction,
  getPendingActionsForUser,
  getPendingActionsForTenant
};
