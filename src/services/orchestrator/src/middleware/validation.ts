import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { z } from 'zod';

/**
 * Express middleware that validates req.body against a Zod schema.
 * Returns 400 with field-level errors on failure; attaches validated data on success.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates req.query against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
  };
}

// ============================================================
// Reusable schemas for common endpoints
// ============================================================

const emailSchema = z.string().email().max(320);

export const schemas = {
  // Auth
  inviteSeat: z.object({
    email: emailSchema,
    role: z.enum(['ADMIN', 'AGENT', 'VIEWER']).optional().default('AGENT'),
  }),

  // User settings
  updateUserSettings: z.object({
    emailNotifications: z.boolean().optional(),
    locale: z.string().max(10).optional(),
    emailSignature: z.string().max(10000).optional().nullable(),
    emailSignatureName: z.string().max(200).optional().nullable(),
    viewingPreferences: z.object({
      enabled: z.boolean().optional(),
      weekdays: z.array(z.number().int().min(0).max(6)).optional(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      slotDuration: z.number().int().min(10).max(240).optional(),
      bufferTime: z.number().int().min(0).max(120).optional(),
    }).optional(),
  }),

  // Tenant settings
  updateTenantSettings: z.object({
    autoReplyEnabled: z.boolean().optional(),
    autoReplyDelay: z.number().int().min(0).max(60).optional(),
    aiDisclosureEnabled: z.boolean().optional(),
    calendarShareTeam: z.boolean().optional(),
  }),

  // Lead
  createLead: z.object({
    email: emailSchema.optional(),
    firstName: z.string().max(200).optional(),
    lastName: z.string().max(200).optional(),
    phone: z.string().max(50).optional(),
    source: z.string().max(100).optional(),
    notes: z.string().max(10000).optional(),
    status: z.string().max(50).optional(),
    propertyId: z.string().uuid().optional().nullable(),
  }),

  updateLead: z.object({
    email: emailSchema.optional(),
    firstName: z.string().max(200).optional(),
    lastName: z.string().max(200).optional(),
    phone: z.string().max(50).optional(),
    source: z.string().max(100).optional(),
    notes: z.string().max(10000).optional(),
    status: z.string().max(50).optional(),
    propertyId: z.string().uuid().optional().nullable(),
    assignedToId: z.string().optional().nullable(),
  }),

  // Lead email
  sendLeadEmail: z.object({
    subject: z.string().min(1).max(500),
    body: z.string().min(1).max(50000),
    to: emailSchema.optional(),
  }),

  // Property
  createProperty: z.object({
    title: z.string().min(1).max(500),
    address: z.string().max(500).optional(),
    propertyType: z.string().max(100).optional(),
    status: z.string().max(50).optional(),
    price: z.number().optional().nullable(),
    livingArea: z.number().optional().nullable(),
    plotArea: z.number().optional().nullable(),
    rooms: z.number().optional().nullable(),
    bedrooms: z.number().optional().nullable(),
    bathrooms: z.number().optional().nullable(),
    description: z.string().max(50000).optional(),
    features: z.array(z.string().max(200)).optional(),
  }).passthrough(),

  updateProperty: z.object({
    title: z.string().min(1).max(500).optional(),
    address: z.string().max(500).optional(),
    propertyType: z.string().max(100).optional(),
    status: z.string().max(50).optional(),
    price: z.number().optional().nullable(),
    livingArea: z.number().optional().nullable(),
    plotArea: z.number().optional().nullable(),
    rooms: z.number().optional().nullable(),
    bedrooms: z.number().optional().nullable(),
    bathrooms: z.number().optional().nullable(),
    description: z.string().max(50000).optional(),
    features: z.array(z.string().max(200)).optional(),
  }).passthrough(),

  // Chat
  chatMessage: z.object({
    message: z.string().min(1).max(10000),
    conversationId: z.string().optional(),
  }),

  // Channel message
  channelMessage: z.object({
    content: z.string().min(1).max(10000),
    parentMessageId: z.string().optional(),
  }),

  // Expose template
  createExposeTemplate: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    theme: z.string().max(50).optional(),
    blocks: z.array(z.any()).optional(),
  }).passthrough(),

  // Portal connection
  createPortalConnection: z.object({
    portalId: z.string(),
    connectionType: z.string().max(50),
    credentials: z.record(z.string(), z.any()).optional(),
  }).passthrough(),

  // Admin DB migrate
  adminMigrate: z.object({
    version: z.string().min(1).max(50),
  }),
};
