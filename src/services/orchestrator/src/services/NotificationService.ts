/**
 * NotificationService - Manages in-app notifications
 */

import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new notification
 */
export async function createNotification(params: CreateNotificationParams) {
  const { tenantId, userId, type, title, message, metadata } = params;

  const notification = await prisma.notification.create({
    data: {
      tenantId,
      userId,
      type,
      title,
      message,
      metadata: metadata || {}
    }
  });

  console.log(`🔔 Created notification for user ${userId}: ${title}`);
  return notification;
}

/**
 * Get notifications for a user
 */
export async function getNotificationsForUser(userId: string, options?: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { unreadOnly = false, limit = 50, offset = 0 } = options || {};

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { read: false })
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });

  return notifications;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      read: false
    }
  });
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId // Ensure user owns this notification
    },
    data: { read: true }
  });

  return notification.count > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      read: false
    },
    data: { read: true }
  });

  console.log(`✅ Marked ${result.count} notifications as read for user ${userId}`);
  return result.count;
}

/**
 * Delete old notifications (cleanup job)
 */
export async function deleteOldNotifications(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      read: true // Only delete read notifications
    }
  });

  console.log(`🗑️ Deleted ${result.count} old notifications`);
  return result.count;
}

/**
 * Create notification for new lead
 */
export async function notifyNewLead(params: {
  tenantId: string;
  userId: string;
  leadId: string;
  leadName: string;
  propertyTitle?: string;
}) {
  const { tenantId, userId, leadId, leadName, propertyTitle } = params;

  return createNotification({
    tenantId,
    userId,
    type: 'NEW_LEAD',
    title: 'Neuer Lead eingegangen',
    message: `${leadName}${propertyTitle ? ` interessiert sich für ${propertyTitle}` : ' hat sich gemeldet'}`,
    metadata: { leadId }
  });
}

/**
 * Create notification for lead response
 */
export async function notifyLeadResponse(params: {
  tenantId: string;
  userId: string;
  leadId: string;
  leadName: string;
  preview: string;
}) {
  const { tenantId, userId, leadId, leadName, preview } = params;

  return createNotification({
    tenantId,
    userId,
    type: 'LEAD_RESPONSE',
    title: `${leadName} hat geantwortet`,
    message: preview.substring(0, 200),
    metadata: { leadId }
  });
}

export default {
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOldNotifications,
  notifyNewLead,
  notifyLeadResponse
};
