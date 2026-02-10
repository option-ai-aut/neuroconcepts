/**
 * PropertyMatchingService - Matches incoming leads to properties
 * 
 * Uses OpenImmo externalIds (from FTP sync) and address matching
 * to find the correct property for an incoming lead.
 */

import { PrismaClient, Property } from '@prisma/client';

const prisma = new PrismaClient();

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
  
  const properties = await prisma.property.findMany({
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
  let property = await prisma.property.findFirst({
    where: {
      tenantId,
      address: { contains: normalizedQuery, mode: 'insensitive' },
    },
  });

  if (property) return property;

  // Try matching individual components
  const properties = await prisma.property.findMany({
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

  return await prisma.property.findFirst({
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

/**
 * Get all properties for a tenant (for selection UI)
 */
export async function getPropertiesForSelection(tenantId: string): Promise<Array<{
  id: string;
  label: string;
  address: string;
}>> {
  const properties = await prisma.property.findMany({
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
