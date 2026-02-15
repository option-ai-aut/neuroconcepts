import { PrismaClient, LeadStatus } from '@prisma/client';
import SchedulerService from './SchedulerService';

let prisma: PrismaClient;
export function setFollowUpPrisma(client: PrismaClient) { prisma = client; }

/**
 * Follow-Up Sequencing Service
 * 
 * Automatically schedules follow-up reminders for new leads:
 * - Day 3: First follow-up if no response
 * - Day 7: Second follow-up / escalation
 * - Day 14: Final follow-up / mark as cold
 * 
 * Each step checks if the lead has already been engaged before acting.
 */

const FOLLOW_UP_DAYS = [3, 7, 14] as const;

interface FollowUpContext {
  leadId: string;
  tenantId: string;
  assignedUserId: string;
  leadName: string;
  propertyTitle?: string;
  step: number; // 0, 1, 2
}

export class FollowUpService {

  /**
   * Schedule follow-up sequence for a new lead
   * Called after lead creation
   */
  static async scheduleSequence(context: {
    leadId: string;
    tenantId: string;
    assignedUserId: string;
    leadName: string;
    propertyTitle?: string;
  }): Promise<void> {
    if (!prisma) return;

    // Schedule first follow-up (Day 3)
    await this.scheduleStep({
      ...context,
      step: 0,
    });

    console.log(`📅 Follow-up sequence scheduled for lead ${context.leadId} (${context.leadName})`);
  }

  /**
   * Schedule a single follow-up step
   */
  private static async scheduleStep(context: FollowUpContext): Promise<void> {
    const dayOffset = FOLLOW_UP_DAYS[context.step];
    if (!dayOffset) return;

    const scheduleAt = new Date();
    scheduleAt.setDate(scheduleAt.getDate() + dayOffset);
    scheduleAt.setHours(9, 0, 0, 0); // 09:00 AM

    await SchedulerService.scheduleFollowUp({
      leadId: context.leadId,
      tenantId: context.tenantId,
      assignedUserId: context.assignedUserId,
      step: context.step,
      scheduleAt,
    });
  }

  /**
   * Execute a follow-up step (called by scheduler)
   * Checks if engagement happened, then acts accordingly
   */
  static async executeFollowUp(
    leadId: string,
    tenantId: string,
    step: number
  ): Promise<{ action: string; skipped: boolean }> {
    if (!prisma) return { action: 'no_prisma', skipped: true };

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        activities: {
          where: { 
            createdAt: { gte: new Date(Date.now() - FOLLOW_UP_DAYS[step] * 24 * 60 * 60 * 1000) }
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        property: { select: { id: true, title: true } },
      }
    });

    if (!lead) return { action: 'lead_not_found', skipped: true };

    // Skip if lead is already in an advanced status
    const skipStatuses: LeadStatus[] = ['LOST', 'BOOKED'];
    if (skipStatuses.includes(lead.status)) {
      return { action: `skipped_status_${lead.status}`, skipped: true };
    }

    // Check if there was meaningful engagement since last follow-up
    const engagementTypes = ['EMAIL_SENT', 'EMAIL_RECEIVED', 'VIEWING_SCHEDULED', 'NOTE_ADDED'];
    const hasEngagement = lead.activities.some(a => engagementTypes.includes(a.type));

    if (hasEngagement) {
      // Lead is being worked — schedule next step if available
      if (step + 1 < FOLLOW_UP_DAYS.length) {
        await this.scheduleStep({
          leadId,
          tenantId,
          assignedUserId: lead.assignedTo?.id || '',
          leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
          propertyTitle: lead.property?.title,
          step: step + 1,
        });
      }
      return { action: 'engaged_scheduled_next', skipped: true };
    }

    // No engagement — create follow-up reminder
    const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.email;
    const daysSinceCreation = FOLLOW_UP_DAYS[step];

    const descriptions: Record<number, string> = {
      0: `⏰ Follow-Up Tag ${daysSinceCreation}: ${leadName} hat noch keine Antwort erhalten`,
      1: `⏰ Follow-Up Tag ${daysSinceCreation}: ${leadName} — zweite Erinnerung, Eskalation empfohlen`,
      2: `⏰ Follow-Up Tag ${daysSinceCreation}: ${leadName} — letzte Erinnerung, ggf. als "kalt" markieren`,
    };

    // Create activity log
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'NOTE_ADDED',
        description: descriptions[step] || `Follow-Up Tag ${daysSinceCreation}`,
        metadata: { followUpStep: step, daysSinceCreation } as any,
      }
    });

    // Create realtime notification for assigned user
    if (lead.assignedTo?.id) {
      try {
        await prisma.realtimeEvent.create({
          data: {
            tenantId,
            userId: lead.assignedTo.id,
            type: 'FOLLOW_UP_REMINDER',
            data: {
              leadId,
              leadName,
              step,
              daysSinceCreation,
              propertyTitle: lead.property?.title,
              message: descriptions[step],
            } as any,
          }
        });
      } catch (err) {
        console.error('Follow-up notification error:', err);
      }
    }

    // On final step (Day 14), auto-change status to COLD if still NEW
    if (step === FOLLOW_UP_DAYS.length - 1 && lead.status === 'NEW') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'LOST' }
      });

      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'STATUS_CHANGED',
          description: `Status automatisch auf LOST gesetzt (kein Follow-Up nach ${daysSinceCreation} Tagen)`,
          metadata: { oldStatus: 'NEW', newStatus: 'LOST', automated: true } as any,
        }
      });
    }

    // Schedule next step if available
    if (step + 1 < FOLLOW_UP_DAYS.length) {
      await this.scheduleStep({
        leadId,
        tenantId,
        assignedUserId: lead.assignedTo?.id || '',
        leadName,
        propertyTitle: lead.property?.title,
        step: step + 1,
      });
    }

    return { action: `follow_up_step_${step}_created`, skipped: false };
  }
}
