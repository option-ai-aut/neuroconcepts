/**
 * JarvisActionService - Manages Jarvis pending actions (questions to human agents)
 */

import { PrismaClient } from '@prisma/client';
import { createNotification } from './NotificationService';

let prisma: PrismaClient;

export function setJarvisActionPrisma(client: PrismaClient) {
  prisma = client;
}

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

interface CreatePendingActionParams {
  tenantId: string;
  userId: string;
  leadId?: string;
  propertyId?: string;
  type: string;
  question: string;
  context?: Record<string, any>;
  options?: string[];
  allowCustom?: boolean;
}

/**
 * Create a new pending Jarvis action (question to human agent)
 */
async function createPendingAction(params: CreatePendingActionParams) {
  const db = getPrisma();
  const { tenantId, userId, leadId, propertyId, type, question, context, options, allowCustom = true } = params;

  const action = await db.jarvisPendingAction.create({
    data: {
      tenantId,
      userId,
      leadId: leadId || null,
      propertyId: propertyId || null,
      type: type as any,
      question,
      context: context || {},
      options: options || [],
      allowCustom,
      status: 'PENDING',
    },
  });

  // Send notification to the assigned user
  try {
    await createNotification({
      tenantId,
      userId,
      type: 'JARVIS_QUESTION' as any,
      title: 'Jarvis braucht deine Entscheidung',
      message: question.substring(0, 200),
      metadata: {
        actionId: action.id,
        actionType: type,
        leadId: leadId || null,
        propertyId: propertyId || null,
      },
    });
  } catch (err) {
    console.error('Failed to send notification for Jarvis action:', err);
  }

  console.log(`❓ JarvisAction created: ${action.id} (type=${type}, user=${userId})`);
  return action;
}

/**
 * Get all pending actions for a specific user
 */
async function getPendingActionsForUser(userId: string) {
  const db = getPrisma();
  return db.jarvisPendingAction.findMany({
    where: {
      userId,
      status: { in: ['PENDING', 'REMINDED', 'ESCALATED'] },
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, email: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all pending actions for a tenant (admin view)
 */
async function getPendingActionsForTenant(tenantId: string) {
  const db = getPrisma();
  return db.jarvisPendingAction.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING', 'REMINDED', 'ESCALATED'] },
    },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, email: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Resolve a pending action with a human decision
 */
async function resolveAction(id: string, resolution: string, userId: string) {
  const db = getPrisma();
  const action = await db.jarvisPendingAction.update({
    where: { id },
    data: {
      status: 'RESOLVED',
      resolution,
      resolvedAt: new Date(),
    },
  });

  console.log(`✅ JarvisAction resolved: ${id} by user ${userId}`);
  return action;
}

/**
 * Cancel a pending action
 */
async function cancelAction(id: string, reason?: string) {
  const db = getPrisma();
  const action = await db.jarvisPendingAction.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      resolution: reason || 'Cancelled',
      resolvedAt: new Date(),
    },
  });

  console.log(`❌ JarvisAction cancelled: ${id}`);
  return action;
}

/**
 * Send a reminder notification for a pending action
 */
async function sendReminder(actionId: string) {
  const db = getPrisma();
  const action = await db.jarvisPendingAction.findUnique({
    where: { id: actionId },
    include: { lead: { select: { firstName: true, lastName: true } } },
  });

  if (!action || action.status === 'RESOLVED' || action.status === 'CANCELLED') {
    console.log(`⚠️ Reminder skipped for action ${actionId}: already resolved/cancelled`);
    return;
  }

  await db.jarvisPendingAction.update({
    where: { id: actionId },
    data: { status: 'REMINDED', reminderSentAt: new Date() },
  });

  try {
    await createNotification({
      tenantId: action.tenantId,
      userId: action.userId,
      type: 'REMINDER' as any,
      title: 'Erinnerung: Offene Entscheidung',
      message: action.question.substring(0, 200),
      metadata: {
        actionId: action.id,
        actionType: action.type,
        leadId: action.leadId || null,
      },
    });
  } catch (err) {
    console.error('Failed to send reminder notification:', err);
  }

  console.log(`🔔 Reminder sent for JarvisAction: ${actionId}`);
}

/**
 * Escalate a pending action to admin
 */
async function escalateAction(actionId: string) {
  const db = getPrisma();
  const action = await db.jarvisPendingAction.findUnique({
    where: { id: actionId },
  });

  if (!action || action.status === 'RESOLVED' || action.status === 'CANCELLED') {
    console.log(`⚠️ Escalation skipped for action ${actionId}: already resolved/cancelled`);
    return;
  }

  await db.jarvisPendingAction.update({
    where: { id: actionId },
    data: { status: 'ESCALATED', escalatedAt: new Date() },
  });

  // Find tenant admins and notify them
  try {
    const admins = await db.user.findMany({
      where: {
        tenantId: action.tenantId,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
      select: { id: true },
    });

    for (const admin of admins) {
      await createNotification({
        tenantId: action.tenantId,
        userId: admin.id,
        type: 'ESCALATION' as any,
        title: 'Eskalation: Entscheidung erforderlich',
        message: action.question.substring(0, 200),
        metadata: {
          actionId: action.id,
          actionType: action.type,
          leadId: action.leadId || null,
          originalUserId: action.userId,
        },
      });
    }
  } catch (err) {
    console.error('Failed to send escalation notifications:', err);
  }

  console.log(`🚨 JarvisAction escalated: ${actionId}`);
}

const JarvisActionService = {
  createPendingAction,
  getPendingActionsForUser,
  getPendingActionsForTenant,
  resolveAction,
  cancelAction,
  sendReminder,
  escalateAction,
};

export default JarvisActionService;
