/**
 * LeadEnrichmentService — Enriches lead data using available information.
 * Checks for duplicate leads, normalizes data, calculates completeness score.
 */

import { PrismaClient } from '@prisma/client';

let _prisma: PrismaClient | null = null;

export function setLeadEnrichmentPrisma(p: PrismaClient) {
  _prisma = p;
}
function getPrisma(): PrismaClient {
  if (!_prisma) throw new Error('LeadEnrichmentService: Prisma not injected');
  return _prisma;
}

export interface EnrichmentResult {
  duplicateLeadId?: string;
  isDuplicate: boolean;
  normalizedPhone?: string;
  completenessScore: number; // 0-100
  completenessFactors: Record<string, boolean>;
  enrichedFields: string[];
}

export class LeadEnrichmentService {
  /**
   * Enrich a newly created lead
   */
  static async enrichLead(leadId: string, tenantId: string): Promise<EnrichmentResult> {
    const prisma = getPrisma();
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const enrichedFields: string[] = [];
    const updateData: Record<string, any> = {};

    // 1. Check for duplicates (same email, same tenant)
    let isDuplicate = false;
    let duplicateLeadId: string | undefined;

    if (lead.email && !lead.email.startsWith('unknown-')) {
      const existing = await prisma.lead.findFirst({
        where: {
          tenantId,
          email: lead.email,
          id: { not: leadId },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        isDuplicate = true;
        duplicateLeadId = existing.id;
        console.log(`🔍 Enrichment: Duplicate detected — Lead ${leadId} matches ${existing.id}`);

        // Merge missing data from existing lead
        if (!lead.phone && existing.phone) {
          updateData.phone = existing.phone;
          enrichedFields.push('phone (from duplicate)');
        }
        if (!lead.firstName && existing.firstName) {
          updateData.firstName = existing.firstName;
          enrichedFields.push('firstName (from duplicate)');
        }
        if (!lead.lastName && existing.lastName) {
          updateData.lastName = existing.lastName;
          enrichedFields.push('lastName (from duplicate)');
        }
      }
    }

    // 2. Normalize phone number
    if (lead.phone || updateData.phone) {
      const raw = (updateData.phone || lead.phone) as string;
      const normalized = LeadEnrichmentService.normalizePhone(raw);
      if (normalized !== raw) {
        updateData.phone = normalized;
        enrichedFields.push('phone (normalized)');
      }
    }

    // 3. Calculate completeness score
    const factors: Record<string, boolean> = {
      hasEmail: !!(lead.email && !lead.email.startsWith('unknown-')),
      hasFirstName: !!(lead.firstName || updateData.firstName),
      hasLastName: !!(lead.lastName || updateData.lastName),
      hasPhone: !!(lead.phone || updateData.phone),
      hasProperty: !!lead.propertyId,
      hasSource: !!lead.source,
      hasNotes: !!(lead.notes && lead.notes.length > 10),
      hasBudget: !!(lead.budgetMin || lead.budgetMax),
    };

    const completenessScore = Math.round(
      (Object.values(factors).filter(Boolean).length / Object.keys(factors).length) * 100
    );

    // 4. Apply updates
    if (Object.keys(updateData).length > 0) {
      await prisma.lead.update({ where: { id: leadId }, data: updateData });
      console.log(`🔍 Enrichment: Updated lead ${leadId} with: ${enrichedFields.join(', ')}`);
    }

    return {
      isDuplicate,
      duplicateLeadId,
      normalizedPhone: updateData.phone || lead.phone || undefined,
      completenessScore,
      completenessFactors: factors,
      enrichedFields,
    };
  }

  /**
   * Normalize a German/Austrian/Swiss phone number
   */
  static normalizePhone(phone: string): string {
    // Remove all non-digit chars except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Convert 00xx to +xx
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    }

    // Convert 0xxx to +49xxx (assume Germany if no country code)
    if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
      cleaned = '+49' + cleaned.substring(1);
    }

    // Format: +49 xxx xxxxxxx
    if (cleaned.startsWith('+49') && cleaned.length >= 12) {
      const cc = cleaned.substring(0, 3);
      const area = cleaned.substring(3, 6);
      const number = cleaned.substring(6);
      return `${cc} ${area} ${number}`;
    }

    // Format: +43 (Austria)
    if (cleaned.startsWith('+43') && cleaned.length >= 11) {
      const cc = cleaned.substring(0, 3);
      const rest = cleaned.substring(3);
      return `${cc} ${rest}`;
    }

    // Format: +41 (Switzerland)
    if (cleaned.startsWith('+41') && cleaned.length >= 11) {
      const cc = cleaned.substring(0, 3);
      const rest = cleaned.substring(3);
      return `${cc} ${rest}`;
    }

    return cleaned;
  }
}

export default LeadEnrichmentService;
