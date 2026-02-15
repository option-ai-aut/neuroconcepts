import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { AiCostService } from './AiCostService';

let prisma: PrismaClient;
export function setEmbeddingPrisma(client: PrismaClient) { prisma = client; }

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions, cheapest
const EMBEDDING_DIMENSIONS = 1536;

// Batch size for bulk embedding generation
const BATCH_SIZE = 20;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
}

// ═══════════════════════════════════════════════════════════
// Core: Generate embedding vector from text
// ═══════════════════════════════════════════════════════════

export class EmbeddingService {

  /**
   * Generate embedding for a single text
   */
  static async generateEmbedding(text: string, tenantId?: string): Promise<number[]> {
    const openai = getOpenAI();
    const startTime = Date.now();

    // Truncate to ~8000 tokens (~32000 chars) to stay within model limits
    const truncated = text.substring(0, 32000);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // Log cost
    AiCostService.logUsage({
      provider: 'openai',
      model: EMBEDDING_MODEL,
      endpoint: 'embedding',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: 0,
      durationMs: Date.now() - startTime,
      tenantId,
    }).catch(() => {});

    return response.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts (batched)
   */
  static async generateEmbeddings(texts: string[], tenantId?: string): Promise<number[][]> {
    const openai = getOpenAI();
    const startTime = Date.now();

    const truncated = texts.map(t => t.substring(0, 32000));

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    AiCostService.logUsage({
      provider: 'openai',
      model: EMBEDDING_MODEL,
      endpoint: 'embedding-batch',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: 0,
      durationMs: Date.now() - startTime,
      tenantId,
    }).catch(() => {});

    return response.data.map(d => d.embedding);
  }

  // ═══════════════════════════════════════════════════════════
  // Upsert: Store embedding for an entity
  // ═══════════════════════════════════════════════════════════

  /**
   * Create or update embedding for a property/lead
   */
  static async upsertEmbedding(
    tenantId: string,
    entityType: 'property' | 'lead',
    entityId: string,
    text: string
  ): Promise<void> {
    if (!prisma) return;
    if (!text || text.trim().length < 10) return; // Skip empty/trivial content

    try {
      const embedding = await this.generateEmbedding(text, tenantId);
      const vectorStr = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(`
        INSERT INTO "Embedding" ("id", "tenantId", "entityType", "entityId", "content", "embedding", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, now())
        ON CONFLICT ("entityType", "entityId") 
        DO UPDATE SET "content" = $4, "embedding" = $5::vector, "updatedAt" = now()
      `, tenantId, entityType, entityId, text, vectorStr);

      console.log(`📐 Embedding upserted: ${entityType}/${entityId} (${text.length} chars)`);
    } catch (error) {
      console.error(`Embedding upsert failed for ${entityType}/${entityId}:`, error);
    }
  }

  /**
   * Delete embedding for an entity
   */
  static async deleteEmbedding(entityType: string, entityId: string): Promise<void> {
    if (!prisma) return;
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "Embedding" WHERE "entityType" = $1 AND "entityId" = $2`,
        entityType, entityId
      );
    } catch (error) {
      console.error(`Embedding delete failed:`, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Search: Semantic similarity search
  // ═══════════════════════════════════════════════════════════

  /**
   * Semantic search across properties and/or leads
   * Returns top-N most similar entities
   */
  static async semanticSearch(
    query: string,
    tenantId: string,
    options: {
      entityType?: 'property' | 'lead' | 'all';
      limit?: number;
      minScore?: number;
    } = {}
  ): Promise<{ entityType: string; entityId: string; content: string; score: number }[]> {
    if (!prisma) return [];

    const { entityType = 'all', limit = 10, minScore = 0.3 } = options;
    
    const queryEmbedding = await this.generateEmbedding(query, tenantId);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const typeFilter = entityType !== 'all' ? `AND "entityType" = '${entityType}'` : '';

    const results: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        "entityType",
        "entityId",
        "content",
        1 - ("embedding" <=> $1::vector) as score
      FROM "Embedding"
      WHERE "tenantId" = $2 ${typeFilter}
        AND 1 - ("embedding" <=> $1::vector) > $3
      ORDER BY "embedding" <=> $1::vector
      LIMIT $4
    `, vectorStr, tenantId, minScore, limit);

    return results.map(r => ({
      entityType: r.entityType,
      entityId: r.entityId,
      content: r.content,
      score: parseFloat(r.score),
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // Helpers: Build text representations for embedding
  // ═══════════════════════════════════════════════════════════

  /**
   * Build searchable text from a property
   */
  static buildPropertyText(property: any): string {
    const parts: string[] = [];
    if (property.title) parts.push(`Titel: ${property.title}`);
    if (property.propertyType) parts.push(`Typ: ${property.propertyType}`);
    if (property.marketingType) parts.push(`Marketing: ${property.marketingType}`);
    if (property.address) parts.push(`Adresse: ${property.address}`);
    if (property.city) parts.push(`Stadt: ${property.city}`);
    if (property.zipCode) parts.push(`PLZ: ${property.zipCode}`);
    if (property.price) parts.push(`Preis: ${property.price}€`);
    if (property.salePrice) parts.push(`Kaufpreis: ${property.salePrice}€`);
    if (property.rentCold) parts.push(`Kaltmiete: ${property.rentCold}€`);
    if (property.rooms) parts.push(`Zimmer: ${property.rooms}`);
    if (property.area) parts.push(`Fläche: ${property.area}m²`);
    if (property.livingArea) parts.push(`Wohnfläche: ${property.livingArea}m²`);
    if (property.plotArea) parts.push(`Grundstück: ${property.plotArea}m²`);
    if (property.description) parts.push(`Beschreibung: ${property.description.substring(0, 2000)}`);
    if (property.features) {
      const feats = Array.isArray(property.features) ? property.features : [];
      if (feats.length > 0) parts.push(`Features: ${feats.join(', ')}`);
    }
    if (property.status) parts.push(`Status: ${property.status}`);
    if (property.energyEfficiencyClass) parts.push(`Energieklasse: ${property.energyEfficiencyClass}`);
    if (property.yearBuilt) parts.push(`Baujahr: ${property.yearBuilt}`);
    if (property.district) parts.push(`Bezirk: ${property.district}`);
    return parts.join('. ');
  }

  /**
   * Build searchable text from a lead
   */
  static buildLeadText(lead: any): string {
    const parts: string[] = [];
    if (lead.firstName || lead.lastName) parts.push(`Name: ${lead.firstName || ''} ${lead.lastName || ''}`);
    if (lead.email) parts.push(`Email: ${lead.email}`);
    if (lead.phone) parts.push(`Telefon: ${lead.phone}`);
    if (lead.source) parts.push(`Quelle: ${lead.source}`);
    if (lead.status) parts.push(`Status: ${lead.status}`);
    if (lead.budgetMin || lead.budgetMax) parts.push(`Budget: ${lead.budgetMin || '?'}€ - ${lead.budgetMax || '?'}€`);
    if (lead.preferredLocation) parts.push(`Wunschort: ${lead.preferredLocation}`);
    if (lead.preferredType) parts.push(`Wunschtyp: ${lead.preferredType}`);
    if (lead.minRooms) parts.push(`Min. Zimmer: ${lead.minRooms}`);
    if (lead.minArea) parts.push(`Min. Fläche: ${lead.minArea}m²`);
    if (lead.message) parts.push(`Nachricht: ${lead.message.substring(0, 1000)}`);
    if (lead.notes) parts.push(`Notizen: ${lead.notes.substring(0, 1000)}`);
    if (lead.timeFrame) parts.push(`Zeitrahmen: ${lead.timeFrame}`);
    if (lead.financingStatus) parts.push(`Finanzierung: ${lead.financingStatus}`);
    return parts.join('. ');
  }

  // ═══════════════════════════════════════════════════════════
  // Bulk: Embed all existing properties/leads for a tenant
  // ═══════════════════════════════════════════════════════════

  static async embedAllProperties(tenantId: string): Promise<number> {
    if (!prisma) return 0;
    
    const properties = await prisma.property.findMany({
      where: { tenantId },
      select: {
        id: true, title: true, propertyType: true, marketingType: true,
        address: true, city: true, zipCode: true, price: true, rooms: true,
        area: true, plotArea: true, description: true, features: true,
        status: true, energyEfficiencyClass: true, yearBuilt: true,
      }
    });

    let count = 0;
    for (let i = 0; i < properties.length; i += BATCH_SIZE) {
      const batch = properties.slice(i, i + BATCH_SIZE);
      const texts = batch.map(p => this.buildPropertyText(p));
      const embeddings = await this.generateEmbeddings(texts, tenantId);

      for (let j = 0; j < batch.length; j++) {
        const vectorStr = `[${embeddings[j].join(',')}]`;
        await prisma.$executeRawUnsafe(`
          INSERT INTO "Embedding" ("id", "tenantId", "entityType", "entityId", "content", "embedding", "updatedAt")
          VALUES (gen_random_uuid()::text, $1, 'property', $2, $3, $4::vector, now())
          ON CONFLICT ("entityType", "entityId")
          DO UPDATE SET "content" = $3, "embedding" = $4::vector, "updatedAt" = now()
        `, tenantId, batch[j].id, texts[j], vectorStr);
        count++;
      }
    }

    console.log(`📐 Embedded ${count} properties for tenant ${tenantId}`);
    return count;
  }

  static async embedAllLeads(tenantId: string): Promise<number> {
    if (!prisma) return 0;
    
    const leads = await prisma.lead.findMany({
      where: { tenantId },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        source: true, status: true, budgetMin: true, budgetMax: true,
        preferredLocation: true, minRooms: true, minArea: true, notes: true,
        timeFrame: true, financingStatus: true,
      }
    });

    let count = 0;
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      const texts = batch.map(l => this.buildLeadText(l));
      const embeddings = await this.generateEmbeddings(texts, tenantId);

      for (let j = 0; j < batch.length; j++) {
        const vectorStr = `[${embeddings[j].join(',')}]`;
        await prisma.$executeRawUnsafe(`
          INSERT INTO "Embedding" ("id", "tenantId", "entityType", "entityId", "content", "embedding", "updatedAt")
          VALUES (gen_random_uuid()::text, $1, 'lead', $2, $3, $4::vector, now())
          ON CONFLICT ("entityType", "entityId")
          DO UPDATE SET "content" = $3, "embedding" = $4::vector, "updatedAt" = now()
        `, tenantId, batch[j].id, texts[j], vectorStr);
        count++;
      }
    }

    console.log(`📐 Embedded ${count} leads for tenant ${tenantId}`);
    return count;
  }
}
