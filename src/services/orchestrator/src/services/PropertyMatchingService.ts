/**
 * PropertyMatchingService - Matches incoming leads to properties
 * 
 * Uses OpenImmo externalIds, address matching, rule-based filtering,
 * and pgvector semantic similarity for property recommendations.
 */

import { PrismaClient, Property } from '@prisma/client';
import { EmbeddingService } from './EmbeddingService';

let prisma: PrismaClient;

export function setPropertyMatchingPrisma(client: PrismaClient) {
  prisma = client;
}

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export interface PropertyRef {
  type: 'PORTAL_ID' | 'ADDRESS' | 'TITLE';
  value: string;
  portal?: string;
}

export interface MatchResult {
  property: Property | null;
  matchType: 'EXACT_ID' | 'ADDRESS' | 'TITLE' | 'NONE';
  confidence: number; // 0-100
}

/**
 * Find a property matching the given reference
 */
export async function matchProperty(
  tenantId: string,
  ref: PropertyRef
): Promise<MatchResult> {
  if (!ref || !ref.value) {
    return { property: null, matchType: 'NONE', confidence: 0 };
  }

  // 1. Try exact portal ID match (highest confidence)
  if (ref.type === 'PORTAL_ID' && ref.portal) {
    const property = await matchByPortalId(tenantId, ref.portal, ref.value);
    if (property) {
      return { property, matchType: 'EXACT_ID', confidence: 100 };
    }
  }

  // 2. Try address match
  if (ref.type === 'ADDRESS' || ref.type === 'PORTAL_ID') {
    const property = await matchByAddress(tenantId, ref.value);
    if (property) {
      return { property, matchType: 'ADDRESS', confidence: 80 };
    }
  }

  // 3. Try title match
  if (ref.type === 'TITLE') {
    const property = await matchByTitle(tenantId, ref.value);
    if (property) {
      return { property, matchType: 'TITLE', confidence: 60 };
    }
  }

  // 4. No match found
  return { property: null, matchType: 'NONE', confidence: 0 };
}

/**
 * Match by portal-specific external ID
 * Currently not implemented as externalIds field doesn't exist yet.
 * Will be added when OpenImmo/FTP sync is implemented.
 */
async function matchByPortalId(
  tenantId: string,
  portal: string,
  portalId: string
): Promise<Property | null> {
  // TODO: Implement when externalIds field is added to Property model
  // For now, try to match by searching the portalId in title or notes
  
  const properties = await getPrisma().property.findMany({
    where: { 
      tenantId,
      OR: [
        { title: { contains: portalId, mode: 'insensitive' } },
        { description: { contains: portalId, mode: 'insensitive' } },
      ]
    },
  });

  return properties.length > 0 ? properties[0] : null;
}

/**
 * Match by address (fuzzy matching)
 */
async function matchByAddress(
  tenantId: string,
  addressQuery: string
): Promise<Property | null> {
  const normalizedQuery = normalizeAddress(addressQuery);

  // First try exact match on full address
  let property = await getPrisma().property.findFirst({
    where: {
      tenantId,
      address: { contains: normalizedQuery, mode: 'insensitive' },
    },
  });

  if (property) return property;

  // Try matching individual components
  const properties = await getPrisma().property.findMany({
    where: { tenantId },
  });

  // Score each property
  let bestMatch: Property | null = null;
  let bestScore = 0;

  for (const prop of properties) {
    const score = calculateAddressScore(prop, normalizedQuery);
    if (score > bestScore && score >= 50) {
      bestScore = score;
      bestMatch = prop;
    }
  }

  return bestMatch;
}

/**
 * Match by property title
 */
async function matchByTitle(
  tenantId: string,
  titleQuery: string
): Promise<Property | null> {
  const normalizedQuery = titleQuery.toLowerCase().trim();

  return await getPrisma().property.findFirst({
    where: {
      tenantId,
      title: { contains: normalizedQuery, mode: 'insensitive' },
    },
  });
}

/**
 * Normalize address for comparison
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/str\./g, 'straße')
    .replace(/str$/g, 'straße')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate match score between property and address query
 */
function calculateAddressScore(property: Property, query: string): number {
  let score = 0;
  const queryLower = query.toLowerCase();

  // Check street
  if (property.street && queryLower.includes(property.street.toLowerCase())) {
    score += 30;
  }

  // Check city
  if (property.city && queryLower.includes(property.city.toLowerCase())) {
    score += 25;
  }

  // Check zip code
  if (property.zipCode && queryLower.includes(property.zipCode)) {
    score += 25;
  }

  // Check house number
  if (property.houseNumber && queryLower.includes(property.houseNumber)) {
    score += 20;
  }

  // Check full address field
  if (property.address && queryLower.includes(property.address.toLowerCase())) {
    score = Math.max(score, 70);
  }

  return score;
}

// ═══════════════════════════════════════════════════════════
// Phase 3.2: Intelligent Property Recommendations
// Combines rule-based filtering + pgvector semantic similarity
// ═══════════════════════════════════════════════════════════

export interface PropertyRecommendation {
  property: {
    id: string;
    title: string;
    address: string;
    price: any;
    rooms: number | null;
    area: number | null;
    propertyType: string;
    marketingType: string;
    status: string;
  };
  score: number; // 0-100
  reasons: string[];
}

/**
 * Get property recommendations for a lead based on their preferences
 */
export async function getPropertyRecommendations(
  tenantId: string,
  leadId: string,
  limit: number = 5
): Promise<PropertyRecommendation[]> {
  const db = getPrisma();

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      budgetMin: true, budgetMax: true, preferredType: true,
      preferredLocation: true, minRooms: true, minArea: true,
      notes: true, timeFrame: true,
    }
  });

  if (!lead) return [];

  // Step 1: Get all active properties for tenant
  const properties = await db.property.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: {
      id: true, title: true, address: true, price: true, salePrice: true,
      rentCold: true, rooms: true, area: true, livingArea: true,
      propertyType: true, marketingType: true, status: true,
      city: true, district: true, zipCode: true,
    }
  });

  // Step 2: Rule-based scoring
  const scored = properties.map(prop => {
    let score = 0;
    const reasons: string[] = [];

    // Budget match (max 30 points)
    const propPrice = parseFloat(String(prop.salePrice || prop.rentCold || prop.price || 0));
    if (propPrice > 0 && (lead.budgetMin || lead.budgetMax)) {
      const min = lead.budgetMin ? parseFloat(String(lead.budgetMin)) : 0;
      const max = lead.budgetMax ? parseFloat(String(lead.budgetMax)) : Infinity;
      if (propPrice >= min && propPrice <= max) {
        score += 30;
        reasons.push('Budget passt');
      } else if (propPrice <= max * 1.15) {
        score += 15;
        reasons.push('Budget knapp passend');
      }
    }

    // Property type match (max 25 points)
    if (lead.preferredType && prop.propertyType === lead.preferredType) {
      score += 25;
      reasons.push('Objekttyp passt');
    }

    // Location match (max 20 points)
    if (lead.preferredLocation) {
      const loc = lead.preferredLocation.toLowerCase();
      if (prop.city?.toLowerCase().includes(loc) || prop.district?.toLowerCase().includes(loc) || prop.zipCode?.includes(loc) || prop.address?.toLowerCase().includes(loc)) {
        score += 20;
        reasons.push('Lage passt');
      }
    }

    // Rooms match (max 15 points)
    const propRooms = prop.rooms || 0;
    if (lead.minRooms && propRooms >= lead.minRooms) {
      score += 15;
      reasons.push(`${propRooms} Zimmer (min. ${lead.minRooms})`);
    }

    // Area match (max 10 points)
    const propArea = prop.livingArea || prop.area || 0;
    if (lead.minArea && propArea >= lead.minArea) {
      score += 10;
      reasons.push(`${propArea}m² (min. ${lead.minArea}m²)`);
    }

    return {
      property: {
        id: prop.id,
        title: prop.title,
        address: prop.address,
        price: prop.salePrice || prop.rentCold || prop.price,
        rooms: prop.rooms,
        area: prop.livingArea || prop.area,
        propertyType: prop.propertyType,
        marketingType: prop.marketingType,
        status: prop.status,
      },
      score,
      reasons,
    };
  });

  // Step 3: If lead has notes/preferences text, boost with semantic similarity
  if (lead.notes || lead.preferredLocation || lead.preferredType) {
    const queryText = [
      lead.preferredType ? `Typ: ${lead.preferredType}` : '',
      lead.preferredLocation ? `Lage: ${lead.preferredLocation}` : '',
      lead.minRooms ? `Zimmer: ${lead.minRooms}+` : '',
      lead.minArea ? `Fläche: ${lead.minArea}m²+` : '',
      lead.notes || '',
    ].filter(Boolean).join('. ');

    try {
      const semanticResults = await EmbeddingService.semanticSearch(queryText, tenantId, {
        entityType: 'property', limit: 10, minScore: 0.2,
      });

      // Boost scores for semantically matching properties
      for (const sr of semanticResults) {
        const match = scored.find(s => s.property.id === sr.entityId);
        if (match) {
          const semanticBoost = Math.round(sr.score * 20); // up to 20 bonus points
          match.score += semanticBoost;
          if (semanticBoost >= 10) match.reasons.push(`Semantisch relevant (${(sr.score * 100).toFixed(0)}%)`);
        }
      }
    } catch {
      // Semantic search is optional, don't fail if embeddings aren't available
    }
  }

  // Sort by score, return top N
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get all properties for a tenant (for selection UI)
 */
export async function getPropertiesForSelection(tenantId: string): Promise<Array<{
  id: string;
  label: string;
  address: string;
}>> {
  const properties = await getPrisma().property.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      address: true,
      street: true,
      houseNumber: true,
      city: true,
    },
    orderBy: { title: 'asc' },
  });

  return properties.map(p => ({
    id: p.id,
    label: p.title,
    address: p.address || [p.street, p.houseNumber, p.city].filter(Boolean).join(' '),
  }));
}
