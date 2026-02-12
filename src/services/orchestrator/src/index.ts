// Load .env.local first (for local dev), then .env as fallback
// IMPORTANT: Must be before any other imports that read env vars!
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // This won't override existing values from .env.local

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import serverless from 'serverless-http';
import { PrismaClient, Prisma, ActivityType, PortalConnectionType } from '@prisma/client';
import { TemplateService, setPrismaClient as setTemplatePrisma } from './services/TemplateService';
import { OpenAIService } from './services/OpenAIService';
import { PdfService } from './services/PdfService';
import { encryptionService } from './services/EncryptionService';
import { ConversationMemory, setPrismaClient as setConversationPrisma } from './services/ConversationMemory';
import { CalendarService } from './services/CalendarService';
import { setPrismaClient as setAiToolsPrisma } from './services/AiTools';
import { setJarvisActionPrisma } from './services/JarvisActionService';
import { setEmailResponsePrisma } from './services/EmailResponseHandler';
import { setEmailSyncPrisma } from './services/EmailSyncService';
import { setPropertyMatchingPrisma } from './services/PropertyMatchingService';
import { setNotificationPrisma } from './services/NotificationService';
import { authMiddleware, adminAuthMiddleware } from './middleware/auth';
import { AiSafetyMiddleware, wrapAiResponse } from './middleware/aiSafety';
import * as AWS from 'aws-sdk';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();

// Initialize Prisma - will be set up after getting DB credentials
let prisma: PrismaClient;

// Cache for app secrets
let appSecretsLoaded = false;

// Function to load app secrets from AWS Secrets Manager
async function loadAppSecrets() {
  if (appSecretsLoaded) return;
  
  // Skip in local dev - secrets come from .env.local
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    appSecretsLoaded = true;
    return;
  }
  
  if (process.env.APP_SECRET_ARN) {
    const secretsManager = new AWS.SecretsManager();
    try {
      const secret = await secretsManager.getSecretValue({ SecretId: process.env.APP_SECRET_ARN }).promise();
      if (secret.SecretString) {
        const secrets = JSON.parse(secret.SecretString);
        // Set environment variables from secrets — all keys stored in Secrets Manager
        const keysToLoad = [
          'DATABASE_URL',
          'OPENAI_API_KEY',
          'ENCRYPTION_KEY',
          'FRONTEND_URL',
          'GOOGLE_CALENDAR_CLIENT_ID',
          'GOOGLE_CALENDAR_CLIENT_SECRET',
          'GOOGLE_CALENDAR_REDIRECT_URI',
          'GOOGLE_EMAIL_REDIRECT_URI',
          'MICROSOFT_CLIENT_ID',
          'MICROSOFT_CLIENT_SECRET',
          'MICROSOFT_REDIRECT_URI',
          'MICROSOFT_EMAIL_REDIRECT_URI',
          'GEMINI_API_KEY',
          'RESEND_API_KEY',
          'WORKMAIL_EMAIL',
          'WORKMAIL_PASSWORD',
          'WORKMAIL_EWS_URL',
        ];
        for (const key of keysToLoad) {
          if (secrets[key]) process.env[key] = secrets[key];
        }
        console.log('✅ App secrets loaded from Secrets Manager:', keysToLoad.filter(k => !!secrets[k]).length, 'keys');
      }
    } catch (error) {
      console.error('Failed to load app secrets from Secrets Manager:', error);
      // Don't throw - some features may still work without all secrets
    }
  }
  
  appSecretsLoaded = true;
}

// Inject prisma client into all services
function injectPrismaIntoServices(client: PrismaClient) {
  setTemplatePrisma(client);
  setConversationPrisma(client);
  setAiToolsPrisma(client);
  setJarvisActionPrisma(client);
  setEmailResponsePrisma(client);
  setEmailSyncPrisma(client);
  setPropertyMatchingPrisma(client);
  setNotificationPrisma(client);
}

// Function to initialize Prisma with DATABASE_URL from AWS Secrets Manager
async function initializePrisma() {
  if (prisma) return prisma;
  
  // Load app secrets first
  await loadAppSecrets();
  
  // If DATABASE_URL is already set (from app secrets or local dev), use it
  if (process.env.DATABASE_URL) {
    prisma = new PrismaClient();
    injectPrismaIntoServices(prisma);
    return prisma;
  }
  
  // In Lambda, get credentials from DB Secret in Secrets Manager
  if (process.env.DB_SECRET_ARN) {
    const secretsManager = new AWS.SecretsManager();
    try {
      const secret = await secretsManager.getSecretValue({ SecretId: process.env.DB_SECRET_ARN }).promise();
      if (secret.SecretString) {
        const credentials = JSON.parse(secret.SecretString);
        const dbUrl = `postgresql://${credentials.username}:${credentials.password}@${credentials.host}:${credentials.port}/postgres?schema=public`;
        process.env.DATABASE_URL = dbUrl;
        prisma = new PrismaClient();
        injectPrismaIntoServices(prisma);
      }
    } catch (error) {
      console.error('Failed to get DB credentials from Secrets Manager:', error);
      throw error;
    }
  }
  
  if (!prisma) {
    prisma = new PrismaClient();
    injectPrismaIntoServices(prisma);
  }
  
  return prisma;
}

// Initialize Prisma on startup for local dev
if (!process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.DATABASE_URL) {
  prisma = new PrismaClient();
  injectPrismaIntoServices(prisma);
}

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION || 'eu-central-1'
});

// Middleware to ensure Prisma is initialized before handling requests
app.use(async (req, res, next) => {
  try {
    await initializePrisma();
    // Attach prisma to request for audit logging middleware
    (req as any).prismaClient = prisma;
    next();
  } catch (error) {
    console.error('Failed to initialize Prisma:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Protected database migration endpoint - creates tables if they don't exist
// This is the only way to run migrations on Aurora in a private VPC
// Seed portals into the database (for production where seed.ts can't run)
app.post('/admin/seed-portals', express.json({ limit: '1mb' }), async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ENCRYPTION_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const db = prisma || (await initializePrisma());

    // Ensure IDX enum value exists in the database
    try {
      await db.$executeRawUnsafe(`ALTER TYPE "PortalConnectionType" ADD VALUE IF NOT EXISTS 'IDX'`);
    } catch (e: any) {
      console.log('IDX enum may already exist:', e.message);
    }

    const portals: { name: string; slug: string; country: string; websiteUrl: string; connectionType: PortalConnectionType; isPremium: boolean; defaultFtpHost: string | null }[] = [
      // Deutschland (13)
      { name: 'ImmobilienScout24', slug: 'immoscout24-de', country: 'DE', websiteUrl: 'https://www.immobilienscout24.de', connectionType: PortalConnectionType.REST_API, isPremium: true, defaultFtpHost: null },
      { name: 'Immowelt', slug: 'immowelt', country: 'DE', websiteUrl: 'https://www.immowelt.de', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: 'ftp2.immowelt.net' },
      { name: 'Immonet', slug: 'immonet', country: 'DE', websiteUrl: 'https://www.immonet.de', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: 'ftp.immonet.de' },
      { name: 'Kleinanzeigen', slug: 'kleinanzeigen', country: 'DE', websiteUrl: 'https://www.kleinanzeigen.de', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'Kalaydo', slug: 'kalaydo', country: 'DE', websiteUrl: 'https://www.kalaydo.de', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'Immozentral', slug: 'immozentral', country: 'DE', websiteUrl: 'https://www.immozentral.com', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'Immopool', slug: 'immopool', country: 'DE', websiteUrl: 'https://www.immopool.de', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: '1A Immobilien', slug: '1a-immobilien', country: 'DE', websiteUrl: 'https://www.1a-immobilienmarkt.de', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'IVD24', slug: 'ivd24', country: 'DE', websiteUrl: 'https://www.ivd24immobilien.de', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'Neubau Kompass', slug: 'neubau-kompass', country: 'DE', websiteUrl: 'https://www.neubaukompass.de', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'Süddeutsche Zeitung', slug: 'sz-immo', country: 'DE', websiteUrl: 'https://immobilienmarkt.sueddeutsche.de', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'FAZ Immobilien', slug: 'faz-immo', country: 'DE', websiteUrl: 'https://fazimmo.faz.net', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'Welt Immobilien', slug: 'welt-immo', country: 'DE', websiteUrl: 'https://www.welt.de/immobilien', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      // Österreich (5)
      { name: 'Willhaben', slug: 'willhaben', country: 'AT', websiteUrl: 'https://www.willhaben.at', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'ImmobilienScout24 AT', slug: 'immoscout24-at', country: 'AT', websiteUrl: 'https://www.immobilienscout24.at', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'Immmo.at', slug: 'immmo-at', country: 'AT', websiteUrl: 'https://www.immmo.at', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'FindMyHome', slug: 'findmyhome', country: 'AT', websiteUrl: 'https://www.findmyhome.at', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      { name: 'Der Standard Immobilien', slug: 'derstandard-immo', country: 'AT', websiteUrl: 'https://immobilien.derstandard.at', connectionType: PortalConnectionType.OPENIMMO_FTP, isPremium: false, defaultFtpHost: null },
      // Schweiz (6)
      { name: 'Homegate', slug: 'homegate', country: 'CH', websiteUrl: 'https://www.homegate.ch', connectionType: PortalConnectionType.IDX, isPremium: false, defaultFtpHost: null },
      { name: 'ImmoScout24 CH', slug: 'immoscout24-ch', country: 'CH', websiteUrl: 'https://www.immoscout24.ch', connectionType: PortalConnectionType.IDX, isPremium: false, defaultFtpHost: null },
      { name: 'Comparis', slug: 'comparis', country: 'CH', websiteUrl: 'https://www.comparis.ch/immobilien', connectionType: PortalConnectionType.IDX, isPremium: false, defaultFtpHost: null },
      { name: 'Newhome', slug: 'newhome', country: 'CH', websiteUrl: 'https://www.newhome.ch', connectionType: PortalConnectionType.IDX, isPremium: false, defaultFtpHost: null },
      { name: 'ImmoStreet', slug: 'immostreet', country: 'CH', websiteUrl: 'https://www.immostreet.ch', connectionType: PortalConnectionType.IDX, isPremium: false, defaultFtpHost: null },
      { name: 'Flatfox', slug: 'flatfox', country: 'CH', websiteUrl: 'https://flatfox.ch', connectionType: PortalConnectionType.REST_API, isPremium: false, defaultFtpHost: null },
    ];

    let created = 0;
    let updated = 0;

    for (const portal of portals) {
      const existing = await db.portal.findUnique({ where: { slug: portal.slug } });
      if (existing) {
        await db.portal.update({ where: { slug: portal.slug }, data: portal });
        updated++;
      } else {
        await db.portal.create({ data: portal });
        created++;
      }
    }

    res.json({ success: true, created, updated, total: portals.length });
  } catch (error: any) {
    console.error('Error seeding portals:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/admin/db-migrate', express.json({ limit: '1mb' }), async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ENCRYPTION_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const db = prisma || (await initializePrisma());
    
    // Check if tables already exist
    const tables = await db.$queryRaw<any[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    const tableNames = tables.map((t: any) => t.tablename);
    
    if (tableNames.includes('User')) {
      return res.json({ message: 'Database already migrated', tables: tableNames });
    }
    
    // Run migration SQL statements one by one
    const migrationStatements = (req.body.sql as string).split(';').filter((s: string) => s.trim().length > 0);
    
    let executed = 0;
    const errors: string[] = [];
    
    for (const statement of migrationStatements) {
      try {
        await db.$executeRawUnsafe(statement.trim());
        executed++;
      } catch (err: any) {
        // Skip "already exists" errors
        if (err.message?.includes('already exists')) {
          continue;
        }
        errors.push(`Statement ${executed}: ${err.message}`);
      }
    }
    
    res.json({ success: true, executed, errors: errors.length > 0 ? errors : undefined });
  } catch (error: any) {
    console.error('Migration failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// CORS configuration - restrict to known origins in production
const allowedOrigins = [
  'http://localhost:3000',  // Local frontend dev
  'http://localhost:3001',  // Local backend dev
  process.env.FRONTEND_URL, // Production frontend
  'https://dev.immivo.ai',
  'https://app.immivo.ai',  // Production app subdomain
  'https://immivo.ai',
  'https://www.immivo.ai',
  'https://admin.immivo.ai', // Admin subdomain
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '20mb' }));

// Multer setup for file uploads (memory storage for S3 upload)
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME || '';

// Use memory storage — files go to S3, not disk
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype.startsWith('application/')) {
      cb(null, true);
    } else {
      cb(new Error('Dateityp nicht erlaubt'));
    }
  }
});

// S3 helpers
const s3Client = new AWS.S3();

// Extract S3 object key from any S3 URL format (with or without region)
function extractS3Key(url: string): string | null {
  // Matches: bucket.s3.amazonaws.com/key OR bucket.s3.REGION.amazonaws.com/key
  const match = url.match(/\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com\/(.+)$/);
  return match ? match[1] : null;
}

// Check if a URL is an S3 URL
function isS3Url(url: string): boolean {
  return /\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com\//.test(url);
}

// S3 helper: upload buffer to S3 and return public URL
async function uploadToS3(buffer: Buffer, filename: string, contentType: string, folder: string): Promise<string> {
  const key = `${folder}/${filename}`;
  
  if (MEDIA_BUCKET) {
    await s3Client.putObject({
      Bucket: MEDIA_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }).promise();
    
    // Return public S3 URL (with region for non-us-east-1 buckets)
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
    return `https://${MEDIA_BUCKET}.s3.${region}.amazonaws.com/${key}`;
  }
  
  // On Lambda, MEDIA_BUCKET must be set — local disk is ephemeral and will be lost
  if (isLambda) {
    throw new Error('MEDIA_BUCKET_NAME is not configured. Cannot upload files on Lambda without S3.');
  }
  
  // Fallback for local dev without S3: save to disk
  const localBaseDir = path.join(__dirname, '../uploads');
  const uploadDir = path.join(localBaseDir, folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

/**
 * Normalize image/file URLs stored in the DB.
 * Converts legacy /uploads/... paths to full S3 URLs so they load in production.
 */
function normalizeFileUrl(url: string, tenantId: string, propertyId: string, type: 'images' | 'floorplans' = 'images'): string {
  if (!url) return '';
  // Already a full URL — return as-is
  if (url.startsWith('http')) return url;
  // Legacy /uploads/ path — convert to S3 URL
  if (url.startsWith('/uploads/') && MEDIA_BUCKET) {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
    const stripped = url.replace(/^\/uploads\//, '');
    // If path already contains the full folder structure, use it directly
    if (stripped.startsWith('properties/')) {
      return `https://${MEDIA_BUCKET}.s3.${region}.amazonaws.com/${stripped}`;
    }
    // Otherwise, reconstruct the S3 key from just the filename
    const filename = stripped.split('/').pop() || stripped;
    return `https://${MEDIA_BUCKET}.s3.${region}.amazonaws.com/properties/${tenantId}/${propertyId}/${type}/${filename}`;
  }
  return url;
}

// Serve uploaded files
if (!isLambda) {
  // Local dev: serve from disk
  const localUploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(localUploadDir));
} else {
  // Lambda: redirect /uploads/* to S3 (handles legacy /uploads/ URLs still in DB)
  app.get('/uploads/*', async (req, res) => {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
    const rawPath = req.path.replace(/^\/uploads\//, '');

    if (!MEDIA_BUCKET) {
      return res.status(404).json({ error: 'Storage not configured' });
    }

    // Try direct key first (e.g. /uploads/properties/tenant/prop/images/file.jpg)
    try {
      await s3Client.headObject({ Bucket: MEDIA_BUCKET, Key: rawPath }).promise();
      return res.redirect(301, `https://${MEDIA_BUCKET}.s3.${region}.amazonaws.com/${rawPath}`);
    } catch { /* not found at this key, try filename search */ }

    // Try searching by filename across common prefixes
    const filename = rawPath.split('/').pop() || rawPath;
    try {
      const result = await s3Client.listObjectsV2({
        Bucket: MEDIA_BUCKET,
        MaxKeys: 5,
      }).promise();
      const match = result.Contents?.find(obj => obj.Key?.endsWith(`/${filename}`));
      if (match?.Key) {
        return res.redirect(301, `https://${MEDIA_BUCKET}.s3.${region}.amazonaws.com/${match.Key}`);
      }
    } catch { /* search failed */ }

    // File truly not found — return 404
    res.status(404).json({ error: 'File not found' });
  });
}

// --- Auth & User Management ---

// Sync User from Token (Create/Update in DB)
app.post('/auth/sync', authMiddleware, async (req, res) => {
  try {
    const { sub, email, given_name, family_name, address, phone_number } = req.user!;
    const companyName = req.user!['custom:company_name'];
    const postalCode = req.user!['custom:postal_code'];
    const city = req.user!['custom:city'];
    const country = req.user!['custom:country'];
    
    console.log('Auth sync for:', email, 'sub:', sub);
    
    // Handle address - Cognito may return it as object { formatted: "..." } or string
    let streetAddress: string | undefined;
    if (address) {
      if (typeof address === 'object' && address.formatted) {
        streetAddress = address.formatted;
      } else if (typeof address === 'string') {
        streetAddress = address;
      }
    }

    // Check if user exists in DB (by email)
    let user = await prisma.user.findUnique({ where: { email } });
    let tenantId = user?.tenantId;
    let needsOnboarding = false;

    if (!user) {
      // New User (self-signup) - create new tenant
      console.log('Creating new user and tenant for:', email);
      
      const newTenant = await prisma.tenant.create({
        data: {
          name: companyName || 'My Company',
        }
      });
      tenantId = newTenant.id;

      user = await prisma.user.create({
        data: {
          id: sub, // Use Cognito Sub as ID
          email,
          firstName: given_name,
          lastName: family_name,
          phone: phone_number,
          street: streetAddress,
          postalCode,
          city,
          country,
          tenantId: newTenant.id,
          role: 'ADMIN' // First user is Admin
        }
      });
      
      // Create default settings
      await prisma.tenantSettings.create({
        data: { tenantId: newTenant.id }
      });

      // Create default team chat channel with company name
      await prisma.channel.create({
        data: {
          name: companyName || 'Team',
          description: 'Standard-Channel für das gesamte Team',
          type: 'PUBLIC',
          isDefault: true,
          tenantId: newTenant.id,
          members: {
            create: [{ userId: user.id }]
          }
        }
      });
    } else {
      // Existing user - check if this is an invited user (Pending)
      const isPendingInvite = user.firstName === 'Pending' && user.lastName === 'Invite';
      
      if (isPendingInvite) {
        console.log('Invited user first login:', email);
        // Update the user ID to match Cognito sub (important!)
        // and mark for onboarding
        user = await prisma.user.update({
          where: { email },
          data: {
            id: sub, // Update to Cognito sub
            // Keep firstName/lastName as Pending until they complete onboarding
          }
        });
        needsOnboarding = true;
      } else {
        // Regular existing user - update with Cognito data if provided
        console.log('Existing user login:', email);
        user = await prisma.user.update({
          where: { email },
          data: {
            id: sub, // Ensure ID matches Cognito sub
            firstName: given_name || user.firstName,
            lastName: family_name || user.lastName,
            phone: phone_number || user.phone,
            street: streetAddress || user.street,
            postalCode: postalCode || user.postalCode,
            city: city || user.city,
            country: country || user.country,
          }
        });
      }
    }

    res.json({ user, tenantId, needsOnboarding });
  } catch (error) {
    console.error('Auth sync error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Current User Profile
app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.user!.email },
      include: { tenant: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Tenant Settings
app.get('/settings/tenant', authMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const currentUser = await db.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await db.tenantSettings.findUnique({
      where: { tenantId: currentUser.tenantId }
    });

    // If no settings exist, create them with a generated inboundLeadEmail
    if (!settings) {
      const emailPrefix = Math.random().toString(36).substring(2, 10);
      settings = await db.tenantSettings.create({
        data: {
          tenantId: currentUser.tenantId,
          inboundLeadEmail: emailPrefix
        }
      });
    }

    // If settings exist but no inboundLeadEmail, generate one
    if (settings && !settings.inboundLeadEmail) {
      const emailPrefix = Math.random().toString(36).substring(2, 10);
      settings = await db.tenantSettings.update({
        where: { id: settings.id },
        data: { inboundLeadEmail: emailPrefix }
      });
    }

    res.json({
      inboundLeadEmail: settings.inboundLeadEmail,
      autoReplyEnabled: settings.autoReplyEnabled,
      autoReplyDelay: settings.autoReplyDelay,
      calendarShareTeam: settings.calendarShareTeam,
    });
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dashboard Stats
app.get('/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ 
      where: { email: req.user!.email },
      include: { tenant: true }
    });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = currentUser.tenantId;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all leads for this tenant
    const leads = await prisma.lead.findMany({
      where: { tenantId },
      include: { property: true },
      orderBy: { createdAt: 'desc' }
    });

    // Get all properties for this tenant
    const properties = await prisma.property.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    // Get recent activities (last 10)
    const recentActivities = await prisma.leadActivity.findMany({
      where: {
        lead: { tenantId }
      },
      include: {
        lead: { select: { firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate stats
    const totalLeads = leads.length;
    const newLeadsToday = leads.filter(l => l.createdAt >= startOfToday).length;
    const newLeadsThisWeek = leads.filter(l => l.createdAt >= startOfWeek).length;
    const newLeadsThisMonth = leads.filter(l => l.createdAt >= startOfMonth).length;

    // Lead status breakdown (matches LeadStatus enum: NEW, CONTACTED, CONVERSATION, BOOKED, LOST)
    const leadsByStatus = {
      NEW: leads.filter(l => l.status === 'NEW').length,
      CONTACTED: leads.filter(l => l.status === 'CONTACTED').length,
      CONVERSATION: leads.filter(l => l.status === 'CONVERSATION').length,
      BOOKED: leads.filter(l => l.status === 'BOOKED').length,
      LOST: leads.filter(l => l.status === 'LOST').length,
    };

    // Property stats
    const totalProperties = properties.length;
    const activeProperties = properties.filter(p => p.status === 'ACTIVE').length;
    const reservedProperties = properties.filter(p => p.status === 'RESERVED').length;
    const soldProperties = properties.filter(p => p.status === 'SOLD').length;

    // Recent leads (last 5)
    const recentLeads = leads.slice(0, 5).map(l => ({
      id: l.id,
      name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || l.email,
      email: l.email,
      status: l.status,
      propertyTitle: l.property?.title || null,
      createdAt: l.createdAt
    }));

    // Leads needing attention (NEW status, oldest first)
    const leadsNeedingAttention = leads
      .filter(l => l.status === 'NEW')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || l.email,
        email: l.email,
        propertyTitle: l.property?.title || null,
        createdAt: l.createdAt,
        daysSinceCreated: Math.floor((now.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      }));

    res.json({
      user: {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        role: currentUser.role,
        tenantName: currentUser.tenant?.name
      },
      leads: {
        total: totalLeads,
        newToday: newLeadsToday,
        newThisWeek: newLeadsThisWeek,
        newThisMonth: newLeadsThisMonth,
        byStatus: leadsByStatus,
        needingAttention: leadsNeedingAttention,
        recent: recentLeads
      },
      properties: {
        total: totalProperties,
        active: activeProperties,
        reserved: reservedProperties,
        sold: soldProperties
      },
      activities: recentActivities.map(a => ({
        id: a.id,
        type: a.type,
        description: a.description,
        leadName: `${a.lead.firstName || ''} ${a.lead.lastName || ''}`.trim() || a.lead.email,
        createdAt: a.createdAt
      }))
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update Current User Profile
app.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone, street, postalCode, city, country } = req.body;
    
    const user = await prisma.user.update({
      where: { email: req.user!.email },
      data: {
        firstName,
        lastName,
        phone,
        street,
        postalCode,
        city,
        country
      },
      include: { tenant: true }
    });
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get User Settings
app.get('/me/settings', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    
    // Get user by email (more reliable than sub)
    const user = await db.user.findUnique({ where: { email: req.user!.email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let settings = await db.userSettings.findUnique({
      where: { userId: user.id }
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await db.userSettings.create({
        data: {
          userId: user.id,
          emailNotifications: true,
          viewingHoursEnabled: true,
          viewingHoursStart: '09:00',
          viewingHoursEnd: '18:00',
          viewingDays: [1, 2, 3, 4, 5],
          viewingDuration: 30,
          viewingBuffer: 15
        }
      });
    }

    // Return flat format for email settings page compatibility
    const response = {
      id: settings.id,
      emailNotifications: settings.emailNotifications,
      emailSignature: (settings as any).emailSignature,
      emailSignatureName: (settings as any).emailSignatureName,
      viewingPreferences: {
        enabled: settings.viewingHoursEnabled,
        weekdays: settings.viewingDays || [1, 2, 3, 4, 5],
        startTime: settings.viewingHoursStart || '09:00',
        endTime: settings.viewingHoursEnd || '18:00',
        slotDuration: settings.viewingDuration,
        bufferTime: settings.viewingBuffer
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update User Settings
app.put('/me/settings', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    
    // Get user by email (more reliable than sub)
    const user = await db.user.findUnique({ where: { email: req.user!.email } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { emailNotifications, viewingPreferences, emailSignature, emailSignatureName } = req.body;

    // Transform from frontend format to DB format
    const updateData: any = {};
    if (emailNotifications !== undefined) {
      updateData.emailNotifications = emailNotifications;
    }
    if (viewingPreferences) {
      updateData.viewingHoursEnabled = viewingPreferences.enabled ?? true;
      updateData.viewingHoursStart = viewingPreferences.startTime;
      updateData.viewingHoursEnd = viewingPreferences.endTime;
      updateData.viewingDays = viewingPreferences.weekdays;
      updateData.viewingDuration = viewingPreferences.slotDuration;
      updateData.viewingBuffer = viewingPreferences.bufferTime;
    }
    // Email signature fields
    if (emailSignature !== undefined) {
      updateData.emailSignature = emailSignature;
    }
    if (emailSignatureName !== undefined) {
      updateData.emailSignatureName = emailSignatureName;
    }

    const settings = await db.userSettings.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        emailNotifications: emailNotifications ?? true,
        viewingHoursEnabled: viewingPreferences?.enabled ?? true,
        viewingHoursStart: viewingPreferences?.startTime ?? '09:00',
        viewingHoursEnd: viewingPreferences?.endTime ?? '18:00',
        viewingDays: viewingPreferences?.weekdays ?? [1, 2, 3, 4, 5],
        viewingDuration: viewingPreferences?.slotDuration ?? 30,
        viewingBuffer: viewingPreferences?.bufferTime ?? 15,
        emailSignature: emailSignature ?? null,
        emailSignatureName: emailSignatureName ?? null,
      }
    });

    // Transform response to frontend format
    const response = {
      id: settings.id,
      emailNotifications: settings.emailNotifications,
      emailSignature: (settings as any).emailSignature,
      emailSignatureName: (settings as any).emailSignatureName,
      viewingPreferences: {
        enabled: settings.viewingHoursEnabled,
        weekdays: settings.viewingDays || [1, 2, 3, 4, 5],
        startTime: settings.viewingHoursStart || '09:00',
        endTime: settings.viewingHoursEnd || '18:00',
        slotDuration: settings.viewingDuration,
        bufferTime: settings.viewingBuffer
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// DSGVO: Data Export (Art. 20 - Datenübertragbarkeit)
// =====================================================
app.get('/account/export', authMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const user = await db.user.findUnique({ where: { email: req.user!.email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Collect all user data
    const [leads, emails, chats, activities, exposes, properties, notifications, auditLogs] = await Promise.all([
      db.lead.findMany({
        where: { tenantId: user.tenantId, assignedToId: user.id },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, source: true, notes: true, createdAt: true }
      }),
      db.email.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, from: true, to: true, subject: true, folder: true, sentAt: true, receivedAt: true, createdAt: true },
        take: 1000,
        orderBy: { createdAt: 'desc' }
      }),
      db.userChat.findMany({
        where: { userId: user.id },
        select: { id: true, role: true, content: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }),
      db.leadActivity.findMany({
        where: { createdBy: user.id },
        select: { id: true, type: true, description: true, createdAt: true },
        take: 500,
        orderBy: { createdAt: 'desc' }
      }),
      db.expose.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, status: true, theme: true, createdAt: true, updatedAt: true }
      }),
      db.property.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, title: true, address: true, propertyType: true, status: true, createdAt: true }
      }),
      db.notification.findMany({
        where: { userId: user.id },
        select: { id: true, type: true, title: true, message: true, read: true, createdAt: true },
        take: 500,
        orderBy: { createdAt: 'desc' }
      }),
      db.aiAuditLog.findMany({
        where: { userId: user.id },
        select: { id: true, endpoint: true, message: true, flagged: true, createdAt: true },
        take: 200,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      format: 'DSGVO Art. 20 - Datenübertragbarkeit',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        street: user.street,
        postalCode: user.postalCode,
        city: user.city,
        country: user.country,
      },
      leads,
      emails,
      chatHistory: chats,
      activities,
      exposes,
      properties,
      notifications,
      aiInteractions: auditLogs,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="immivo-datenexport-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (error: any) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// DSGVO: Account & Data Deletion (Art. 17 - Recht auf Löschung)
// =====================================================
app.delete('/account', authMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const user = await db.user.findUnique({ where: { email: req.user!.email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent SUPER_ADMIN self-deletion
    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super-Admin-Konten können nicht über die API gelöscht werden.' });
    }

    // If the user is the only ADMIN in their tenant, prevent deletion
    if (user.role === 'ADMIN') {
      const otherAdmins = await db.user.count({
        where: { tenantId: user.tenantId, role: 'ADMIN', id: { not: user.id } }
      });
      if (otherAdmins === 0) {
        return res.status(403).json({ error: 'Sie sind der einzige Admin. Bitte übertragen Sie die Admin-Rolle bevor Sie Ihr Konto löschen.' });
      }
    }

    // Delete user data in correct order (respecting foreign keys)
    await db.$transaction(async (tx) => {
      // 1. Delete user's chat history
      await tx.userChat.deleteMany({ where: { userId: user.id } });
      
      // 2. Delete conversation summaries
      await tx.conversationSummary.deleteMany({ where: { userId: user.id } });
      
      // 3. Delete notifications
      await tx.notification.deleteMany({ where: { userId: user.id } });
      
      // 4. Delete AI audit logs
      await tx.aiAuditLog.deleteMany({ where: { userId: user.id } });
      
      // 5. Delete channel memberships and messages
      await tx.channelMessage.deleteMany({ where: { userId: user.id } });
      await tx.channelMember.deleteMany({ where: { userId: user.id } });
      
      // 6. Delete property assignments
      await tx.propertyAssignment.deleteMany({ where: { userId: user.id } });
      
      // 7. Resolve/cancel pending actions
      await tx.jarvisPendingAction.updateMany({
        where: { userId: user.id, status: 'PENDING' },
        data: { status: 'CANCELLED', resolvedAt: new Date(), resolution: 'Account gelöscht' }
      });
      
      // 8. Unassign leads (don't delete - they belong to the tenant)
      await tx.lead.updateMany({
        where: { assignedToId: user.id },
        data: { assignedToId: null }
      });
      
      // 9. Delete user settings
      await tx.userSettings.deleteMany({ where: { userId: user.id } });
      
      // 10. Delete portal connections
      await tx.portalConnection.deleteMany({ where: { userId: user.id } });
      
      // 11. Finally delete the user
      await tx.user.delete({ where: { id: user.id } });
    });

    console.log(`🗑️ Account deleted: ${user.email} (${user.id})`);
    res.json({ success: true, message: 'Konto und alle persönlichen Daten wurden gelöscht.' });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Seats (Team Members)
// Presence heartbeat — updates lastSeenAt for the current user
app.post('/presence/heartbeat', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { lastSeenAt: new Date() }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/seats', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const seats = await prisma.user.findMany({
      where: { tenantId: currentUser.tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, lastSeenAt: true }
    });
    res.json(seats);
  } catch (error) {
    console.error('Get seats error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Invite Seat
app.post('/seats/invite', authMiddleware, async (req, res) => {
  try {
    const { email, role } = req.body;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only Admins can invite users' });
    }

    // Check if user already exists in our DB
    const existingDbUser = await prisma.user.findFirst({ where: { email } });
    if (existingDbUser) {
      return res.status(400).json({ error: 'Ein Benutzer mit dieser E-Mail existiert bereits' });
    }

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
    
    let sub: string | undefined;
    
    // Try to create user in Cognito
    try {
      const cognitoResponse = await cognito.adminCreateUser({
        UserPoolId: process.env.USER_POOL_ID!,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        DesiredDeliveryMediums: ['EMAIL'],
        TemporaryPassword: tempPassword,
      }).promise();
      
      sub = cognitoResponse.User?.Username;
      console.log('Cognito user created with sub:', sub);
    } catch (cognitoError: any) {
      if (cognitoError.code === 'UsernameExistsException') {
        // User exists in Cognito but not in DB - resend invite email and add to DB
        console.log('User exists in Cognito, resending invite...');
        try {
          // Resend the invite email
          const resendResponse = await cognito.adminCreateUser({
            UserPoolId: process.env.USER_POOL_ID!,
            Username: email,
            MessageAction: 'RESEND',
            DesiredDeliveryMediums: ['EMAIL'],
          }).promise();
          sub = resendResponse.User?.Username;
          console.log('Resent invite to existing Cognito user with sub:', sub);
        } catch (resendError: any) {
          // If resend fails, just get the user
          console.log('Resend failed, getting user:', resendError.code);
          try {
            const existingUser = await cognito.adminGetUser({
              UserPoolId: process.env.USER_POOL_ID!,
              Username: email
            }).promise();
            sub = existingUser.Username;
            console.log('Found existing Cognito user with sub:', sub);
          } catch (getError) {
            console.error('Failed to get existing Cognito user:', getError);
            return res.status(400).json({ error: 'Benutzer existiert bereits in Cognito' });
          }
        }
      } else {
        throw cognitoError;
      }
    }

    // Create user in DB
    if (sub) {
      await prisma.user.create({
        data: {
          id: sub,
          email,
          tenantId: currentUser.tenantId,
          role: role || 'AGENT',
          firstName: 'Pending',
          lastName: 'Invite'
        }
      });
      console.log('DB user created successfully');
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Invite error:', error);
    
    if (error.code === 'InvalidParameterException') {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }
    
    res.status(500).json({ error: 'Fehler beim Einladen des Benutzers' });
  }
});

// Delete Seat
app.delete('/seats/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only Admins can remove users' });
    }

    // Find the user to delete
    const userToDelete = await prisma.user.findFirst({
      where: { id, tenantId: currentUser.tenantId }
    });

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent self-deletion
    if (userToDelete.id === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    // Delete from Cognito
    console.log('Deleting user from Cognito:', userToDelete.email);
    try {
      await cognito.adminDeleteUser({
        UserPoolId: process.env.USER_POOL_ID!,
        Username: userToDelete.email
      }).promise();
      console.log('Successfully deleted from Cognito:', userToDelete.email);
    } catch (cognitoError: any) {
      console.error('Cognito delete error:', cognitoError.code, cognitoError.message);
      // If user doesn't exist in Cognito, that's fine - continue
      if (cognitoError.code !== 'UserNotFoundException') {
        // For other errors, still continue but log it
        console.error('Cognito delete failed but continuing with DB delete');
      }
    }

    // Delete from database
    console.log('Deleting user from DB:', id);
    await prisma.user.delete({ where: { id } });
    console.log('Successfully deleted from DB');

    res.json({ success: true });
  } catch (error) {
    console.error('Delete seat error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'orchestrator', runtime: 'lambda' });
});

// --- Lead Intake ---

// GET /leads - List all leads (tenant-isolated)
app.get('/leads', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const leads = await prisma.lead.findMany({
      where: { tenantId: currentUser.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: true,
      }
    });
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /leads/:id - Get lead details with messages (tenant-isolated)
app.get('/leads/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const lead = await prisma.lead.findFirst({
      where: { id, tenantId: currentUser.tenantId },
      include: {
        property: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /properties - List all properties (tenant-isolated)
app.get('/properties', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const properties = await prisma.property.findMany({
      where: { tenantId: currentUser.tenantId },
      orderBy: { createdAt: 'desc' }
    });

    // Normalize legacy /uploads/ URLs to S3 URLs
    if (isLambda && MEDIA_BUCKET) {
      for (const p of properties) {
        p.images = p.images.map(url => normalizeFileUrl(url, p.tenantId, p.id, 'images'));
        p.floorplans = p.floorplans.map(url => normalizeFileUrl(url, p.tenantId, p.id, 'floorplans'));
      }
    }

    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /properties/:id - Get property details (tenant-isolated)
app.get('/properties/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const property = await prisma.property.findFirst({
      where: { id, tenantId: currentUser.tenantId }
    });
    
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Normalize legacy /uploads/ URLs to S3 URLs
    if (isLambda && MEDIA_BUCKET) {
      property.images = property.images.map(url => normalizeFileUrl(url, property.tenantId, property.id, 'images'));
      property.floorplans = property.floorplans.map(url => normalizeFileUrl(url, property.tenantId, property.id, 'floorplans'));
    }

    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /properties/:id/assignments - Get assigned users for a property
app.get('/properties/:id/assignments', authMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const currentUser = await db.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    
    // Verify property belongs to tenant
    const property = await db.property.findFirst({
      where: { id, tenantId: currentUser.tenantId }
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const assignments = await db.propertyAssignment.findMany({
      where: { propertyId: id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });

    res.json({
      userIds: assignments.map(a => a.userId),
      users: assignments.map(a => ({
        id: a.user.id,
        name: [a.user.firstName, a.user.lastName].filter(Boolean).join(' ') || a.user.email,
        email: a.user.email
      }))
    });
  } catch (error) {
    console.error('Error fetching property assignments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /properties/:id/assignments - Update assigned users for a property
app.put('/properties/:id/assignments', authMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const currentUser = await db.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds must be an array' });
    }

    // Verify property belongs to tenant
    const property = await db.property.findFirst({
      where: { id, tenantId: currentUser.tenantId }
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Verify all users belong to the same tenant
    const users = await db.user.findMany({
      where: { id: { in: userIds }, tenantId: currentUser.tenantId }
    });
    
    if (users.length !== userIds.length) {
      return res.status(400).json({ error: 'Some users not found or not in your team' });
    }

    // Delete existing assignments
    await db.propertyAssignment.deleteMany({
      where: { propertyId: id }
    });

    // Create new assignments
    if (userIds.length > 0) {
      await db.propertyAssignment.createMany({
        data: userIds.map((userId: string) => ({
          propertyId: id,
          userId
        }))
      });
    }

    res.json({ success: true, assignedUserIds: userIds });
  } catch (error) {
    console.error('Error updating property assignments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /team - Get all team members for current tenant
app.get('/team', authMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const currentUser = await db.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const members = await db.user.findMany({
      where: { tenantId: currentUser.tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      },
      orderBy: { firstName: 'asc' }
    });

    res.json({
      members: members.map(m => ({
        id: m.id,
        email: m.email,
        name: [m.firstName, m.lastName].filter(Boolean).join(' ') || null,
        role: m.role
      }))
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /leads/:id - Update lead details (tenant-isolated)
app.put('/leads/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const rawData = req.body;
    
    // Get old lead data for comparison - tenant-isolated
    const oldLead = await prisma.lead.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!oldLead) return res.status(404).json({ error: 'Lead not found' });
    
    // Filter only allowed fields for update (exclude relations and immutable fields)
    const allowedFields = [
      'salutation', 'formalAddress', 'email', 'firstName', 'lastName', 'phone',
      'budgetMin', 'budgetMax', 'preferredType', 'preferredLocation',
      'minRooms', 'minArea', 'timeFrame', 'financingStatus', 'hasDownPayment',
      'source', 'sourceDetails', 'notes', 'status', 'assignedToId', 'propertyId',
      'documents', 'alternateEmails'
    ];
    
    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in rawData) {
        updateData[field] = rawData[field];
      }
    }
    
    // Update lead
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData
    });
    
    // Track activities - include createdBy for filtering
    const activities: Array<{
      leadId: string;
      type: ActivityType;
      description: string;
      metadata?: any;
      createdBy?: string;
    }> = [];
    
    // Status changed
    if (updateData.status && updateData.status !== oldLead.status) {
      activities.push({
        leadId: id,
        type: ActivityType.STATUS_CHANGED,
        description: `Status geändert: ${oldLead.status} → ${updateData.status}`,
        metadata: { old: oldLead.status, new: updateData.status },
        createdBy: currentUser.id
      });
    }
    
    // Budget changed
    if (updateData.budgetMin !== undefined || updateData.budgetMax !== undefined) {
      if (updateData.budgetMin !== oldLead.budgetMin || updateData.budgetMax !== oldLead.budgetMax) {
        activities.push({
          leadId: id,
          type: ActivityType.FIELD_UPDATED,
          description: `Budget aktualisiert: ${updateData.budgetMin || 0}€ - ${updateData.budgetMax || 0}€`,
          metadata: { field: 'budget' },
          createdBy: currentUser.id
        });
      }
    }
    
    // Notes added/changed
    if (updateData.notes && updateData.notes !== oldLead.notes) {
      activities.push({
        leadId: id,
        type: ActivityType.NOTE_ADDED,
        description: 'Notiz hinzugefügt',
        metadata: { field: 'notes' },
        createdBy: currentUser.id
      });
    }
    
    // Create activities
    if (activities.length > 0) {
      await prisma.leadActivity.createMany({ data: activities });
    }
    
    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /leads/:id/activities - Get lead activities (tenant-isolated)
app.get('/leads/:id/activities', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    
    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    // Get activities
    const activities = await prisma.leadActivity.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get messages (emails)
    const messages = await prisma.message.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' }
    });
    
    // Combine and sort by date
    const combined = [
      ...activities.map(a => ({
        id: a.id,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt,
        source: 'activity'
      })),
      ...messages.map(m => ({
        id: m.id,
        type: m.role === 'USER' ? 'EMAIL_RECEIVED' : 'EMAIL_SENT',
        description: m.role === 'USER' ? 'E-Mail empfangen' : 'E-Mail gesendet',
        content: m.content,
        status: m.status,
        createdAt: m.createdAt,
        source: 'message'
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(combined);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /properties/:id - Update property details (tenant-isolated)
app.put('/properties/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    
    // Verify property belongs to tenant
    const existing = await prisma.property.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Property not found' });

    const { title, address, price, rooms, area, description, aiFacts } = req.body;
    
    const property = await prisma.property.update({
      where: { id },
      data: {
        title,
        address,
        price,
        rooms,
        area,
        description,
        aiFacts
      }
    });
    
    res.json(property);
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /properties/:id/images - Upload images (tenant-isolated)
app.post('/properties/:id/images', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const isFloorplan = req.body.isFloorplan === 'true';
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
    }

    // Verify property belongs to tenant
    const property = await prisma.property.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!property) {
      return res.status(404).json({ error: 'Property nicht gefunden' });
    }

    // Upload to S3 (or local fallback)
    const folder = `properties/${currentUser.tenantId}/${id}/${isFloorplan ? 'floorplans' : 'images'}`;
    const imageUrls = await Promise.all(
      files.map(async (f) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(f.originalname)}`;
        return uploadToS3(f.buffer, uniqueName, f.mimetype, folder);
      })
    );

    // Add new images to existing ones (either images or floorplans)
    const arrayField = isFloorplan ? 'floorplans' : 'images';
    const currentArray = isFloorplan ? property.floorplans : property.images;
    const updatedArray = [...currentArray, ...imageUrls];
    
    await prisma.property.update({
      where: { id },
      data: { [arrayField]: updatedArray }
    });

    res.json({ success: true, [arrayField]: imageUrls });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Upload fehlgeschlagen' });
  }
});

// DELETE /properties/:id/images - Remove image (tenant-isolated)
app.delete('/properties/:id/images', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { imageUrl, isFloorplan } = req.body;

    // Verify property belongs to tenant
    const property = await prisma.property.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!property) {
      return res.status(404).json({ error: 'Property nicht gefunden' });
    }

    // Remove from array
    const arrayField = isFloorplan ? 'floorplans' : 'images';
    const currentArray = isFloorplan ? property.floorplans : property.images;
    const updatedArray = currentArray.filter(url => url !== imageUrl);

    await prisma.property.update({
      where: { id },
      data: { [arrayField]: updatedArray }
    });

    // Delete file from S3 or disk
    if (isS3Url(imageUrl) && MEDIA_BUCKET) {
      try {
        const key = extractS3Key(imageUrl);
        if (key) await s3Client.deleteObject({ Bucket: MEDIA_BUCKET, Key: key }).promise();
      } catch (e) {
        console.error('S3 delete error:', e);
      }
    } else if (imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
});

// === DOCUMENT MANAGEMENT ===

// Document type definition
interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

// POST /properties/:id/documents - Upload documents to property
app.post('/properties/:id/documents', authMiddleware, upload.array('documents', 20), async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
    }

    const property = await prisma.property.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!property) return res.status(404).json({ error: 'Property nicht gefunden' });

    // Upload to S3 and create document entries
    const folder = `documents/${currentUser.tenantId}/${id}`;
    const newDocs: Document[] = await Promise.all(files.map(async (f) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(f.originalname)}`;
      const url = await uploadToS3(f.buffer, uniqueName, f.mimetype, folder);
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: f.originalname,
        url,
        type: f.mimetype,
        size: f.size,
        uploadedAt: new Date().toISOString()
      };
    }));

    // Merge with existing documents
    const existingDocs = (property.documents as Document[] | null) || [];
    const updatedDocs = [...existingDocs, ...newDocs];

    await prisma.property.update({
      where: { id },
      data: { documents: updatedDocs as unknown as Prisma.InputJsonValue }
    });

    res.json({ success: true, documents: newDocs });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Upload fehlgeschlagen' });
  }
});

// DELETE /properties/:id/documents - Delete a document from property
app.delete('/properties/:id/documents', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { documentId } = req.body;

    const property = await prisma.property.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!property) return res.status(404).json({ error: 'Property nicht gefunden' });

    const existingDocs = (property.documents as Document[] | null) || [];
    const docToDelete = existingDocs.find(d => d.id === documentId);
    
    if (!docToDelete) {
      return res.status(404).json({ error: 'Dokument nicht gefunden' });
    }

    const updatedDocs = existingDocs.filter(d => d.id !== documentId);

    await prisma.property.update({
      where: { id },
      data: { documents: updatedDocs as unknown as Prisma.InputJsonValue }
    });

    // Delete file from S3 or disk
    if (isS3Url(docToDelete.url) && MEDIA_BUCKET) {
      try {
        const key = extractS3Key(docToDelete.url);
        if (key) await s3Client.deleteObject({ Bucket: MEDIA_BUCKET, Key: key }).promise();
      } catch (e) { console.error('S3 delete error:', e); }
    } else if (docToDelete.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', docToDelete.url);
      if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
});

// POST /leads/:id/documents - Upload documents to lead
app.post('/leads/:id/documents', authMiddleware, upload.array('documents', 20), async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
    }

    const lead = await prisma.lead.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });

    // Upload to S3 and create document entries
    const folder = `lead-documents/${currentUser.tenantId}/${id}`;
    const newDocs: Document[] = await Promise.all(files.map(async (f) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(f.originalname)}`;
      const url = await uploadToS3(f.buffer, uniqueName, f.mimetype, folder);
      return {
        id: Math.random().toString(36).substr(2, 9),
        name: f.originalname,
        url,
        type: f.mimetype,
        size: f.size,
        uploadedAt: new Date().toISOString()
      };
    }));

    // Merge with existing documents
    const existingDocs = (lead.documents as Document[] | null) || [];
    const updatedDocs = [...existingDocs, ...newDocs];

    await prisma.lead.update({
      where: { id },
      data: { documents: updatedDocs as unknown as Prisma.InputJsonValue }
    });

    res.json({ success: true, documents: newDocs });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Upload fehlgeschlagen' });
  }
});

// DELETE /leads/:id/documents - Delete a document from lead
app.delete('/leads/:id/documents', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { documentId } = req.body;

    const lead = await prisma.lead.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });

    const existingDocs = (lead.documents as Document[] | null) || [];
    const docToDelete = existingDocs.find(d => d.id === documentId);
    
    if (!docToDelete) {
      return res.status(404).json({ error: 'Dokument nicht gefunden' });
    }

    const updatedDocs = existingDocs.filter(d => d.id !== documentId);

    await prisma.lead.update({
      where: { id },
      data: { documents: updatedDocs as unknown as Prisma.InputJsonValue }
    });

    // Delete file from S3 or disk
    if (isS3Url(docToDelete.url) && MEDIA_BUCKET) {
      try {
        const key = extractS3Key(docToDelete.url);
        if (key) await s3Client.deleteObject({ Bucket: MEDIA_BUCKET, Key: key }).promise();
      } catch (e) { console.error('S3 delete error:', e); }
    } else if (docToDelete.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', docToDelete.url);
      if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Lead document delete error:', error);
    res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
});

// POST /leads/:id/email - Send manual email (tenant-isolated)
app.post('/leads/:id/email', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { subject, body } = req.body;
    
    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // --- REAL SENDING LOGIC WOULD GO HERE (SMTP) ---
    console.log('--- SENDING MANUAL EMAIL ---');
    console.log('To:', lead.email);
    console.log('Subject:', subject);
    console.log('Body:', body);
    // -----------------------------------------------

    // Log message
    const message = await prisma.message.create({
      data: {
        leadId: lead.id,
        role: 'ASSISTANT',
        content: `Subject: ${subject}\n\n${body}`,
        status: 'SENT'
      }
    });

    res.json(message);
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /leads/:id - Delete a lead (tenant-isolated)
app.delete('/leads/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    
    // Verify lead belongs to tenant
    const lead = await prisma.lead.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Delete related messages first (cascade delete would be better in schema)
    await prisma.message.deleteMany({ where: { leadId: id } });
    await prisma.lead.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /properties/:id - Delete a property (tenant-isolated)
app.delete('/properties/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    
    // Verify property belongs to tenant
    const property = await prisma.property.findFirst({ where: { id, tenantId: currentUser.tenantId } });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Check if property has leads
    const leadCount = await prisma.lead.count({ where: { propertyId: id } });
    if (leadCount > 0) {
      return res.status(400).json({ error: 'Cannot delete property with assigned leads' });
    }
    
    await prisma.property.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /properties - Create new property
app.post('/properties', authMiddleware, async (req, res) => {
  try {
    const { 
      title, address, description, aiFacts, propertyType, status, marketingType,
      // Address fields
      street, houseNumber, apartmentNumber, staircase, block, floor, zipCode, city, district, state, country,
      // Price fields
      salePrice, rentCold, rentWarm, additionalCosts, deposit, commission,
      // Details
      livingArea, rooms, bedrooms, bathrooms, totalFloors, yearBuilt, condition,
      // Energy
      energyCertificateType, energyEfficiencyClass, energyConsumption, primaryEnergySource
    } = req.body;
    
    // Get tenantId from authenticated user
    const userEmail = req.user!.email;
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const property = await prisma.property.create({
      data: {
        tenantId: user.tenantId,
        title,
        address: address || `${street || ''} ${houseNumber || ''}, ${zipCode || ''} ${city || ''}`.trim(),
        description,
        aiFacts,
        propertyType,
        status,
        marketingType,
        // Address
        street,
        houseNumber,
        apartmentNumber,
        staircase,
        block,
        floor,
        zipCode,
        city,
        district,
        state,
        country,
        // Price
        salePrice,
        rentCold,
        rentWarm,
        additionalCosts,
        deposit,
        commission,
        // Details
        livingArea,
        rooms,
        bedrooms,
        bathrooms,
        totalFloors,
        yearBuilt,
        condition,
        // Energy
        energyCertificateType,
        energyEfficiencyClass,
        energyConsumption,
        primaryEnergySource
      }
    });

    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/leads', authMiddleware, async (req, res) => {
  try {
    const { email, firstName, lastName, propertyId, message, salutation, formalAddress, phone, source, notes, assignedToId } = req.body;
    
    // Get tenantId and user from authenticated user
    const userEmail = req.user!.email;
    const currentUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, tenantId: true, firstName: true, lastName: true }
    });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tenantId = currentUser.tenantId;
    
    // Get tenant settings for auto-reply configuration
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });
    
    // 1. Save Lead
    const lead = await prisma.lead.create({
      data: {
        email,
        firstName,
        lastName,
        salutation: salutation || 'NONE',
        formalAddress: formalAddress !== undefined ? formalAddress : true,
        phone,
        source: source || 'WEBSITE',
        notes,
        tenantId,
        propertyId,
        assignedToId: assignedToId || currentUser.id,
        messages: message ? {
          create: {
            role: 'USER',
            content: message
          }
        } : undefined,
        activities: {
          create: {
            type: ActivityType.LEAD_CREATED,
            description: 'Lead erstellt'
          }
        }
      }
    });

    console.log(`📥 New lead created: ${lead.id} (${lead.email})`);

    // 2. Fetch Property and Template
    let property = null;
    let template = null;
    let expose = null;

    if (propertyId) {
      property = await prisma.property.findUnique({ 
        where: { id: propertyId },
        include: { defaultExposeTemplate: true }
      });
      template = await TemplateService.getTemplateForProperty(tenantId, propertyId);
      
      // Check if property has an expose
      expose = await prisma.expose.findFirst({
        where: { propertyId, status: 'PUBLISHED' }
      });
    }

    let emailDraft = null;
    let emailSubject = '';

    if (template && property) {
      // 3. Render Email with Expose link if available
      const agentName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || 'Ihr Makler Team';
      const context = { 
        lead, 
        property, 
        user: { name: agentName },
        expose: expose ? { url: `${process.env.APP_URL || 'http://localhost:3000'}/leads/${lead.id}/expose` } : null
      };
      
      emailDraft = TemplateService.render(template.body, context);
      emailSubject = TemplateService.render(template.subject, context);

      // 4. Create Draft Message
      await prisma.message.create({
        data: {
          leadId: lead.id,
          role: 'ASSISTANT',
          content: emailDraft,
          status: 'DRAFT'
        }
      });
      
      console.log(`📝 Draft message created for lead: ${lead.id}`);
    }

    // 5. Handle Auto-Reply or Jarvis Question
    const assignedUserId = assignedToId || currentUser.id;
    
    if (tenantSettings?.autoReplyEnabled && emailDraft && property) {
      // Auto-Reply is enabled - schedule the email
      const delayMinutes = tenantSettings.autoReplyDelay || 5;
      
      console.log(`⏰ Scheduling auto-reply for lead ${lead.id} in ${delayMinutes} minutes`);
      
      await SchedulerService.scheduleAutoReply({
        leadId: lead.id,
        tenantId,
        delayMinutes
      });
      
      // Create activity log
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE_ADDED',
          description: `Auto-Reply geplant in ${delayMinutes} Minuten`
        }
      });
    } else if (emailDraft && property) {
      // Auto-Reply is disabled - ask Jarvis to confirm
      const leadName = [firstName, lastName].filter(Boolean).join(' ') || email;
      
      await JarvisActionService.createPendingAction({
        tenantId,
        userId: assignedUserId,
        leadId: lead.id,
        type: 'SEND_EXPOSE',
        question: `Neuer Lead: ${leadName} interessiert sich für "${property.title}". Soll ich das Exposé senden?`,
        context: {
          emailSubject,
          emailPreview: emailDraft.substring(0, 200) + '...',
          hasExpose: !!expose
        }
      });
      
      console.log(`❓ Jarvis question created for lead ${lead.id}`);
    }

    // 6. Notify assigned agent about new lead
    await NotificationService.notifyNewLead({
      tenantId,
      userId: assignedUserId,
      leadId: lead.id,
      leadName: [firstName, lastName].filter(Boolean).join(' ') || email,
      propertyTitle: property?.title
    });

    res.status(201).json({ 
      id: lead.id, 
      message: 'Lead processed',
      autoReplyScheduled: tenantSettings?.autoReplyEnabled && !!emailDraft,
      jarvisQuestionCreated: !tenantSettings?.autoReplyEnabled && !!emailDraft
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /messages/:id/send - Approve and send a draft message
app.post('/messages/:id/send', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.status !== 'DRAFT') return res.status(400).json({ error: 'Message is not a draft' });
    
    // Fetch Lead and verify tenant ownership
    const lead = await prisma.lead.findFirst({ where: { id: message.leadId, tenantId: currentUser.tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // --- REAL SENDING LOGIC WOULD GO HERE (SMTP) ---
    console.log('--- SENDING EMAIL ---');
    console.log('To:', lead.email);
    console.log('Body:', message.content);
    // -----------------------------------------------

    // Update status
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { status: 'SENT' }
    });

    // Update Lead Status
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'CONTACTED' }
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Template Management ---
// POST /templates/render - Render a template (requires auth)
app.post('/templates/render', authMiddleware, (req, res) => {
  const { templateBody, context } = req.body;
  const result = TemplateService.render(templateBody, context);
  res.json({ result });
});

// --- Exposé Templates ---

// GET /expose-templates - List all expose templates
app.get('/expose-templates', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const templates = await prisma.exposeTemplate.findMany({
      where: { tenantId: currentUser.tenantId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching expose templates:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /expose-templates/:id - Get single template
app.get('/expose-templates/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.exposeTemplate.findUnique({ where: { id } });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (error) {
    console.error('Error fetching expose template:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /expose-templates - Create new template
app.post('/expose-templates', authMiddleware, async (req, res) => {
  try {
    const { name, blocks, theme, isDefault } = req.body;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const template = await prisma.exposeTemplate.create({
      data: {
        tenantId: currentUser.tenantId,
        name,
        blocks: blocks || [],
        theme: theme || 'default',
        isDefault: isDefault || false
      }
    });
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating expose template:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /expose-templates/:id - Update template
app.put('/expose-templates/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, blocks, theme, customColors, isDefault } = req.body;

    const template = await prisma.exposeTemplate.update({
      where: { id },
      data: { name, blocks, theme, customColors, isDefault }
    });
    res.json(template);
  } catch (error) {
    console.error('Error updating expose template:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /expose-templates/:id - Delete template
app.delete('/expose-templates/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.exposeTemplate.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting expose template:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Exposés (Instances) ---

// GET /exposes - List all exposes for a property
app.get('/exposes', authMiddleware, async (req, res) => {
  try {
    const { propertyId } = req.query;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const exposes = await prisma.expose.findMany({
      where: { 
        tenantId: currentUser.tenantId,
        ...(propertyId ? { propertyId: String(propertyId) } : {})
      },
      include: {
        property: { select: { id: true, title: true, address: true } },
        template: { select: { id: true, name: true, updatedAt: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(exposes);
  } catch (error) {
    console.error('Error fetching exposes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /exposes/:id - Get single expose
app.get('/exposes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const expose = await prisma.expose.findFirst({
      where: { id, tenantId: currentUser.tenantId },
      include: {
        property: true,
        template: { select: { id: true, name: true, updatedAt: true } }
      }
    });
    if (!expose) return res.status(404).json({ error: 'Expose not found' });
    res.json(expose);
  } catch (error) {
    console.error('Error fetching expose:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /exposes - Create expose from template
app.post('/exposes', authMiddleware, async (req, res) => {
  try {
    const { propertyId, templateId } = req.body;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Get property data
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Get template if provided
    let blocks: any[] = [];
    let theme = 'default';
    
    if (templateId) {
      const template = await prisma.exposeTemplate.findUnique({ where: { id: templateId } });
      if (template) {
        // Replace placeholders with actual property data
        blocks = replacePlaceholders(template.blocks as any[], property, currentUser);
        theme = template.theme;
      }
    }

    const expose = await prisma.expose.create({
      data: {
        tenantId: currentUser.tenantId,
        propertyId,
        templateId,
        createdFromTemplateAt: templateId ? new Date() : null,
        blocks,
        theme,
        status: 'DRAFT'
      },
      include: {
        property: true,
        template: { select: { id: true, name: true, updatedAt: true } }
      }
    });
    res.status(201).json(expose);
  } catch (error) {
    console.error('Error creating expose:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /exposes/:id - Update expose
app.put('/exposes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { blocks, theme, customColors, status } = req.body;

    const expose = await prisma.expose.update({
      where: { id },
      data: { blocks, theme, customColors, status }
    });
    res.json(expose);
  } catch (error) {
    console.error('Error updating expose:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /exposes/:id/regenerate - Regenerate from template
app.post('/exposes/:id/regenerate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const expose = await prisma.expose.findUnique({
      where: { id },
      include: { property: true, template: true }
    });
    if (!expose) return res.status(404).json({ error: 'Expose not found' });
    if (!expose.template) return res.status(400).json({ error: 'No template linked' });

    // Regenerate blocks from template
    const blocks = replacePlaceholders(expose.template.blocks as any[], expose.property, currentUser);

    const updated = await prisma.expose.update({
      where: { id },
      data: {
        blocks,
        theme: expose.template.theme,
        createdFromTemplateAt: new Date()
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error regenerating expose:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /exposes/:id - Delete expose
app.delete('/exposes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.expose.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting expose:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /exposes/:id/pdf - Generate PDF for expose
app.get('/exposes/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const expose = await prisma.expose.findFirst({
      where: { id, property: { tenantId: currentUser.tenantId } },
      include: { property: true }
    });
    
    if (!expose) return res.status(404).json({ error: 'Exposé not found' });

    // Generate PDF
    const pdfBuffer = await PdfService.generateExposePdf({
      id: expose.id,
      blocks: expose.blocks as any[],
      theme: expose.theme,
      property: {
        title: expose.property.title,
        address: expose.property.address || '',
        price: Number(expose.property.price) || 0,
        area: Number(expose.property.area) || 0,
        rooms: Number(expose.property.rooms) || 0,
        description: expose.property.description || undefined,
        images: (expose.property as any).images || [],
      },
      user: {
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        email: currentUser.email,
      }
    });

    // Set headers for PDF download
    const filename = `expose-${expose.property.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

// POST /expose-templates/:id/pdf - Generate PDF preview for template
app.get('/expose-templates/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const template = await prisma.exposeTemplate.findFirst({
      where: { id, tenantId: currentUser.tenantId }
    });
    
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Generate PDF with placeholder data
    const pdfBuffer = await PdfService.generateExposePdf({
      id: template.id,
      blocks: template.blocks as any[],
      theme: template.theme,
      property: {
        title: 'Muster-Immobilie',
        address: 'Musterstraße 1, 12345 Musterstadt',
        price: 1250,
        area: 85,
        rooms: 3,
        description: 'Dies ist eine Vorschau mit Beispieldaten.',
        images: [],
      },
      user: {
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        email: currentUser.email,
      }
    });

    const filename = `vorlage-${template.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating template PDF:', error);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

// Helper: Replace placeholders in blocks with actual data
function replacePlaceholders(blocks: any[], property: any, user: any, lead?: any): any[] {
  const context: any = {
    property: {
      ...property,
      price: property.price ? new Intl.NumberFormat('de-DE').format(property.price) : '',
      area: property.area?.toString() || '',
      rooms: property.rooms?.toString() || '',
    },
    user: {
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email,
      phone: '', // TODO: Add phone to user model
    }
  };

  // Add lead data if provided (for personalized exposés)
  if (lead) {
    context.lead = {
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Interessent',
      email: lead.email || '',
      phone: lead.phone || '',
      salutation: lead.firstName ? `Sehr geehrte/r ${lead.firstName} ${lead.lastName || ''}` : 'Sehr geehrte Damen und Herren',
    };
  }

  const replaceInString = (str: string): string => {
    return str.replace(/\{\{([\w\.\[\]]+)\}\}/g, (match, path) => {
      // Handle array access like property.images[0]
      const value = path.split('.').reduce((obj: any, key: string) => {
        const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
          const [, arrKey, index] = arrayMatch;
          return obj?.[arrKey]?.[parseInt(index)];
        }
        return obj?.[key];
      }, context);
      return value !== undefined ? String(value) : '';
    });
  };

  const replaceInObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return replaceInString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(replaceInObject);
    }
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceInObject(value);
      }
      return result;
    }
    return obj;
  };

  return blocks.map(replaceInObject);
}

// --- AI Assistant ---
app.get('/chat/history', authMiddleware, async (req, res) => {
  try {
    // Get user from auth - only return history for authenticated user
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Only load last 100 messages to prevent frontend from hanging
    const MAX_HISTORY = 100;
    
    const totalCount = await prisma.userChat.count({
      where: { userId: currentUser.id, archived: false }
    });

    const history = await prisma.userChat.findMany({
      where: { 
        userId: currentUser.id,
        archived: false
      },
      orderBy: { createdAt: 'asc' },
      // If more than MAX, take the last MAX messages
      ...(totalCount > MAX_HISTORY ? { skip: totalCount - MAX_HISTORY, take: MAX_HISTORY } : {})
    });

    // If we truncated, add a system message indicating older messages exist
    const formattedHistory: any[] = [];
    if (totalCount > MAX_HISTORY) {
      formattedHistory.push({
        role: 'SYSTEM',
        content: `[${totalCount - MAX_HISTORY} ältere Nachrichten wurden archiviert. Jarvis erinnert sich an den Kontext.]`
      });
    }

    // Map to frontend format
    formattedHistory.push(...history.map(msg => ({
      role: msg.role,
      content: msg.content
    })));

    console.log(`📜 Chat-Historie geladen für User ${currentUser.id}: ${formattedHistory.length}/${totalCount} Nachrichten`);
    res.json(formattedHistory);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Neuen Chat starten (archiviert alten Chat)
app.post('/chat/new', authMiddleware, async (req, res) => {
  try {
    // Get user from auth
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Archiviere alle aktuellen Chats für den authentifizierten User
    await prisma.userChat.updateMany({
      where: { 
        userId: currentUser.id,
        archived: false
      },
      data: { archived: true }
    });

    console.log(`🆕 Neuer Chat gestartet für User ${currentUser.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error starting new chat:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Generate email signature with AI
app.post('/jarvis/generate-signature', authMiddleware, async (req, res) => {
  try {
    const { name, email, phone, company, website } = req.body;
    
    const prompt = `Erstelle eine professionelle HTML-E-Mail-Signatur für einen Immobilienmakler mit folgenden Daten:
- Name: ${name || 'Nicht angegeben'}
- E-Mail: ${email || 'Nicht angegeben'}
- Telefon: ${phone || 'Nicht angegeben'}
- Firma: ${company || 'Nicht angegeben'}
- Website: ${website || 'Nicht angegeben'}

Die Signatur sollte:
- Professionell und modern aussehen
- Inline-CSS verwenden (kein externes Stylesheet)
- Maximal 5-6 Zeilen haben
- Die Firmenfarbe Indigo (#4f46e5) als Akzentfarbe verwenden
- Nur die angegebenen Daten enthalten (keine Platzhalter für fehlende Daten)

Antworte NUR mit dem HTML-Code, ohne Erklärungen.`;

    const OpenAILib = require('openai');
    const openaiClient = new OpenAILib.default({ apiKey: process.env.OPENAI_API_KEY });
    
    const result = await openaiClient.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: 'Du generierst professionelle HTML-E-Mail-Signaturen. Antworte NUR mit dem HTML-Code, ohne Erklärungen.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.5,
    });
    let signature = result.choices[0]?.message?.content || '';
    
    // Clean up response
    signature = signature.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
    
    res.json({ signature });
  } catch (error: any) {
    console.error('Error generating signature:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/chat',
  authMiddleware,
  AiSafetyMiddleware.rateLimit(50, 60000), // 50 requests per minute
  AiSafetyMiddleware.contentModeration,
  AiSafetyMiddleware.auditLog,
  async (req, res) => {
    try {
      const { message, history } = req.body;
      
      // Get user from auth - CRITICAL: tenantId comes from authenticated user!
      const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });
      
      const userId = currentUser.id;
      const tenantId = currentUser.tenantId;

      await prisma.userChat.create({
        data: { userId, role: 'USER', content: message }
      });

      const openai = new OpenAIService();
      const responseText = await openai.chat(message, tenantId, history, {
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
        email: currentUser.email,
        role: currentUser.role,
      });
      
      // Sanitize response before sending
      const sanitizedResponse = wrapAiResponse(responseText);

      // Save Assistant Message
      await prisma.userChat.create({
        data: { userId, role: 'ASSISTANT', content: sanitizedResponse }
      });
      console.log(`💾 Chat gespeichert für User ${userId}`);

      res.json({ response: sanitizedResponse });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'AI Error' });
    }
  }
);

// Streaming Chat Endpoint with Optimized Memory (supports file uploads)
app.post('/chat/stream',
  authMiddleware,
  upload.array('files', 10), // Allow up to 10 files
  AiSafetyMiddleware.rateLimit(50, 60000),
  async (req, res) => {
    try {
      // Handle both JSON and FormData
      const message = req.body.message || '';
      const pageContext = req.body.pageContext || '';
      const files = req.files as Express.Multer.File[] | undefined;
      
      // Get user from auth - CRITICAL: tenantId comes from authenticated user, not request!
      const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
      if (!currentUser) {
        res.write(`data: ${JSON.stringify({ error: 'Unauthorized' })}\n\n`);
        res.end();
        return;
      }
      
      const userId = currentUser.id;
      const tenantId = currentUser.tenantId;
      
      // Set headers for SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Process uploaded files - upload to S3 and create context
      let fileContext = '';
      const uploadedFileUrls: string[] = [];
      if (files && files.length > 0) {
        const folder = `chat-uploads/${currentUser.tenantId}/${currentUser.id}`;
        const fileInfos = await Promise.all(files.map(async (f) => {
          const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(f.originalname)}`;
          const url = await uploadToS3(f.buffer, uniqueName, f.mimetype, folder);
          return {
            name: f.originalname,
            type: f.mimetype,
            size: f.size,
            url
          };
        }));
        uploadedFileUrls.push(...fileInfos.map(f => f.url));
        
        // Add file context to message
        const imageFiles = fileInfos.filter(f => f.type.startsWith('image/'));
        const otherFiles = fileInfos.filter(f => !f.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
          fileContext += `\n[HOCHGELADENE BILDER: ${imageFiles.map(f => `"${f.name}" (${f.url})`).join(', ')}]`;
        }
        if (otherFiles.length > 0) {
          fileContext += `\n[HOCHGELADENE DATEIEN: ${otherFiles.map(f => `"${f.name}"`).join(', ')}]`;
        }
        
        // Store file URLs in session for AI tools to access
        (req as any).uploadedFiles = uploadedFileUrls;
      }

      // Get optimized history (recent messages + summary)
      const { recentMessages, summary } = await ConversationMemory.getOptimizedHistory(userId);
      const optimizedHistory = ConversationMemory.formatForOpenAI(recentMessages, summary);

      const openai = new OpenAIService();
      let fullResponse = '';
      let hadFunctionCalls = false;

      // Combine message with file context
      const fullMessage = message + fileContext;

      // Stream the response with optimized history, pass uploaded files and userId for tools
      let toolsUsed: string[] = [];
      const userContext = {
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
        email: currentUser.email,
        role: currentUser.role,
        pageContext: pageContext || undefined,
      };
      for await (const result of openai.chatStream(fullMessage, tenantId, optimizedHistory, uploadedFileUrls, currentUser.id, userContext)) {
        fullResponse += result.chunk;
        if (result.hadFunctionCalls) hadFunctionCalls = true;
        if (result.toolsUsed) toolsUsed = result.toolsUsed;
        // Send chunk as SSE (include tools info when available)
        if (result.toolsUsed) {
          res.write(`data: ${JSON.stringify({ chunk: result.chunk, toolsUsed: result.toolsUsed })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ chunk: result.chunk })}\n\n`);
        }
      }

      // Send done signal with function call info
      res.write(`data: ${JSON.stringify({ done: true, hadFunctionCalls, toolsUsed })}\n\n`);
      res.end();

      // Save messages to DB after streaming is complete
      await prisma.userChat.create({
        data: { userId, role: 'USER', content: message + (uploadedFileUrls.length > 0 ? ` [${uploadedFileUrls.length} Datei(en)]` : '') }
      });
      await prisma.userChat.create({
        data: { userId, role: 'ASSISTANT', content: wrapAiResponse(fullResponse) }
      });
      console.log(`💾 Chat gespeichert für User ${userId}`);
      
      // Auto-summarize if needed (async, don't await)
      ConversationMemory.autoSummarizeIfNeeded(userId).catch(console.error);
    } catch (error) {
      console.error('Chat stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'AI Error' })}\n\n`);
      res.end();
    }
  }
);

// Exposé-specific Chat with Jarvis (full tool access)
app.post('/exposes/:id/chat',
  authMiddleware,
  AiSafetyMiddleware.rateLimit(50, 60000),
  AiSafetyMiddleware.contentModeration,
  AiSafetyMiddleware.auditLog,
  async (req, res) => {
    try {
      const { id: exposeId } = req.params;
      const { message, history, pageContext } = req.body;
      
      const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      // Verify expose belongs to tenant (Tenant Isolation)
      const expose = await prisma.expose.findFirst({
        where: { id: exposeId, property: { tenantId: currentUser.tenantId } },
        include: { property: true }
      });
      if (!expose) return res.status(404).json({ error: 'Exposé not found' });

      const aiService = new OpenAIService();
      const result = await aiService.exposeChat(message, currentUser.tenantId, exposeId, null, expose.blocks as any[], history || [], pageContext);
      
      // Sanitize response
      const sanitizedResponse = wrapAiResponse(result.text);

      res.json({ 
        response: sanitizedResponse, 
        actionsPerformed: result.actionsPerformed 
      });
    } catch (error) {
      console.error('Exposé chat error:', error);
      res.status(500).json({ error: 'AI Error' });
    }
  }
);

// Template-specific Chat with Jarvis (full tool access)
app.post('/templates/:id/chat',
  authMiddleware,
  AiSafetyMiddleware.rateLimit(50, 60000),
  AiSafetyMiddleware.contentModeration,
  AiSafetyMiddleware.auditLog,
  async (req, res) => {
    try {
      const { id: templateId } = req.params;
      const { message, history, pageContext } = req.body;
      
      const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      // Verify template belongs to tenant (Tenant Isolation)
      const template = await prisma.exposeTemplate.findFirst({
        where: { id: templateId, tenantId: currentUser.tenantId }
      });
      if (!template) return res.status(404).json({ error: 'Template not found' });

      const aiService = new OpenAIService();
      const result = await aiService.exposeChat(message, currentUser.tenantId, null, templateId, template.blocks as any[], history || [], pageContext);
      
      // Sanitize response
      const sanitizedResponse = wrapAiResponse(result.text);

      res.json({ 
        response: sanitizedResponse, 
        actionsPerformed: result.actionsPerformed 
      });
    } catch (error) {
      console.error('Template chat error:', error);
      res.status(500).json({ error: 'AI Error' });
    }
  }
);

// Generate text for a property
app.post('/properties/:id/generate-text', authMiddleware, async (req, res) => {
  try {
    const { id: propertyId } = req.params;
    const { textType, tone, maxLength } = req.body;
    
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Verify property belongs to tenant
    const property = await prisma.property.findFirst({
      where: { id: propertyId, tenantId: currentUser.tenantId }
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const aiService = new OpenAIService();
    const result = await aiService.generatePropertyText(propertyId, textType || 'description', currentUser.tenantId, {
      tone: tone || 'professional',
      maxLength: maxLength || 500
    });

    res.json(result);
  } catch (error) {
    console.error('Generate text error:', error);
    res.status(500).json({ error: 'AI Error' });
  }
});

// --- Team Chat ---

// ========== TEAM CHAT (Encrypted, Paginated, Mentions) ==========

// Helper: Ensure default channel exists for tenant
async function ensureDefaultChannel(tenantId: string, tenantName: string) {
  const existing = await prisma.channel.findFirst({
    where: { tenantId, isDefault: true }
  });
  if (existing) return existing;

  // Create default channel with all tenant users as members
  const tenantUsers = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true }
  });

  const channel = await prisma.channel.create({
    data: {
      name: tenantName,
      description: 'Standard-Channel für das gesamte Team',
      type: 'PUBLIC',
      isDefault: true,
      tenantId,
      members: {
        create: tenantUsers.map(u => ({ userId: u.id }))
      }
    }
  });
  return channel;
}

// Create Channel (Admin only for PUBLIC channels)
app.post('/channels', authMiddleware, async (req, res) => {
  try {
    const { name, description, type, members } = req.body;
    const currentUser = await prisma.user.findUnique({
      where: { email: req.user!.email },
      include: { tenant: true }
    });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Channel-Name ist erforderlich' });
    }

    // Only Admins can create public channels
    if (type === 'PUBLIC' && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können öffentliche Channels erstellen' });
    }

    // For PUBLIC channels, auto-add all tenant users
    let memberIds: string[] = [];
    if (type === 'PUBLIC') {
      const allUsers = await prisma.user.findMany({
        where: { tenantId: currentUser.tenantId },
        select: { id: true }
      });
      memberIds = allUsers.map(u => u.id);
    } else {
      memberIds = [currentUser.id, ...(members || [])];
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.trim(),
        description: description || null,
        type: type || 'PUBLIC',
        tenantId: currentUser.tenantId,
        members: {
          create: [...new Set(memberIds)].map(uid => ({ userId: uid }))
        }
      },
      include: {
        _count: { select: { members: true, messages: true } }
      }
    });

    res.json(channel);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get or Create DM Channel between current user and another user
app.post('/channels/dm', authMiddleware, async (req, res) => {
  try {
    const { userId: targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'userId is required' });

    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    if (currentUser.id === targetUserId) {
      return res.status(400).json({ error: 'Kann keine DM mit dir selbst erstellen' });
    }

    // Verify target user is in same tenant
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser || targetUser.tenantId !== currentUser.tenantId) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    // Look for existing DM channel between these two users
    const existingDm = await prisma.channel.findFirst({
      where: {
        tenantId: currentUser.tenantId,
        type: 'DM',
        AND: [
          { members: { some: { userId: currentUser.id } } },
          { members: { some: { userId: targetUserId } } }
        ]
      },
      include: {
        _count: { select: { members: true, messages: true } },
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } }
      }
    });

    if (existingDm) {
      return res.json(existingDm);
    }

    // Create new DM channel
    const dmName = `DM-${currentUser.id}-${targetUserId}`;
    const channel = await prisma.channel.create({
      data: {
        name: dmName,
        type: 'DM',
        tenantId: currentUser.tenantId,
        members: {
          create: [
            { userId: currentUser.id },
            { userId: targetUserId }
          ]
        }
      },
      include: {
        _count: { select: { members: true, messages: true } },
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } }
      }
    });

    res.json(channel);
  } catch (error) {
    console.error('DM channel error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete Channel (Admin only, cannot delete default)
app.delete('/channels/:channelId', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Nur Admins können Channels löschen' });
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.tenantId !== currentUser.tenantId) {
      return res.status(404).json({ error: 'Channel nicht gefunden' });
    }
    if (channel.isDefault) {
      return res.status(400).json({ error: 'Standard-Channel kann nicht gelöscht werden' });
    }

    await prisma.channel.delete({ where: { id: channelId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Channels for User (ensures default channel exists)
app.get('/channels', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { email: req.user!.email },
      include: { tenant: true }
    });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure default channel exists
    await ensureDefaultChannel(currentUser.tenantId, currentUser.tenant.name);

    // Ensure user is member of all PUBLIC channels
    const publicChannels = await prisma.channel.findMany({
      where: { tenantId: currentUser.tenantId, type: 'PUBLIC' },
      select: { id: true }
    });
    for (const ch of publicChannels) {
      await prisma.channelMember.upsert({
        where: { channelId_userId: { channelId: ch.id, userId: currentUser.id } },
        create: { channelId: ch.id, userId: currentUser.id },
        update: {}
      });
    }

    const channels = await prisma.channel.findMany({
      where: {
        tenantId: currentUser.tenantId,
        OR: [
          { type: 'PUBLIC' },
          { members: { some: { userId: currentUser.id } } }
        ]
      },
      include: {
        _count: { select: { members: true, messages: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        }
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
    });

    res.json(channels);
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Messages for Channel (PAGINATED — last N, cursor-based)
app.get('/channels/:channelId/messages', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const before = req.query.before as string | undefined; // cursor: message ID

    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Check access
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.tenantId !== currentUser.tenantId) {
      return res.status(404).json({ error: 'Channel nicht gefunden' });
    }

    if (channel.type !== 'PUBLIC') {
      const membership = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId: currentUser.id } }
      });
      if (!membership) return res.status(403).json({ error: 'Kein Zugriff auf diesen Channel' });
    }

    // Build cursor-based query
    const whereClause: any = { channelId };
    if (before) {
      const cursorMsg = await prisma.channelMessage.findUnique({ where: { id: before } });
      if (cursorMsg) {
        whereClause.createdAt = { lt: cursorMsg.createdAt };
      }
    }

    const messages = await prisma.channelMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check if there are more
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        }
      }
    });

    const hasMore = messages.length > limit;
    const result = messages.slice(0, limit).reverse(); // Return in chronological order

    res.json({
      messages: result,
      hasMore,
      oldestId: result.length > 0 ? result[0].id : null
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Send Message (with mentions parsing)
app.post('/channels/:channelId/messages', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Nachricht darf nicht leer sein' });
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.tenantId !== currentUser.tenantId) {
      return res.status(404).json({ error: 'Channel nicht gefunden' });
    }

    if (channel.type !== 'PUBLIC') {
      const membership = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId: currentUser.id } }
      });
      if (!membership) return res.status(403).json({ error: 'Kein Zugriff' });
    }

    // Parse @mentions from content (format: @[Name](userId))
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[2]); // userId
    }

    const message = await prisma.channelMessage.create({
      data: {
        channelId,
        userId: currentUser.id,
        content,
        mentions: mentions.length > 0 ? mentions : undefined,
        isJarvis: false
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        }
      }
    });

    // Respond immediately — then handle @jarvis in the background
    res.json(message);

    // Check if @jarvis was mentioned (either as @[Jarvis](jarvis) or plain @jarvis)
    const jarvisMentioned = /(@jarvis|@\[jarvis\])/i.test(content);
    if (jarvisMentioned) {
      // Fire-and-forget: generate Jarvis response asynchronously
      (async () => {
        try {
          // Fetch recent channel messages for context (last 20)
          const recentMessages = await prisma.channelMessage.findMany({
            where: { channelId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              user: { select: { firstName: true, lastName: true } }
            }
          });

          const history = recentMessages.reverse().map(m => ({
            role: m.isJarvis ? 'assistant' : 'user',
            content: `${m.isJarvis ? 'Jarvis' : `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim()}: ${m.content}`,
          }));

          // Strip the @jarvis mention from the actual question
          const cleanContent = content.replace(/@\[Jarvis\]\([^)]*\)/gi, '').replace(/@jarvis/gi, '').trim();

          const openai = new OpenAIService();
          const jarvisResponse = await openai.chat(
            `Du bist Jarvis, der KI-Assistent im Team Chat. Antworte wie TARS aus Interstellar — kurz, prägnant, mit einem Hauch trockenem Humor. Keine Semikolons (;), keine Floskeln, keine Emojis. Deutsch, du-Form, locker und menschlich. Beantworte die Frage basierend auf dem Kontext der bisherigen Unterhaltung.\n\nFrage von ${currentUser.firstName || ''} ${currentUser.lastName || ''}: ${cleanContent}`,
            currentUser.tenantId,
            history,
            {
              name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
              email: currentUser.email,
              role: currentUser.role,
            }
          );

          // Save Jarvis response as a channel message
          await prisma.channelMessage.create({
            data: {
              channelId,
              userId: currentUser.id, // Use the invoking user's ID (Jarvis doesn't have its own)
              content: jarvisResponse,
              isJarvis: true,
            }
          });
        } catch (err) {
          console.error('Jarvis team chat response error:', err);
        }
      })();
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Edit Message (own messages only)
app.patch('/channels/:channelId/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const msg = await prisma.channelMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.userId !== currentUser.id) {
      return res.status(403).json({ error: 'Nur eigene Nachrichten bearbeiten' });
    }

    const updated = await prisma.channelMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete Message (own or admin)
app.delete('/channels/:channelId/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const msg = await prisma.channelMessage.findUnique({ where: { id: messageId } });
    if (!msg) return res.status(404).json({ error: 'Nachricht nicht gefunden' });

    if (msg.userId !== currentUser.id && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    await prisma.channelMessage.delete({ where: { id: messageId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Channel Members
app.get('/channels/:channelId/members', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const members = await prisma.channelMember.findMany({
      where: { channelId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
      }
    });

    res.json(members.map(m => m.user));
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Export for Lambda
// Auto-cleanup: archived chats, old audit logs, old notifications (runs every 24 hours)
async function cleanupOldData() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // 1. Delete archived chats older than 30 days
    const chatsResult = await prisma.userChat.deleteMany({
      where: {
        archived: true,
        createdAt: { lt: thirtyDaysAgo }
      }
    });

    // 2. Delete AI audit logs older than 12 months (DSGVO retention policy)
    const auditResult = await prisma.aiAuditLog.deleteMany({
      where: {
        createdAt: { lt: twelveMonthsAgo }
      }
    });

    // 3. Delete read notifications older than 90 days
    const notifResult = await prisma.notification.deleteMany({
      where: {
        read: true,
        createdAt: { lt: ninetyDaysAgo }
      }
    });

    // 4. Delete resolved/cancelled pending actions older than 90 days
    const actionsResult = await prisma.jarvisPendingAction.deleteMany({
      where: {
        status: { in: ['RESOLVED', 'CANCELLED'] },
        createdAt: { lt: ninetyDaysAgo }
      }
    });

    // 5. Delete old conversation summaries older than 12 months
    const summaryResult = await prisma.conversationSummary.deleteMany({
      where: {
        createdAt: { lt: twelveMonthsAgo }
      }
    });

    console.log(`🗑️ Retention Cleanup: ${chatsResult.count} Chats, ${auditResult.count} Audit-Logs, ${notifResult.count} Notifications, ${actionsResult.count} Actions, ${summaryResult.count} Summaries gelöscht`);
  } catch (error) {
    console.error('Error in data cleanup:', error);
  }
}

// Backward-compatible alias
const cleanupOldChats = cleanupOldData;

// Run cleanup every 24 hours
setInterval(cleanupOldData, 24 * 60 * 60 * 1000);

// --- Portal Integration ---

// Helper: Get portal connection with hierarchy (User > Tenant)
async function getPortalConnection(portalId: string, userId: string, tenantId: string) {
  // 1. Check if user has their own connection
  if (userId) {
    const userConnection = await prisma.portalConnection.findUnique({
      where: { userId_portalId: { userId, portalId } },
      include: { portal: true }
    });
    if (userConnection?.isEnabled) {
      return { connection: userConnection, level: 'user' };
    }
  }
  
  // 2. Fallback to tenant connection
  if (tenantId) {
    const tenantConnection = await prisma.portalConnection.findUnique({
      where: { tenantId_portalId: { tenantId, portalId } },
      include: { portal: true }
    });
    if (tenantConnection?.isEnabled) {
      return { connection: tenantConnection, level: 'tenant' };
    }
  }
  
  // 3. Not connected
  return null;
}

// GET /portals - List all available portals
// GET /portals - List available portals (requires auth for consistency)
app.get('/portals', authMiddleware, async (req, res) => {
  try {
    const { country } = req.query;
    
    const portals = await prisma.portal.findMany({
      where: {
        isActive: true,
        ...(country ? { country: String(country) } : {})
      },
      orderBy: [
        { country: 'asc' },
        { name: 'asc' }
      ]
    });
    
    res.json(portals);
  } catch (error) {
    console.error('Error fetching portals:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /portal-connections - Get portal connections (tenant or user level)
app.get('/portal-connections', authMiddleware, async (req, res) => {
  try {
    const { tenantId, userId } = req.query;
    
    if (!tenantId && !userId) {
      return res.status(400).json({ error: 'tenantId or userId required' });
    }
    
    const where: any = {};
    if (userId) {
      where.userId = String(userId);
    } else if (tenantId) {
      where.tenantId = String(tenantId);
    }
    
    const connections = await prisma.portalConnection.findMany({
      where,
      include: {
        portal: true,
        syncLogs: {
          take: 5,
          orderBy: { startedAt: 'desc' }
        }
      }
    });
    
    res.json(connections);
  } catch (error) {
    console.error('Error fetching portal connections:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /portal-connections - Create or update portal connection (tenant or user level)
app.post('/portal-connections', authMiddleware, async (req, res) => {
  try {
    const { 
      tenantId, userId, portalId, 
      // FTP fields
      ftpHost, ftpPort, ftpUsername, ftpPassword, ftpPath, useSftp, 
      // API fields
      apiKey, apiSecret, apiEndpoint,
      // Common fields
      providerId, isEnabled, autoSyncEnabled, autoSyncInterval 
    } = req.body;
    
    if ((!tenantId && !userId) || !portalId) {
      return res.status(400).json({ error: '(tenantId or userId) and portalId required' });
    }
    
    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // SECURITY: Only admins can create/modify tenant-level connections
    if (tenantId && !userId) {
      if (currentUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Nur Admins können Firmen-Verbindungen erstellen oder ändern' });
      }
    }
    
    // SECURITY: Users can only create/modify their own user-level connections
    if (userId && String(userId) !== currentUser.id) {
      return res.status(403).json({ error: 'Sie können nur Ihre eigenen Verbindungen verwalten' });
    }
    
    // Encrypt sensitive fields if provided
    let encryptedPassword = ftpPassword;
    if (ftpPassword && !encryptionService.isEncrypted(ftpPassword)) {
      encryptedPassword = encryptionService.encrypt(ftpPassword);
    }
    
    let encryptedApiSecret = apiSecret;
    if (apiSecret && !encryptionService.isEncrypted(apiSecret)) {
      encryptedApiSecret = encryptionService.encrypt(apiSecret);
    }
    
    // Determine unique constraint
    const whereClause = userId 
      ? { userId_portalId: { userId: String(userId), portalId: String(portalId) } }
      : { tenantId_portalId: { tenantId: String(tenantId), portalId: String(portalId) } };
    
    const dataFields = {
      // FTP fields
      ftpHost,
      ftpPort: ftpPort || 21,
      ftpUsername,
      ftpPassword: encryptedPassword,
      ftpPath,
      useSftp: useSftp || false,
      // API fields
      apiKey,
      apiSecret: encryptedApiSecret,
      apiEndpoint,
      // Common fields
      providerId,
      isEnabled: isEnabled !== undefined ? isEnabled : true,
      autoSyncEnabled: autoSyncEnabled || false,
      autoSyncInterval: autoSyncInterval || 24
    };
    
    const connection = await prisma.portalConnection.upsert({
      where: whereClause,
      update: dataFields,
      create: {
        ...(userId ? { userId: String(userId) } : { tenantId: String(tenantId) }),
        portalId: String(portalId),
        ...dataFields
      },
      include: { portal: true }
    });
    
    // Don't send sensitive data back to client
    const { ftpPassword: _, apiSecret: __, ...connectionWithoutSecrets } = connection;
    
    res.json(connectionWithoutSecrets);
  } catch (error) {
    console.error('Error saving portal connection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /portal-connections/:id - Delete portal connection
app.delete('/portal-connections/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get the connection to check ownership
    const connection = await prisma.portalConnection.findUnique({
      where: { id }
    });
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // SECURITY: Only admins can delete tenant-level connections
    if (connection.tenantId && !connection.userId) {
      if (currentUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Nur Admins können Firmen-FTP-Verbindungen löschen' });
      }
    }
    
    // SECURITY: Users can only delete their own user-level connections
    if (connection.userId && connection.userId !== currentUser.id) {
      return res.status(403).json({ error: 'Sie können nur Ihre eigenen FTP-Verbindungen löschen' });
    }
    
    await prisma.portalConnection.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting portal connection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /portal-connections/effective - Get effective connection for user (with hierarchy)
app.get('/portal-connections/effective', authMiddleware, async (req, res) => {
  try {
    const { userId, tenantId } = req.query;
    
    if (!userId || !tenantId) {
      return res.status(400).json({ error: 'userId and tenantId required' });
    }
    
    // Get all portals
    const portals = await prisma.portal.findMany({
      where: { isActive: true },
      orderBy: [{ country: 'asc' }, { name: 'asc' }]
    });
    
    // For each portal, determine effective connection
    const effectiveConnections = await Promise.all(
      portals.map(async (portal) => {
        const result = await getPortalConnection(portal.id, String(userId), String(tenantId));
        return {
          portal,
          connection: result?.connection || null,
          level: result?.level || null,
          isConnected: !!result
        };
      })
    );
    
    res.json(effectiveConnections);
  } catch (error) {
    console.error('Error fetching effective connections:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /properties/:id/sync - Sync property to portals
// POST /properties/:id/sync - Sync property to portals (tenant-isolated)
app.post('/properties/:id/sync', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { portalIds } = req.body;
    
    if (!portalIds || !Array.isArray(portalIds)) {
      return res.status(400).json({ error: 'portalIds array required' });
    }
    
    // Verify property belongs to tenant
    const property = await prisma.property.findFirst({
      where: { id, tenantId: currentUser.tenantId }
    });
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // TODO: Implement actual OpenImmo XML generation and FTP upload
    // For now, just mark as published
    await prisma.property.update({
      where: { id },
      data: {
        publishedPortals: portalIds,
        lastSyncedAt: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      message: `Objekt an ${portalIds.length} Portal(e) gesendet`,
      publishedPortals: portalIds
    });
  } catch (error) {
    console.error('Error syncing property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /portal-connections/:id/test - Test FTP connection
app.post('/portal-connections/:id/test', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const connection = await prisma.portalConnection.findUnique({
      where: { id },
      include: { portal: true }
    });
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // TODO: Implement actual FTP test
    // For now, just check if credentials are provided
    if (!connection.ftpHost || !connection.ftpUsername || !connection.ftpPassword) {
      return res.json({ 
        success: false, 
        message: 'FTP-Zugangsdaten unvollständig' 
      });
    }
    
    // Simulate test (replace with actual FTP test later)
    res.json({ 
      success: true, 
      message: `Verbindung zu ${connection.portal.name} erfolgreich!` 
    });
  } catch (error) {
    console.error('Error testing portal connection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Calendar Integration ---

// Google Calendar: Get Auth URL
app.get('/calendar/google/auth-url', authMiddleware, async (req: any, res) => {
  try {
    const userEmail = req.user!.email;
    
    // Check if Outlook Calendar is already connected - only one calendar provider at a time
    const db = prisma || (await initializePrisma());
    const user = await db.user.findUnique({ where: { email: userEmail }, select: { tenantId: true } });
    if (user) {
      const settings = await db.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
      if (settings?.outlookCalendarConfig) {
        return res.status(409).json({ error: 'Outlook Calendar ist bereits verbunden. Trenne zuerst Outlook Calendar.' });
      }
    }
    
    const state = Buffer.from(JSON.stringify({ email: userEmail })).toString('base64url');
    const authUrl = CalendarService.getGoogleAuthUrl(state);
    console.log('🔗 Generated Google Auth URL for:', userEmail);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Google Calendar: OAuth Callback - saves tokens directly server-side
app.get('/calendar/google/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=google-calendar&error=true`);
    }

    const tokens = await CalendarService.exchangeGoogleCode(code as string);
    console.log('✅ Google Calendar tokens exchanged for:', tokens.email);

    // Save tokens directly server-side using state parameter
    let saved = false;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
        const userEmail = stateData.email;
        console.log('📅 Saving Google Calendar config for user:', userEmail);

        const db = prisma || (await initializePrisma());
        const user = await db.user.findUnique({
          where: { email: userEmail },
          select: { tenantId: true }
        });

        if (user) {
          const encryptedConfig = {
            accessToken: encryptionService.encrypt(tokens.accessToken),
            refreshToken: encryptionService.encrypt(tokens.refreshToken),
            expiryDate: tokens.expiryDate,
            email: tokens.email
          };

          // Save Google Calendar config and clear Outlook Calendar (only one provider at a time)
          await db.tenantSettings.upsert({
            where: { tenantId: user.tenantId },
            update: { googleCalendarConfig: encryptedConfig as any, outlookCalendarConfig: Prisma.DbNull },
            create: { tenantId: user.tenantId, googleCalendarConfig: encryptedConfig as any }
          });

          saved = true;
          console.log('✅ Google Calendar config saved for tenant:', user.tenantId);
        }
      } catch (stateError) {
        console.error('Error saving Google Calendar config server-side:', stateError);
      }
    }

    const params = new URLSearchParams({
      provider: 'google-calendar',
      success: 'true',
      email: tokens.email,
      ...(saved ? {} : {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate.toString()
      })
    });
    
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?${params.toString()}`);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=google-calendar&error=true`);
  }
});

// Google Calendar: Save Configuration
app.post('/calendar/google/connect', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const userEmail = req.user!.email;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Exchange code for tokens
    const tokens = await CalendarService.exchangeGoogleCode(code);

    // Encrypt tokens before storing
    const encryptedConfig = {
      accessToken: encryptionService.encrypt(tokens.accessToken),
      refreshToken: encryptionService.encrypt(tokens.refreshToken),
      expiryDate: tokens.expiryDate,
      email: tokens.email
    };

    // Save Google Calendar config and clear Outlook Calendar (only one provider at a time)
    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        googleCalendarConfig: encryptedConfig as any
      },
      update: {
        googleCalendarConfig: encryptedConfig as any,
        outlookCalendarConfig: Prisma.DbNull
      }
    });

    res.json({ success: true, email: tokens.email });
  } catch (error) {
    console.error('Error connecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to connect Google Calendar' });
  }
});

// Google Calendar: Save tokens directly (from OAuth callback)
app.post('/calendar/google/save', authMiddleware, async (req, res) => {
  try {
    const { accessToken, refreshToken, expiryDate, email } = req.body;
    const userEmail = req.user!.email;

    if (!accessToken || !refreshToken) {
      return res.status(400).json({ error: 'Missing tokens' });
    }

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Encrypt tokens before storing
    const encryptedConfig = {
      accessToken: encryptionService.encrypt(accessToken),
      refreshToken: encryptionService.encrypt(refreshToken),
      expiryDate: expiryDate || Date.now() + 3600000,
      email: email || ''
    };

    // Update tenant settings - clear Outlook Calendar (only one provider at a time)
    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        googleCalendarConfig: encryptedConfig as any
      },
      update: {
        googleCalendarConfig: encryptedConfig as any,
        outlookCalendarConfig: Prisma.DbNull
      }
    });

    console.log(`✅ Google Calendar connected for tenant ${user.tenantId}`);
    res.json({ success: true, email });
  } catch (error) {
    console.error('Error saving Google Calendar config:', error);
    res.status(500).json({ error: 'Failed to save Google Calendar config' });
  }
});

// Google Calendar: Disconnect
app.post('/calendar/google/disconnect', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: {
        googleCalendarConfig: Prisma.DbNull
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

// Outlook Calendar: Get Auth URL
app.get('/calendar/outlook/auth-url', authMiddleware, async (req: any, res) => {
  try {
    const userEmail = req.user!.email;
    
    // Check if Google Calendar is already connected - only one calendar provider at a time
    const db = prisma || (await initializePrisma());
    const user = await db.user.findUnique({ where: { email: userEmail }, select: { tenantId: true } });
    if (user) {
      const settings = await db.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
      if (settings?.googleCalendarConfig) {
        return res.status(409).json({ error: 'Google Calendar ist bereits verbunden. Trenne zuerst Google Calendar.' });
      }
    }
    
    const state = Buffer.from(JSON.stringify({ email: userEmail })).toString('base64url');
    const authUrl = await CalendarService.getOutlookAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Outlook auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Outlook Calendar: OAuth Callback - saves tokens directly server-side
app.get('/calendar/outlook/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=outlook-calendar&error=true`);
    }

    const tokens = await CalendarService.exchangeOutlookCode(code as string);
    console.log('✅ Outlook Calendar tokens exchanged for:', tokens.email);

    // Save tokens directly server-side
    let saved = false;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
        const userEmail = stateData.email;
        console.log('📅 Saving Outlook Calendar config for user:', userEmail);

        const db = prisma || (await initializePrisma());
        const user = await db.user.findUnique({
          where: { email: userEmail },
          select: { tenantId: true }
        });

        if (user) {
          const encryptedConfig = {
            accessToken: encryptionService.encrypt(tokens.accessToken),
            refreshToken: encryptionService.encrypt(tokens.refreshToken),
            expiryDate: tokens.expiryDate,
            email: tokens.email
          };

          // Save Outlook Calendar config and clear Google Calendar (only one provider at a time)
          await db.tenantSettings.upsert({
            where: { tenantId: user.tenantId },
            update: { outlookCalendarConfig: encryptedConfig as any, googleCalendarConfig: Prisma.DbNull },
            create: { tenantId: user.tenantId, outlookCalendarConfig: encryptedConfig as any }
          });

          saved = true;
          console.log('✅ Outlook Calendar config saved for tenant:', user.tenantId);
        }
      } catch (stateError) {
        console.error('Error saving Outlook Calendar config server-side:', stateError);
      }
    }

    const params = new URLSearchParams({
      provider: 'outlook-calendar',
      success: 'true',
      email: tokens.email,
      ...(saved ? {} : {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate.toString()
      })
    });
    
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?${params.toString()}`);
  } catch (error) {
    console.error('Error in Outlook OAuth callback:', error);
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=outlook-calendar&error=true`);
  }
});

// Outlook Calendar: Save Configuration
app.post('/calendar/outlook/connect', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const userEmail = req.user!.email;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Exchange code for tokens
    const tokens = await CalendarService.exchangeOutlookCode(code);

    // Encrypt tokens before storing
    const encryptedConfig = {
      accessToken: encryptionService.encrypt(tokens.accessToken),
      refreshToken: encryptionService.encrypt(tokens.refreshToken),
      expiryDate: tokens.expiryDate,
      email: tokens.email
    };

    // Update tenant settings - clear Google Calendar (only one provider at a time)
    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        outlookCalendarConfig: encryptedConfig as any
      },
      update: {
        outlookCalendarConfig: encryptedConfig as any,
        googleCalendarConfig: Prisma.DbNull
      }
    });

    res.json({ success: true, email: tokens.email });
  } catch (error) {
    console.error('Error connecting Outlook Calendar:', error);
    res.status(500).json({ error: 'Failed to connect Outlook Calendar' });
  }
});

// Outlook Calendar: Save tokens directly (from OAuth callback)
app.post('/calendar/outlook/save', authMiddleware, async (req, res) => {
  try {
    const { accessToken, refreshToken, expiryDate, email } = req.body;
    const userEmail = req.user!.email;

    if (!accessToken || !refreshToken) {
      return res.status(400).json({ error: 'Missing tokens' });
    }

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Encrypt tokens before storing
    const encryptedConfig = {
      accessToken: encryptionService.encrypt(accessToken),
      refreshToken: encryptionService.encrypt(refreshToken),
      expiryDate: expiryDate || Date.now() + 3600000,
      email: email || ''
    };

    // Update tenant settings - clear Google Calendar (only one provider at a time)
    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        outlookCalendarConfig: encryptedConfig as any
      },
      update: {
        outlookCalendarConfig: encryptedConfig as any,
        googleCalendarConfig: Prisma.DbNull
      }
    });

    console.log(`✅ Outlook Calendar connected for tenant ${user.tenantId}`);
    res.json({ success: true, email });
  } catch (error) {
    console.error('Error saving Outlook Calendar config:', error);
    res.status(500).json({ error: 'Failed to save Outlook Calendar config' });
  }
});

// Outlook Calendar: Disconnect
app.post('/calendar/outlook/disconnect', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: {
        outlookCalendarConfig: Prisma.DbNull
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Outlook Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Outlook Calendar' });
  }
});

// Get Calendar Status
app.get('/calendar/status', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        googleCalendarConfig: true,
        outlookCalendarConfig: true,
        calendarShareTeam: true
      }
    });

    const googleConnected = !!settings?.googleCalendarConfig;
    const outlookConnected = !!settings?.outlookCalendarConfig;

    let googleEmail = null;
    let outlookEmail = null;

    if (googleConnected && settings.googleCalendarConfig) {
      const config = settings.googleCalendarConfig as any;
      googleEmail = config.email;
    }

    if (outlookConnected && settings.outlookCalendarConfig) {
      const config = settings.outlookCalendarConfig as any;
      outlookEmail = config.email;
    }

    res.json({
      google: {
        connected: googleConnected,
        email: googleEmail
      },
      outlook: {
        connected: outlookConnected,
        email: outlookEmail
      },
      shareTeam: settings?.calendarShareTeam ?? true
    });
  } catch (error) {
    console.error('Error getting calendar status:', error);
    res.status(500).json({ error: 'Failed to get calendar status' });
  }
});

// Get Calendar Events
app.get('/calendar/events', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end query parameters are required' });
    }

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        googleCalendarConfig: true,
        outlookCalendarConfig: true,
      }
    });

    const events: any[] = [];

    // Fetch from Google Calendar
    if (settings?.googleCalendarConfig) {
      try {
        const encryptedConfig = settings.googleCalendarConfig as any;
        
        // Decrypt tokens
        let accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
        const refreshToken = encryptionService.decrypt(encryptedConfig.refreshToken);
        let expiryDate = encryptedConfig.expiryDate;
        
        // Check if token is expired and refresh if needed
        const now = Date.now();
        if (expiryDate && expiryDate < now && refreshToken) {
          console.log('🔄 Google Calendar token expired, refreshing...');
          try {
            const newTokens = await CalendarService.refreshGoogleToken(refreshToken);
            accessToken = newTokens.accessToken;
            expiryDate = newTokens.expiryDate;
            
            // Save updated tokens (encrypted)
            const updatedConfig = {
              ...encryptedConfig,
              accessToken: encryptionService.encrypt(accessToken),
              expiryDate: expiryDate
            };
            
            await prisma.tenantSettings.update({
              where: { tenantId: user.tenantId },
              data: { googleCalendarConfig: updatedConfig }
            });
            console.log('✅ Google Calendar token refreshed');
          } catch (refreshError) {
            console.error('❌ Failed to refresh Google token:', refreshError);
            // Token refresh failed - user needs to reconnect
            return res.json({ events: [], needsReconnect: 'google' });
          }
        }
        
        const googleEvents = await CalendarService.getGoogleEvents(
          accessToken,
          refreshToken,
          new Date(start as string),
          new Date(end as string)
        );
        events.push(...googleEvents);
      } catch (error: any) {
        console.error('Error fetching Google Calendar events:', error);
        // If it's an auth error, indicate reconnection needed
        if (error?.code === 401 || error?.code === 400 || error?.message?.includes('invalid_grant')) {
          return res.json({ events: [], needsReconnect: 'google' });
        }
      }
    }

    // Fetch from Outlook Calendar
    if (settings?.outlookCalendarConfig) {
      try {
        const encryptedConfig = settings.outlookCalendarConfig as any;
        
        // Decrypt tokens
        let accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
        const refreshToken = encryptionService.decrypt(encryptedConfig.refreshToken);
        let expiryDate = encryptedConfig.expiryDate;
        
        // Check if token is expired and refresh if needed
        const now = Date.now();
        if (expiryDate && expiryDate < now && refreshToken) {
          console.log('🔄 Outlook Calendar token expired, refreshing...');
          try {
            const newTokens = await CalendarService.refreshOutlookToken(refreshToken);
            accessToken = newTokens.accessToken;
            expiryDate = newTokens.expiryDate;
            
            // Save updated tokens (encrypted)
            const updatedConfig = {
              ...encryptedConfig,
              accessToken: encryptionService.encrypt(accessToken),
              expiryDate: expiryDate
            };
            
            await prisma.tenantSettings.update({
              where: { tenantId: user.tenantId },
              data: { outlookCalendarConfig: updatedConfig }
            });
            console.log('✅ Outlook Calendar token refreshed');
          } catch (refreshError) {
            console.error('❌ Failed to refresh Outlook token:', refreshError);
            return res.json({ events: [], needsReconnect: 'outlook' });
          }
        }
        
        const outlookEvents = await CalendarService.getOutlookEvents(
          accessToken,
          new Date(start as string),
          new Date(end as string)
        );
        events.push(...outlookEvents);
      } catch (error: any) {
        console.error('Error fetching Outlook Calendar events:', error);
        if (error?.code === 401 || error?.message?.includes('InvalidAuthenticationToken')) {
          return res.json({ events: [], needsReconnect: 'outlook' });
        }
      }
    }

    // Sort events by start time
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    res.json({ events });
  } catch (error) {
    console.error('Error getting calendar events:', error);
    res.status(500).json({ error: 'Failed to get calendar events' });
  }
});

// Create Calendar Event
app.post('/calendar/events', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;
    const { title, start, end, location, description } = req.body;

    if (!title || !start || !end) {
      return res.status(400).json({ error: 'title, start, and end are required' });
    }

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        googleCalendarConfig: true,
        outlookCalendarConfig: true,
      }
    });

    let createdEvent = null;

    // Create event in Google Calendar
    if (settings?.googleCalendarConfig) {
      try {
        const encryptedConfig = settings.googleCalendarConfig as any;
        const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
        const refreshToken = encryptionService.decrypt(encryptedConfig.refreshToken);

        createdEvent = await CalendarService.createViewingEvent({
          provider: 'google',
          config: { accessToken, refreshToken },
          start: new Date(start),
          end: new Date(end),
          title,
          description,
          location
        });
        
        console.log('✅ Event created in Google Calendar:', createdEvent.eventId);
      } catch (error) {
        console.error('Error creating Google Calendar event:', error);
        return res.status(500).json({ error: 'Failed to create event in Google Calendar' });
      }
    }
    // Create event in Outlook Calendar
    else if (settings?.outlookCalendarConfig) {
      try {
        const encryptedConfig = settings.outlookCalendarConfig as any;
        const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);

        createdEvent = await CalendarService.createViewingEvent({
          provider: 'outlook',
          config: { accessToken },
          start: new Date(start),
          end: new Date(end),
          title,
          description,
          location
        });
        
        console.log('✅ Event created in Outlook Calendar:', createdEvent.eventId);
      } catch (error) {
        console.error('Error creating Outlook Calendar event:', error);
        return res.status(500).json({ error: 'Failed to create event in Outlook Calendar' });
      }
    } else {
      return res.status(400).json({ error: 'No calendar connected' });
    }

    res.json({ 
      success: true, 
      eventId: createdEvent?.eventId,
      link: createdEvent?.link
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Update Calendar Event
app.put('/calendar/events/:eventId', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;
    const { eventId } = req.params;
    const { title, start, end, location, description } = req.body;

    if (!title || !start || !end) {
      return res.status(400).json({ error: 'title, start, and end are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        googleCalendarConfig: true,
        outlookCalendarConfig: true,
      }
    });

    // Update event in Google Calendar
    if (settings?.googleCalendarConfig) {
      try {
        const encryptedConfig = settings.googleCalendarConfig as any;
        const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
        const refreshToken = encryptionService.decrypt(encryptedConfig.refreshToken);

        await CalendarService.updateGoogleEvent({
          accessToken,
          refreshToken,
          eventId,
          title,
          start: new Date(start),
          end: new Date(end),
          location,
          description
        });
        
        console.log('✅ Event updated in Google Calendar:', eventId);
        return res.json({ success: true });
      } catch (error) {
        console.error('Error updating Google Calendar event:', error);
        return res.status(500).json({ error: 'Failed to update event in Google Calendar' });
      }
    }
    // Update event in Outlook Calendar
    else if (settings?.outlookCalendarConfig) {
      try {
        const encryptedConfig = settings.outlookCalendarConfig as any;
        const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);

        await CalendarService.updateOutlookEvent({
          accessToken,
          eventId,
          title,
          start: new Date(start),
          end: new Date(end),
          location,
          description
        });
        
        console.log('✅ Event updated in Outlook Calendar:', eventId);
        return res.json({ success: true });
      } catch (error) {
        console.error('Error updating Outlook Calendar event:', error);
        return res.status(500).json({ error: 'Failed to update event in Outlook Calendar' });
      }
    } else {
      return res.status(400).json({ error: 'No calendar connected' });
    }
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
});

// Delete Calendar Event
app.delete('/calendar/events/:eventId', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;
    const { eventId } = req.params;

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        googleCalendarConfig: true,
        outlookCalendarConfig: true,
      }
    });

    // Delete event from Google Calendar
    if (settings?.googleCalendarConfig) {
      try {
        const encryptedConfig = settings.googleCalendarConfig as any;
        const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
        const refreshToken = encryptionService.decrypt(encryptedConfig.refreshToken);

        await CalendarService.deleteGoogleEvent({
          accessToken,
          refreshToken,
          eventId
        });
        
        console.log('✅ Event deleted from Google Calendar:', eventId);
        return res.json({ success: true });
      } catch (error) {
        console.error('Error deleting Google Calendar event:', error);
        return res.status(500).json({ error: 'Failed to delete event from Google Calendar' });
      }
    }
    // Delete event from Outlook Calendar
    else if (settings?.outlookCalendarConfig) {
      try {
        const encryptedConfig = settings.outlookCalendarConfig as any;
        const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);

        await CalendarService.deleteOutlookEvent({
          accessToken,
          eventId
        });
        
        console.log('✅ Event deleted from Outlook Calendar:', eventId);
        return res.json({ success: true });
      } catch (error) {
        console.error('Error deleting Outlook Calendar event:', error);
        return res.status(500).json({ error: 'Failed to delete event from Outlook Calendar' });
      }
    } else {
      return res.status(400).json({ error: 'No calendar connected' });
    }
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

// --- Email Integration (Gmail & Outlook) ---

import { EmailService } from './services/EmailService';

// Gmail: Get Auth URL
app.get('/email/gmail/auth-url', authMiddleware, async (req: any, res) => {
  try {
    const userEmail = req.user!.email;
    
    // Check if Outlook is already connected - only one email provider at a time
    const db = prisma || (await initializePrisma());
    const user = await db.user.findUnique({ where: { email: userEmail }, select: { tenantId: true } });
    if (user) {
      const settings = await db.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
      if (settings?.outlookMailConfig) {
        return res.status(409).json({ error: 'Outlook ist bereits verbunden. Trenne zuerst Outlook, um Gmail zu nutzen.' });
      }
    }
    
    // Pass user email as state so callback can save tokens server-side
    const state = Buffer.from(JSON.stringify({ email: userEmail })).toString('base64url');
    const authUrl = EmailService.getGmailAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error getting Gmail auth URL:', error);
    res.status(500).json({ error: 'Failed to get auth URL' });
  }
});

// Gmail: OAuth Callback - saves tokens directly server-side
app.get('/email/gmail/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=gmail&error=true`);
    }

    const tokens = await EmailService.exchangeGmailCode(code as string);
    console.log('✅ Gmail tokens exchanged for:', tokens.email);
    
    // Try to save tokens directly server-side using state parameter
    let saved = false;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
        const userEmail = stateData.email;
        console.log('📧 Saving Gmail config for user:', userEmail);
        
        const db = prisma || (await initializePrisma());
        const user = await db.user.findUnique({
          where: { email: userEmail },
          select: { tenantId: true }
        });
        
        if (user) {
          const encryptedConfig = {
            accessToken: encryptionService.encrypt(tokens.accessToken),
            refreshToken: encryptionService.encrypt(tokens.refreshToken),
            expiryDate: tokens.expiryDate,
            email: tokens.email
          };
          
          // Save Gmail config and clear Outlook config (only one provider at a time)
          await db.tenantSettings.upsert({
            where: { tenantId: user.tenantId },
            update: { gmailConfig: encryptedConfig as any, outlookMailConfig: Prisma.DbNull },
            create: { tenantId: user.tenantId, gmailConfig: encryptedConfig as any }
          });
          
          saved = true;
          console.log('✅ Gmail config saved server-side for tenant:', user.tenantId);
        }
      } catch (stateError) {
        console.error('Error saving Gmail config server-side:', stateError);
      }
    }
    
    // Redirect to frontend with success/tokens (as fallback)
    const params = new URLSearchParams({
      provider: 'gmail',
      success: 'true',
      email: tokens.email,
      ...(saved ? {} : {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate.toString()
      })
    });
    
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?${params.toString()}`);
  } catch (error) {
    console.error('Error in Gmail OAuth callback:', error);
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=gmail&error=true`);
  }
});

// Gmail: Save Configuration
app.post('/email/gmail/connect', authMiddleware, async (req, res) => {
  try {
    const { accessToken, refreshToken, expiryDate, email } = req.body;
    const userEmail = req.user!.email;

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Encrypt tokens before storing
    const encryptedConfig = {
      accessToken: encryptionService.encrypt(accessToken),
      refreshToken: encryptionService.encrypt(refreshToken),
      expiryDate,
      email
    };

    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      update: {
        gmailConfig: encryptedConfig as any
      },
      create: {
        tenantId: user.tenantId,
        gmailConfig: encryptedConfig as any
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error connecting Gmail:', error);
    res.status(500).json({ error: 'Failed to connect Gmail' });
  }
});

// Gmail: Disconnect
app.post('/email/gmail/disconnect', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: {
        gmailConfig: Prisma.DbNull
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

// Outlook Mail: Get Auth URL
app.get('/email/outlook/auth-url', authMiddleware, async (req: any, res) => {
  try {
    const userEmail = req.user!.email;
    
    // Check if Gmail is already connected - only one email provider at a time
    const db = prisma || (await initializePrisma());
    const user = await db.user.findUnique({ where: { email: userEmail }, select: { tenantId: true } });
    if (user) {
      const settings = await db.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
      if (settings?.gmailConfig) {
        return res.status(409).json({ error: 'Gmail ist bereits verbunden. Trenne zuerst Gmail, um Outlook zu nutzen.' });
      }
    }
    
    const state = Buffer.from(JSON.stringify({ email: userEmail })).toString('base64url');
    const authUrl = await EmailService.getOutlookMailAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error getting Outlook Mail auth URL:', error);
    res.status(500).json({ error: 'Failed to get auth URL' });
  }
});

// Outlook Mail: OAuth Callback - saves tokens directly server-side
app.get('/email/outlook/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=outlook-mail&error=true`);
    }

    const tokens = await EmailService.exchangeOutlookMailCode(code as string);
    console.log('✅ Outlook Mail tokens exchanged for:', tokens.email);

    // Save tokens directly server-side
    let saved = false;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
        const userEmail = stateData.email;
        console.log('📧 Saving Outlook Mail config for user:', userEmail);

        const db = prisma || (await initializePrisma());
        const user = await db.user.findUnique({
          where: { email: userEmail },
          select: { tenantId: true }
        });

        if (user) {
          const encryptedConfig = {
            accessToken: encryptionService.encrypt(tokens.accessToken),
            refreshToken: encryptionService.encrypt(tokens.refreshToken),
            expiryDate: tokens.expiryDate,
            email: tokens.email
          };

          // Save Outlook config and clear Gmail config (only one provider at a time)
          await db.tenantSettings.upsert({
            where: { tenantId: user.tenantId },
            update: { outlookMailConfig: encryptedConfig as any, gmailConfig: Prisma.DbNull },
            create: { tenantId: user.tenantId, outlookMailConfig: encryptedConfig as any }
          });

          saved = true;
          console.log('✅ Outlook Mail config saved for tenant:', user.tenantId);
        }
      } catch (stateError) {
        console.error('Error saving Outlook Mail config server-side:', stateError);
      }
    }

    const params = new URLSearchParams({
      provider: 'outlook-mail',
      success: 'true',
      email: tokens.email,
      ...(saved ? {} : {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate.toString()
      })
    });
    
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?${params.toString()}`);
  } catch (error) {
    console.error('Error in Outlook Mail OAuth callback:', error);
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=outlook-mail&error=true`);
  }
});

// Outlook Mail: Save Configuration
app.post('/email/outlook/connect', authMiddleware, async (req, res) => {
  try {
    const { accessToken, refreshToken, expiryDate, email } = req.body;
    const userEmail = req.user!.email;

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Encrypt tokens before storing
    const encryptedConfig = {
      accessToken: encryptionService.encrypt(accessToken),
      refreshToken: encryptionService.encrypt(refreshToken),
      expiryDate,
      email
    };

    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      update: {
        outlookMailConfig: encryptedConfig as any
      },
      create: {
        tenantId: user.tenantId,
        outlookMailConfig: encryptedConfig as any
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error connecting Outlook Mail:', error);
    res.status(500).json({ error: 'Failed to connect Outlook Mail' });
  }
});

// Outlook Mail: Disconnect
app.post('/email/outlook/disconnect', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: {
        outlookMailConfig: Prisma.DbNull
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Outlook Mail:', error);
    res.status(500).json({ error: 'Failed to disconnect Outlook Mail' });
  }
});

// Get Email Status
app.get('/email/status', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user!.email;

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        gmailConfig: true,
        outlookMailConfig: true
      }
    });

    const gmailConnected = !!settings?.gmailConfig;
    const outlookConnected = !!settings?.outlookMailConfig;

    let gmailEmail = null;
    let outlookEmail = null;

    if (gmailConnected && settings.gmailConfig) {
      const config = settings.gmailConfig as any;
      gmailEmail = config.email;
    }
    if (outlookConnected && settings.outlookMailConfig) {
      const config = settings.outlookMailConfig as any;
      outlookEmail = config.email;
    }

    res.json({
      gmail: {
        connected: gmailConnected,
        email: gmailEmail
      },
      outlook: {
        connected: outlookConnected,
        email: outlookEmail
      }
    });
  } catch (error) {
    console.error('Error getting email status:', error);
    res.status(500).json({ error: 'Failed to get email status' });
  }
});

// --- AI Image Editing (Virtual Staging) ---

// POST /ai/image-edit - Virtual Staging with Gemini 3 Pro Image Preview
app.post('/ai/image-edit', express.json({ limit: '20mb' }), authMiddleware, async (req, res) => {
  try {
    const { image, prompt, style, roomType, aspectRatio } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'image required' });
    }

    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Extract base64 data from data URL
    let imageData = image;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageData = matches[2];
      }
    }

    // Short, direct prompt — less is more for image editing
    let stagingPrompt: string;
    if (prompt && prompt.trim()) {
      stagingPrompt = `${prompt.trim()} Do not alter the room, walls, floor, ceiling, windows or perspective.`;
    } else {
      const parts: string[] = [];
      if (style) parts.push(`${style} style`);
      if (roomType) parts.push(roomType);
      stagingPrompt = `Add ${parts.length > 0 ? parts.join(' ') + ' ' : ''}furniture to this room. Do not alter the room, walls, floor, ceiling, windows or perspective.`;
    }

    // Map numeric aspect ratio to Gemini-supported string
    const ar = aspectRatio || 1.5;
    let geminiAspectRatio = '3:2'; // default landscape
    if (ar < 0.7) geminiAspectRatio = '9:16';
    else if (ar < 0.85) geminiAspectRatio = '2:3';
    else if (ar <= 1.15) geminiAspectRatio = '1:1';
    else if (ar < 1.4) geminiAspectRatio = '4:3';
    else geminiAspectRatio = '3:2';

    const { GoogleGenAI } = require('@google/genai');
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: 'Gemini API Key ist nicht konfiguriert.' });
    }
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    // Try gemini-2.5-flash-image (stable) first, fall back to gemini-3-pro-image-preview
    const modelId = 'gemini-2.5-flash-image';

    console.log(`🎨 Virtual staging: model=${modelId}, style=${style}, room=${roomType}, aspect=${geminiAspectRatio}, imageSize=${Math.round(imageData.length / 1024)}KB, prompt="${stagingPrompt.substring(0, 80)}..."`);

    // Use flat contents format matching official docs for image editing
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { inlineData: { mimeType, data: imageData } },
        { text: stagingPrompt },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: geminiAspectRatio,
        },
      },
    });

    // Extract generated image from response
    let generatedImage: string | null = null;
    let responseText: string | null = null;

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const outMime = part.inlineData.mimeType || 'image/png';
          generatedImage = `data:${outMime};base64,${part.inlineData.data}`;
        }
        if (part.text) {
          responseText = part.text;
        }
      }
    }

    if (!generatedImage) {
      console.error(`❌ No image in response. Text response: ${responseText || 'none'}. Candidates: ${JSON.stringify(response.candidates?.length || 0)}, promptFeedback: ${JSON.stringify(response.promptFeedback || 'none')}`);
      return res.status(500).json({ error: responseText || 'Das Modell hat kein Bild generiert. Versuche einen anderen Prompt oder ein anderes Bild.' });
    }

    console.log(`✅ Image staged for ${currentUser.email} (${modelId})`);

    res.json({ 
      image: generatedImage,
      style,
      roomType
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error('Image staging error:', errMsg);
    console.error('Image staging full error:', JSON.stringify(error, null, 2));
    
    let msg: string;
    if (errMsg.includes('SAFETY') || errMsg.includes('safety') || errMsg.includes('BLOCKED')) {
      msg = 'Das Bild wurde von der KI-Sicherheitsrichtlinie abgelehnt. Bitte versuche ein anderes Bild.';
    } else if (errMsg.includes('not found') || errMsg.includes('404') || errMsg.includes('does not exist')) {
      msg = 'Das KI-Modell ist nicht verfügbar. Bitte kontaktiere den Support.';
    } else if (errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      msg = 'API-Limit erreicht. Bitte warte einen Moment und versuche es erneut.';
    } else if (errMsg.includes('API key') || errMsg.includes('401') || errMsg.includes('UNAUTHENTICATED')) {
      msg = 'Gemini API-Key ungültig oder nicht konfiguriert.';
    } else {
      msg = `Bildbearbeitung fehlgeschlagen: ${errMsg.substring(0, 100)}`;
    }
    res.status(500).json({ error: msg });
  }
});

// Update Calendar Share Setting
app.post('/calendar/share-team', authMiddleware, async (req, res) => {
  try {
    const { shareTeam } = req.body;
    const userEmail = req.user!.email;

    // Get user's tenantId from database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        calendarShareTeam: shareTeam
      },
      update: {
        calendarShareTeam: shareTeam
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating calendar share setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// --- Admin: Run Migrations (PROTECTED - requires admin secret) ---
app.post('/admin/migrate', async (req, res) => {
  // Require admin secret for admin operations
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== process.env.ADMIN_SECRET && process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  try {
    const db = await initializePrisma();
    
    // Check what tables exist
    const tables = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` as any[];
    
    res.json({ success: true, tables: tables.map((t: any) => t.table_name) });
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Full database setup - run init migration (PROTECTED)
app.post('/admin/setup-db', async (req, res) => {
  // Require admin secret for admin operations
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== process.env.ADMIN_SECRET && process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  try {
    const db = await initializePrisma();
    
    // Read and execute the init migration file
    // In Lambda, the file is in /var/task/
    let migrationPath = path.join(process.cwd(), 'prisma/migrations/20260202171831_init/migration.sql');
    
    // Try alternative paths
    if (!fs.existsSync(migrationPath)) {
      migrationPath = '/var/task/prisma/migrations/20260202171831_init/migration.sql';
    }
    if (!fs.existsSync(migrationPath)) {
      migrationPath = path.join(__dirname, '../prisma/migrations/20260202171831_init/migration.sql');
    }
    
    if (!fs.existsSync(migrationPath)) {
      // List what's in /var/task
      let taskFiles: string[] = [];
      try { taskFiles = fs.readdirSync('/var/task'); } catch (e) {}
      
      return res.status(404).json({ 
        error: 'Migration file not found', 
        tried: [
          path.join(process.cwd(), 'prisma/migrations/20260202171831_init/migration.sql'),
          '/var/task/prisma/migrations/20260202171831_init/migration.sql',
          path.join(__dirname, '../prisma/migrations/20260202171831_init/migration.sql')
        ],
        cwd: process.cwd(),
        dirname: __dirname,
        taskFiles
      });
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Debug: return file size and first 500 chars
    if (req.query.debug === 'true') {
      return res.json({
        fileSize: migrationSql.length,
        preview: migrationSql.substring(0, 500),
        path: migrationPath
      });
    }
    
    // Split by semicolon followed by newline (to avoid splitting inside strings)
    const rawStatements = migrationSql.split(/;\s*\n/);
    const statements: string[] = [];
    
    for (const raw of rawStatements) {
      // Remove comment lines
      const lines = raw.split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      if (lines.length > 0) {
        statements.push(lines);
      }
    }
    
    let executed = 0;
    const errors: string[] = [];
    
    for (const statement of statements) {
      try {
        await db.$executeRawUnsafe(statement + ';');
        executed++;
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists') && !error.message.includes('duplicate key')) {
          errors.push(`${statement.substring(0, 80)}...: ${error.message}`);
        } else {
          executed++; // Count as executed if it already exists
        }
      }
    }
    
    // Also run the email config migration
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "gmailConfig" JSONB;`);
      await db.$executeRawUnsafe(`ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "outlookMailConfig" JSONB;`);
      executed += 2;
    } catch (e) {}
    
    // And the property address fields
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "street" TEXT;`);
      await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "houseNumber" TEXT;`);
      await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "apartmentNumber" TEXT;`);
      await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "staircase" TEXT;`);
      await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "block" TEXT;`);
      await db.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "state" TEXT;`);
      executed += 6;
    } catch (e) {}
    
    res.json({ 
      success: true, 
      executed,
      total: statements.length,
      migrationPath,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Email System API
// ============================================

import EmailSyncService from './services/EmailSyncService';
import EmailResponseHandler from './services/EmailResponseHandler';

// Get emails with folder filter
app.get('/emails', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { folder = 'INBOX', page = '1', limit = '50', leadId, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { tenantId: user.tenantId };
    
    if (folder && folder !== 'ALL') {
      where.folder = folder;
    }
    if (leadId) {
      where.leadId = leadId;
    }
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { from: { contains: search, mode: 'insensitive' } },
        { fromName: { contains: search, mode: 'insensitive' } },
        { bodyText: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [emails, total] = await Promise.all([
      db.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      db.email.count({ where })
    ]);

    // Get unread counts per folder
    const unreadCounts = await db.email.groupBy({
      by: ['folder'],
      where: { tenantId: user.tenantId, isRead: false },
      _count: true
    });

    res.json({ 
      emails, 
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
      unreadCounts: unreadCounts.reduce((acc: any, item: any) => {
        acc[item.folder] = item._count;
        return acc;
      }, {})
    });
  } catch (error: any) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single email
app.get('/emails/:id', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const email = await db.email.findFirst({
      where: { id: req.params.id, tenantId: user.tenantId }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Mark as read
    if (!email.isRead) {
      await db.email.update({
        where: { id: email.id },
        data: { isRead: true }
      });
    }

    res.json({ email });
  } catch (error: any) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark email as read/unread
app.patch('/emails/:id/read', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { isRead } = req.body;

    const email = await db.email.updateMany({
      where: { id: req.params.id, tenantId: user.tenantId },
      data: { isRead: isRead ?? true }
    });

    res.json({ success: email.count > 0 });
  } catch (error: any) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Move email to folder
app.patch('/emails/:id/move', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { folder } = req.body;
    if (!['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM'].includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }

    const email = await db.email.updateMany({
      where: { id: req.params.id, tenantId: user.tenantId },
      data: { folder }
    });

    res.json({ success: email.count > 0 });
  } catch (error: any) {
    console.error('Error moving email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle star on email
app.patch('/emails/:id/star', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { isStarred } = req.body;

    const email = await db.email.updateMany({
      where: { id: req.params.id, tenantId: user.tenantId },
      data: { isStarred: Boolean(isStarred) }
    });

    res.json({ success: email.count > 0 });
  } catch (error: any) {
    console.error('Error toggling star:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete email (move to trash or permanent delete)
app.delete('/emails/:id', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { permanent } = req.query;

    const email = await db.email.findFirst({
      where: { id: req.params.id, tenantId: user.tenantId }
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    if (permanent === 'true' || email.folder === 'TRASH') {
      // Permanent delete
      await db.email.delete({ where: { id: email.id } });
    } else {
      // Move to trash
      await db.email.update({
        where: { id: email.id },
        data: { folder: 'TRASH' }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send email (new general endpoint)
app.post('/emails/send', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const user = await db.user.findUnique({ 
      where: { email: req.user!.email },
      include: { settings: true }
    });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { to, cc, bcc, subject, body, bodyHtml, leadId, replyToEmailId, asDraft, draftId } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to, subject' });
    }

    // Get email configuration
    const settings = await db.tenantSettings.findUnique({
      where: { tenantId: user.tenantId }
    });

    // Prepare email body with signature if available
    let finalBody = body || '';
    // Auto-generate HTML from plain text if no HTML body was provided
    let finalHtml = bodyHtml || (finalBody ? finalBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') : undefined);
    
    const userSettings = user.settings as any;
    if (userSettings?.emailSignature && !finalBody.includes(userSettings.emailSignature)) {
      finalBody = finalBody + '\n\n' + userSettings.emailSignature;
      if (finalHtml) {
        finalHtml = finalHtml + '<br><br>' + userSettings.emailSignature;
      }
    }

    // Build full sender name for drafts and sent emails
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || undefined;

    // If saving as draft
    if (asDraft) {
      const draft = await db.email.create({
        data: {
          tenantId: user.tenantId,
          from: user.email,
          fromName: fullName,
          to: Array.isArray(to) ? to : [to],
          cc: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
          bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
          subject,
          bodyText: finalBody,
          bodyHtml: finalHtml,
          folder: 'DRAFTS',
          isRead: true,
          leadId: leadId || undefined,
        }
      });
      return res.json({ success: true, draft: true, emailId: draft.id });
    }

    // Determine which email provider to use
    let sendResult: { success: boolean; provider?: string; error?: string } = { success: false };

    if (settings?.gmailConfig) {
      // Send via Gmail
      const config = settings.gmailConfig as any;
      let accessToken = config.accessToken;
      let refreshToken = config.refreshToken;
      
      try { accessToken = encryptionService.decrypt(accessToken); } catch {}
      try { refreshToken = encryptionService.decrypt(refreshToken); } catch {}

      const { google } = require('googleapis');
      const googleConfig = {
        clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_EMAIL_REDIRECT_URI || 'http://localhost:3001/email/gmail/callback'
      };
      
      const oauth2Client = new google.auth.OAuth2(
        googleConfig.clientId,
        googleConfig.clientSecret,
        googleConfig.redirectUri
      );
      oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Build sender name from user profile
      const senderName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || '';
      const fromHeader = senderName 
        ? `"${senderName}" <${user.email}>`
        : user.email;

      // Build email message (the blank line between headers and body is required by RFC 2822)
      const emailLines = [
        `From: ${fromHeader}`,
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        ...(bcc ? [`Bcc: ${bcc}`] : []),
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        finalHtml || finalBody.replace(/\n/g, '<br>')
      ];

      const rawMessage = Buffer.from(emailLines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      try {
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: rawMessage }
        });
        sendResult = { success: true, provider: 'gmail' };
      } catch (gmailError: any) {
        console.error('Gmail send error:', gmailError);
        sendResult = { success: false, error: gmailError.message };
      }
    } else if (settings?.smtpConfig) {
      // Send via SMTP (fallback)
      const smtpConfig = settings.smtpConfig as any;
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

      // Build sender name for SMTP
      const smtpSenderName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || '';
      const smtpFrom = smtpSenderName 
        ? `"${smtpSenderName}" <${smtpConfig.from || user.email}>`
        : (smtpConfig.from || user.email);

      try {
        await transporter.sendMail({
          from: smtpFrom,
          to,
          cc,
          bcc,
          subject,
          text: finalBody,
          html: finalHtml,
        });
        sendResult = { success: true, provider: 'smtp' };
      } catch (smtpError: any) {
        console.error('SMTP send error:', smtpError);
        sendResult = { success: false, error: smtpError.message };
      }
    } else {
      return res.status(400).json({ error: 'No email provider configured. Please connect Gmail or configure SMTP in settings.' });
    }

    if (sendResult.success) {
      // Build full sender name
      const fullSenderName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || undefined;
      
      // Save to sent folder
      await db.email.create({
        data: {
          tenantId: user.tenantId,
          from: user.email,
          fromName: fullSenderName,
          to: Array.isArray(to) ? to : [to],
          cc: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
          subject,
          bodyText: finalBody,
          bodyHtml: finalHtml,
          folder: 'SENT',
          isRead: true,
          provider: sendResult.provider === 'gmail' ? 'GMAIL' : 'SMTP',
          leadId: leadId || undefined,
          sentAt: new Date(),
        }
      });

      // Delete the draft if this was sent from a draft
      if (draftId) {
        await db.email.deleteMany({
          where: { 
            id: draftId, 
            tenantId: user.tenantId,
            folder: 'DRAFTS'
          }
        });
      }

      // If linked to a lead, create a message record and activity
      if (leadId) {
        await db.message.create({
          data: {
            leadId,
            role: 'ASSISTANT',
            content: `Subject: ${subject}\n\n${finalBody}`,
            status: 'SENT'
          }
        });
        
        // Create activity for email sent
        await db.leadActivity.create({
          data: {
            leadId,
            type: 'EMAIL_SENT',
            description: `E-Mail gesendet: "${subject}"`,
            createdBy: user.id
          }
        });
      }

      res.json({ success: true, provider: sendResult.provider });
    } else {
      res.status(500).json({ success: false, error: sendResult.error });
    }
  } catch (error: any) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync emails from providers
app.post('/emails/sync', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userEmail = req.user!.email;
    const user = await db.user.findUnique({ where: { email: userEmail } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    console.log(`📧 Starting email sync for tenant ${user.tenantId}...`);
    const result = await EmailSyncService.syncAll(user.tenantId);
    console.log(`📧 Email sync complete:`, result);
    res.json(result);
  } catch (error: any) {
    console.error('Error syncing emails:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sync status
app.get('/emails/sync/status', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userEmail = req.user!.email;
    const user = await db.user.findUnique({ where: { email: userEmail } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const status = await EmailSyncService.getSyncStatus(user.tenantId);
    res.json(status);
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process incoming email (webhook endpoint)
app.post('/emails/incoming', async (req, res) => {
  try {
    const { tenantId, from, fromName, subject, body, receivedAt } = req.body;

    if (!tenantId || !from || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await EmailResponseHandler.processEmailResponse(tenantId, {
      from,
      fromName,
      subject,
      body,
      receivedAt: receivedAt ? new Date(receivedAt) : new Date()
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error processing incoming email:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Notifications API
// ============================================

import NotificationService from './services/NotificationService';
import JarvisActionService from './services/JarvisActionService';
import SchedulerService from './services/SchedulerService';

// Get notifications for current user
app.get('/notifications', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    const { unreadOnly, limit, offset } = req.query;

    const notifications = await NotificationService.getNotificationsForUser(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    const unreadCount = await NotificationService.getUnreadCount(userId);

    res.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
app.patch('/notifications/:id/read', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    const success = await NotificationService.markAsRead(id, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
app.post('/notifications/mark-all-read', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.sub;
    const count = await NotificationService.markAllAsRead(userId);
    res.json({ success: true, count });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Activities API
// ============================================

// Get all activities for tenant
app.get('/activities', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userEmail = req.user!.email;
    const { limit = 100, leadId, type } = req.query;

    console.log('📋 Loading activities for user:', userEmail);

    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true, tenantId: true }
    });

    if (!user) {
      console.log('❌ User not found:', userEmail);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('📋 User found:', user.id, 'tenantId:', user.tenantId);

    // First check total count
    const totalCount = await db.leadActivity.count({
      where: {
        lead: { tenantId: user.tenantId }
      }
    });
    console.log('📋 Total activities in DB for tenant:', totalCount);

    const activities = await db.leadActivity.findMany({
      where: {
        lead: { tenantId: user.tenantId },
        ...(leadId && { leadId: leadId as string }),
        ...(type && { type: type as string }),
      },
      select: {
        id: true,
        leadId: true,
        type: true,
        description: true,
        metadata: true,
        propertyId: true,
        jarvisActionId: true,
        createdBy: true,
        createdAt: true,
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        property: {
          select: { id: true, title: true, address: true }
        },
        jarvisAction: {
          select: { id: true, status: true, question: true, options: true, allowCustom: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    // Fetch user names for createdBy IDs
    const createdByIds = [...new Set(activities.map(a => a.createdBy).filter(Boolean))] as string[];
    const users = createdByIds.length > 0 
      ? await db.user.findMany({
          where: { id: { in: createdByIds } },
          select: { id: true, firstName: true, lastName: true, name: true, email: true }
        })
      : [];
    // Build full name from firstName + lastName, fallback to name, then email
    const userMap = new Map(users.map(u => {
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
      return [u.id, fullName || u.name || u.email.split('@')[0]];
    }));

    // Add createdByName to activities
    const activitiesWithNames = activities.map(a => ({
      ...a,
      createdByName: a.createdBy ? userMap.get(a.createdBy) || null : null
    }));

    console.log('📋 Returning', activitiesWithNames.length, 'activities');
    res.json({ activities: activitiesWithNames, currentUserId: user.id });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Admin: Backfill activities for existing leads
// ============================================
app.post('/admin/backfill-activities', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userEmail = req.user!.email;
    
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true, tenantId: true, role: true }
    });
    
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Get all leads for this tenant that don't have a LEAD_CREATED activity
    const leads = await db.lead.findMany({
      where: { tenantId: user.tenantId },
      include: {
        activities: {
          where: { type: 'LEAD_CREATED' }
        }
      }
    });
    
    const leadsWithoutActivity = leads.filter(l => l.activities.length === 0);
    console.log(`📋 Found ${leadsWithoutActivity.length} leads without LEAD_CREATED activity`);
    
    // Create activities for these leads
    let created = 0;
    for (const lead of leadsWithoutActivity) {
      await db.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'LEAD_CREATED',
          description: `Lead ${lead.firstName || ''} ${lead.lastName || ''} erstellt`.trim(),
          createdBy: user.id,
          createdAt: lead.createdAt // Use the lead's creation date
        }
      });
      created++;
    }
    
    console.log(`📋 Created ${created} LEAD_CREATED activities`);
    res.json({ success: true, created, total: leads.length });
  } catch (error: any) {
    console.error('Error backfilling activities:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Admin Panel API (Platform-wide, adminAuthMiddleware)
// ============================================

// --- Admin Dashboard Stats ---
app.get('/admin/platform/stats', adminAuthMiddleware, async (_req, res) => {
  try {
    const db = await initializePrisma();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [tenantCount, userCount, leadCount, propertyCount, exposeCount, emailCount,
           newTenantsThisMonth, newLeadsThisMonth, newUsersThisMonth] = await Promise.all([
      db.tenant.count(),
      db.user.count(),
      db.lead.count(),
      db.property.count(),
      db.expose.count(),
      db.email.count(),
      db.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.user.count({ where: {} }), // Can't filter by createdAt on User (no field), use total
    ]);

    // Lead status distribution
    const leadsByStatus = await db.lead.groupBy({ by: ['status'], _count: true });
    
    // Properties by status
    const propertiesByStatus = await db.property.groupBy({ by: ['status'], _count: true });

    // Recent activities (platform-wide, last 20)
    const recentActivities = await db.leadActivity.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { firstName: true, lastName: true, email: true, tenant: { select: { name: true } } } },
      }
    });

    res.json({
      tenants: tenantCount,
      users: userCount,
      leads: leadCount,
      properties: propertyCount,
      exposes: exposeCount,
      emails: emailCount,
      newTenantsThisMonth,
      newLeadsThisMonth,
      leadsByStatus: leadsByStatus.reduce((acc: any, s: any) => ({ ...acc, [s.status]: s._count }), {}),
      propertiesByStatus: propertiesByStatus.reduce((acc: any, s: any) => ({ ...acc, [s.status]: s._count }), {}),
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt,
        tenantName: a.lead?.tenant?.name || '—',
        leadName: `${a.lead?.firstName || ''} ${a.lead?.lastName || ''}`.trim() || a.lead?.email || '—',
      })),
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Admin Health Check ---
app.get('/admin/platform/health', adminAuthMiddleware, async (_req, res) => {
  const results: Record<string, { status: string; latency?: number; detail?: string }> = {};
  
  // DB Check
  try {
    const start = Date.now();
    const db = await initializePrisma();
    await db.$queryRaw`SELECT 1`;
    results['database'] = { status: 'healthy', latency: Date.now() - start };
  } catch (e: any) {
    results['database'] = { status: 'error', detail: e.message };
  }

  // Cognito Check (env vars configured?)
  results['cognito'] = {
    status: process.env.USER_POOL_ID && process.env.CLIENT_ID ? 'healthy' : 'error',
    detail: process.env.USER_POOL_ID ? 'Configured' : 'Not configured',
  };

  // Admin Cognito Check
  results['admin_cognito'] = {
    status: process.env.ADMIN_USER_POOL_ID && process.env.ADMIN_CLIENT_ID ? 'healthy' : 'error',
    detail: process.env.ADMIN_USER_POOL_ID ? 'Configured' : 'Not configured',
  };

  // S3 Media Bucket
  results['s3_media'] = {
    status: process.env.MEDIA_BUCKET_NAME ? 'healthy' : 'warning',
    detail: process.env.MEDIA_BUCKET_NAME || 'Not configured (local fallback)',
  };

  // OpenAI / AI
  results['openai'] = {
    status: process.env.OPENAI_API_KEY ? 'healthy' : 'error',
    detail: process.env.OPENAI_API_KEY ? 'API Key configured' : 'Not configured',
  };

  // Gemini
  results['gemini'] = {
    status: process.env.GEMINI_API_KEY ? 'healthy' : 'warning',
    detail: process.env.GEMINI_API_KEY ? 'API Key configured' : 'Not configured',
  };

  // Email (Resend)
  results['email'] = {
    status: process.env.RESEND_API_KEY ? 'healthy' : 'warning',
    detail: process.env.RESEND_API_KEY ? 'Resend API Key configured' : 'Not configured',
  };

  // Lambda environment
  results['lambda'] = {
    status: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'healthy' : 'info',
    detail: process.env.AWS_LAMBDA_FUNCTION_NAME || 'Local development',
  };

  const allHealthy = Object.values(results).every(r => r.status === 'healthy' || r.status === 'info');
  res.json({ overall: allHealthy ? 'healthy' : 'degraded', services: results });
});

// --- Admin Tenants ---
app.get('/admin/platform/tenants', adminAuthMiddleware, async (_req, res) => {
  try {
    const db = await initializePrisma();
    const tenants = await db.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, leads: true, properties: true, exposeTemplates: true } },
        settings: { select: { inboundLeadEmail: true, autoReplyEnabled: true } },
      }
    });
    res.json(tenants.map(t => ({
      id: t.id,
      name: t.name,
      address: t.address,
      createdAt: t.createdAt,
      userCount: t._count.users,
      leadCount: t._count.leads,
      propertyCount: t._count.properties,
      templateCount: t._count.exposeTemplates,
      inboundEmail: t.settings?.inboundLeadEmail ? `${t.settings.inboundLeadEmail}@leads.immivo.ai` : null,
      autoReply: t.settings?.autoReplyEnabled || false,
    })));
  } catch (error: any) {
    console.error('Admin tenants error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: Create Tenant ---
app.post('/admin/platform/tenants', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const { name, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    
    const tenant = await db.tenant.create({ data: { name, address } });
    // Create default settings
    await db.tenantSettings.create({ data: { tenantId: tenant.id } });
    res.json(tenant);
  } catch (error: any) {
    console.error('Admin create tenant error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: Delete Tenant ---
app.delete('/admin/platform/tenants/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    await db.tenant.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Admin delete tenant error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: All Users (platform-wide) ---
app.get('/admin/platform/users', adminAuthMiddleware, async (_req, res) => {
  try {
    const db = await initializePrisma();
    const users = await db.user.findMany({
      orderBy: { email: 'asc' },
      include: {
        tenant: { select: { name: true } },
        _count: { select: { leads: true } },
      }
    });
    res.json(users.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      role: u.role,
      tenantId: u.tenantId,
      tenantName: u.tenant.name,
      leadCount: u._count.leads,
    })));
  } catch (error: any) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: Audit Logs ---
app.get('/admin/platform/audit-logs', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const flaggedOnly = req.query.flagged === 'true';

    const where = flaggedOnly ? { flagged: true } : {};
    const [logs, total] = await Promise.all([
      db.aiAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          tenant: { select: { name: true } },
        }
      }),
      db.aiAuditLog.count({ where }),
    ]);

    res.json({
      logs: logs.map(l => ({
        id: l.id,
        endpoint: l.endpoint,
        message: l.message.substring(0, 200),
        response: l.response?.substring(0, 200),
        flagged: l.flagged,
        flagReason: l.flagReason,
        userEmail: l.user.email,
        userName: `${l.user.firstName || ''} ${l.user.lastName || ''}`.trim(),
        tenantName: l.tenant.name,
        createdAt: l.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Admin audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Admin: Platform Settings (read env-based config) ---
app.get('/admin/platform/settings', adminAuthMiddleware, async (_req, res) => {
  try {
    res.json({
      ai: {
        openaiKey: process.env.OPENAI_API_KEY ? '••••' + (process.env.OPENAI_API_KEY).slice(-4) : '',
        geminiKey: process.env.GEMINI_API_KEY ? '••••' + (process.env.GEMINI_API_KEY).slice(-4) : '',
      },
      auth: {
        userPoolId: process.env.USER_POOL_ID || '',
        clientId: process.env.CLIENT_ID || '',
        adminUserPoolId: process.env.ADMIN_USER_POOL_ID || '',
        adminClientId: process.env.ADMIN_CLIENT_ID || '',
      },
      email: {
        provider: 'Resend',
        resendKey: process.env.RESEND_API_KEY ? '••••' + (process.env.RESEND_API_KEY).slice(-4) : '',
        fromEmail: process.env.RESEND_FROM_EMAIL || process.env.SES_FROM_EMAIL || 'noreply@immivo.ai',
      },
      storage: {
        mediaBucket: process.env.MEDIA_BUCKET_NAME || '',
      },
      environment: process.env.AWS_LAMBDA_FUNCTION_NAME ? 'production' : 'development',
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WorkMail Calendar API
// ============================================

import {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getBusySlots,
  getMultipleCalendars,
  WorkMailCredentials,
} from './services/WorkMailCalendarService';

function getWorkMailCreds(): WorkMailCredentials {
  return {
    email: process.env.WORKMAIL_EMAIL || '',
    password: process.env.WORKMAIL_PASSWORD || '',
  };
}

// Get calendar events for current user or a specific email
app.get('/calendar/events', authMiddleware, async (req: any, res) => {
  try {
    const creds = getWorkMailCreds();
    if (!creds.email || !creds.password) {
      return res.status(500).json({ error: 'WorkMail not configured' });
    }
    const start = new Date(req.query.start as string || new Date().toISOString());
    const end = new Date(req.query.end as string || new Date(Date.now() + 30 * 86400000).toISOString());
    const targetEmail = req.query.email as string | undefined;

    const events = await getCalendarEvents(creds, start, end, targetEmail);
    res.json({ events });
  } catch (error: any) {
    console.error('Calendar events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a calendar event
app.post('/calendar/events', authMiddleware, async (req: any, res) => {
  try {
    const creds = getWorkMailCreds();
    if (!creds.email || !creds.password) {
      return res.status(500).json({ error: 'WorkMail not configured' });
    }
    const { subject, body, start, end, location, attendees, meetLink, isAllDay } = req.body;
    if (!subject || !start || !end) {
      return res.status(400).json({ error: 'subject, start, end required' });
    }

    const result = await createCalendarEvent(creds, {
      subject,
      body,
      start: new Date(start),
      end: new Date(end),
      location,
      attendees,
      meetLink,
      isAllDay,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Calendar create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a calendar event
app.delete('/calendar/events/:id', authMiddleware, async (req: any, res) => {
  try {
    const creds = getWorkMailCreds();
    if (!creds.email || !creds.password) {
      return res.status(500).json({ error: 'WorkMail not configured' });
    }
    const success = await deleteCalendarEvent(creds, req.params.id);
    res.json({ success });
  } catch (error: any) {
    console.error('Calendar delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get busy slots (for public booking page)
app.get('/calendar/busy', async (req, res) => {
  try {
    const creds = getWorkMailCreds();
    if (!creds.email || !creds.password) {
      return res.status(500).json({ error: 'WorkMail not configured' });
    }
    const email = req.query.email as string || creds.email;
    const start = new Date(req.query.start as string || new Date().toISOString());
    const end = new Date(req.query.end as string || new Date(Date.now() + 14 * 86400000).toISOString());

    const slots = await getBusySlots(creds, email, start, end);
    res.json({ slots });
  } catch (error: any) {
    console.error('Calendar busy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Public: Book a demo (no auth required)
app.post('/calendar/book-demo', async (req, res) => {
  try {
    const creds = getWorkMailCreds();
    if (!creds.email || !creds.password) {
      return res.status(500).json({ error: 'WorkMail not configured' });
    }
    const { name, email, company, message, start, end } = req.body;
    if (!name || !email || !start || !end) {
      return res.status(400).json({ error: 'name, email, start, end required' });
    }

    const subject = `Demo Call – ${name}${company ? ` (${company})` : ''}`;
    const meetLink = 'https://meet.google.com/new';
    const body = [
      `Demo-Termin mit ${name}`,
      `E-Mail: ${email}`,
      company ? `Unternehmen: ${company}` : '',
      message ? `Nachricht: ${message}` : '',
      '',
      `Google Meet: ${meetLink}`,
    ].filter(Boolean).join('\n');

    const result = await createCalendarEvent(creds, {
      subject,
      body,
      start: new Date(start),
      end: new Date(end),
      attendees: [email],
      meetLink,
    });
    res.json({ success: true, eventId: result?.id });
  } catch (error: any) {
    console.error('Demo booking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all employee calendars
app.get('/admin/platform/calendars', adminAuthMiddleware, async (req, res) => {
  try {
    const creds = getWorkMailCreds();
    if (!creds.email || !creds.password) {
      return res.status(500).json({ error: 'WorkMail not configured' });
    }
    const emails = (req.query.emails as string || '').split(',').filter(Boolean);
    if (emails.length === 0) {
      return res.status(400).json({ error: 'emails parameter required' });
    }
    const start = new Date(req.query.start as string || new Date().toISOString());
    const end = new Date(req.query.end as string || new Date(Date.now() + 7 * 86400000).toISOString());

    const calendars = await getMultipleCalendars(creds, emails, start, end);
    res.json({ calendars });
  } catch (error: any) {
    console.error('Admin calendars error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Bug Reports API
// ============================================

// Create bug report (tenant user)
app.post('/bug-reports', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const user = await db.user.findUnique({
      where: { email: req.user!.email },
      include: { tenant: { select: { name: true } } }
    });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, page, screenshot, consoleLogs } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Titel und Beschreibung erforderlich' });

    // Upload screenshot to S3 if provided (base64 PNG)
    let screenshotUrl: string | null = null;
    if (screenshot && typeof screenshot === 'string') {
      try {
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `bug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        screenshotUrl = await uploadToS3(buffer, filename, 'image/png', 'bug-reports');
      } catch (err) {
        console.error('Bug report screenshot upload error:', err);
      }
    }

    const report = await db.bugReport.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        userEmail: user.email,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        tenantName: user.tenant.name,
        title,
        description,
        page: page || null,
        screenshotUrl,
        consoleLogs: consoleLogs || null,
      }
    });

    res.json(report);
  } catch (error: any) {
    console.error('Bug report create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List bug reports (admin)
app.get('/admin/platform/bug-reports', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const status = req.query.status as string | undefined;
    const where = status && status !== 'ALL' ? { status: status as any } : {};
    
    const reports = await db.bugReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const counts = await db.bugReport.groupBy({
      by: ['status'],
      _count: true,
    });

    res.json({
      reports,
      counts: counts.reduce((acc: any, c: any) => ({ ...acc, [c.status]: c._count }), {}),
      total: reports.length,
    });
  } catch (error: any) {
    console.error('Bug reports list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update bug report status/priority/notes (admin)
app.patch('/admin/platform/bug-reports/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const db = await initializePrisma();
    const { status, priority, adminNotes } = req.body;
    
    const data: any = {};
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const report = await db.bugReport.update({
      where: { id: req.params.id },
      data,
    });

    res.json(report);
  } catch (error: any) {
    console.error('Bug report update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Jarvis Pending Actions API
// ============================================

// Get pending actions for current user
app.get('/jarvis/actions', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.sub;
    const actions = await JarvisActionService.getPendingActionsForUser(userId);
    res.json({ actions });
  } catch (error: any) {
    console.error('Error fetching pending actions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all pending actions for tenant (admin only)
app.get('/jarvis/actions/all', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const actions = await JarvisActionService.getPendingActionsForTenant(user.tenantId);
    res.json({ actions });
  } catch (error: any) {
    console.error('Error fetching all pending actions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve a pending action
app.post('/jarvis/actions/:id/resolve', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({ error: 'Resolution is required' });
    }

    // Verify user owns this action or is admin
    const action = await db.jarvisPendingAction.findUnique({ where: { id } });
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (action.userId !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Cancel any pending schedules
    await SchedulerService.cancelActionSchedules(id);

    const resolved = await JarvisActionService.resolveAction(id, resolution, userId);
    res.json({ success: true, action: resolved });
  } catch (error: any) {
    console.error('Error resolving action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Respond to a pending action (simplified version of resolve)
app.post('/jarvis/actions/:id/respond', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userEmail = req.user!.email;
    const { id } = req.params;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({ error: 'Response is required' });
    }

    const user = await db.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the action
    const action = await db.jarvisPendingAction.findUnique({ 
      where: { id },
      include: { activity: true }
    });
    
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    if (action.status !== 'PENDING') {
      return res.status(400).json({ error: 'Action already resolved' });
    }

    // Handle different action types
    if (action.type === 'ASSIGN_PROPERTY' && response !== 'none') {
      // Assign property to lead
      if (action.leadId) {
        await db.lead.update({
          where: { id: action.leadId },
          data: { propertyId: response }
        });

        // Create activity for assignment
        await db.leadActivity.create({
          data: {
            leadId: action.leadId,
            type: 'PROPERTY_ASSIGNED',
            description: 'Objekt manuell zugewiesen',
            propertyId: response,
            createdBy: user.id,
          }
        });
      }
    }

    // Resolve the action
    const resolved = await db.jarvisPendingAction.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution: response,
        resolvedAt: new Date(),
      }
    });

    // Update linked activity if exists
    if (action.activity) {
      await db.leadActivity.update({
        where: { id: action.activity.id },
        data: {
          type: 'PROPERTY_ASSIGNED',
          description: response === 'none' 
            ? 'Keinem Objekt zugeordnet' 
            : 'Objekt zugewiesen',
        }
      });
    }

    res.json({ success: true, action: resolved });
  } catch (error: any) {
    console.error('Error responding to action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel a pending action
app.post('/jarvis/actions/:id/cancel', authMiddleware, async (req: any, res) => {
  try {
    const db = await initializePrisma();
    const userId = req.user.sub;
    const { id } = req.params;
    const { reason } = req.body;

    // Verify user owns this action or is admin
    const action = await db.jarvisPendingAction.findUnique({ where: { id } });
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (action.userId !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Cancel any pending schedules
    await SchedulerService.cancelActionSchedules(id);

    const cancelled = await JarvisActionService.cancelAction(id, reason);
    res.json({ success: true, action: cancelled });
  } catch (error: any) {
    console.error('Error cancelling action:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Internal Scheduler Endpoints (called by EventBridge)
// ============================================

// Internal endpoint for auto-reply
app.post('/internal/scheduler/auto-reply', async (req, res) => {
  try {
    const db = await initializePrisma();
    const { leadId, tenantId } = req.body;
    
    console.log(`📧 Auto-reply triggered for lead ${leadId}`);
    
    // 1. Get lead with property and messages
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { 
        property: true,
        messages: { where: { status: 'DRAFT', role: 'ASSISTANT' }, take: 1 }
      }
    });
    
    if (!lead) {
      console.log(`⚠️ Lead ${leadId} not found`);
      return res.json({ success: false, error: 'Lead not found' });
    }
    
    if (lead.status !== 'NEW') {
      console.log(`⚠️ Lead ${leadId} status is ${lead.status}, skipping auto-reply`);
      return res.json({ success: false, error: 'Lead already processed' });
    }
    
    // 2. Get tenant settings for email config
    const tenantSettings = await db.tenantSettings.findUnique({
      where: { tenantId }
    });
    
    if (!tenantSettings) {
      console.log(`⚠️ Tenant settings not found for ${tenantId}`);
      return res.json({ success: false, error: 'Tenant settings not found' });
    }
    
    // 3. Get the draft message
    const draftMessage = lead.messages[0];
    if (!draftMessage) {
      console.log(`⚠️ No draft message found for lead ${leadId}`);
      return res.json({ success: false, error: 'No draft message' });
    }
    
    // 4. Prepare email config
    const emailConfig: any = {};
    if (tenantSettings.gmailConfig) {
      const config = tenantSettings.gmailConfig as any;
      emailConfig.gmailConfig = {
        accessToken: encryptionService.decrypt(config.accessToken),
        refreshToken: encryptionService.decrypt(config.refreshToken),
        expiryDate: config.expiryDate,
        email: config.email
      };
    }
    if (tenantSettings.outlookMailConfig) {
      const config = tenantSettings.outlookMailConfig as any;
      emailConfig.outlookMailConfig = {
        accessToken: encryptionService.decrypt(config.accessToken),
        refreshToken: config.refreshToken,
        expiryDate: config.expiryDate,
        email: config.email
      };
    }
    if (tenantSettings.smtpConfig) {
      emailConfig.smtpConfig = tenantSettings.smtpConfig;
    }
    
    // 5. Check if we have an email provider
    if (!EmailService.hasEmailProvider(emailConfig)) {
      console.log(`⚠️ No email provider configured for tenant ${tenantId}`);
      
      // Create Jarvis action to notify admin
      const admin = await db.user.findFirst({
        where: { tenantId, role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
      });
      
      if (admin) {
        await JarvisActionService.createPendingAction({
          tenantId,
          userId: admin.id,
          leadId,
          type: 'ESCALATION',
          question: 'Auto-Reply konnte nicht gesendet werden: Kein E-Mail-Provider konfiguriert. Bitte Gmail, Outlook oder SMTP in den Einstellungen verbinden.',
          context: { leadEmail: lead.email }
        });
      }
      
      return res.json({ success: false, error: 'No email provider configured' });
    }
    
    // 6. Generate email subject
    const emailSubject = lead.property 
      ? `Ihr Exposé für ${lead.property.title}`
      : 'Ihre Anfrage';
    
    // 7. Send the email
    const result = await EmailService.sendEmail(emailConfig, {
      to: lead.email,
      subject: emailSubject,
      body: draftMessage.content,
      html: draftMessage.content.includes('<') ? draftMessage.content : undefined
    });
    
    if (result.success) {
      // 8. Update lead status and message
      await db.lead.update({
        where: { id: leadId },
        data: { status: 'CONTACTED' }
      });
      
      await db.message.update({
        where: { id: draftMessage.id },
        data: { status: 'SENT' }
      });
      
      // 9. Create activity log
      await db.leadActivity.create({
        data: {
          leadId,
          type: 'EMAIL_SENT',
          description: `Exposé automatisch gesendet via ${result.provider}`
        }
      });
      
      // 10. Store email in local database
      await db.email.create({
        data: {
          tenantId,
          from: EmailService.getSenderEmail(emailConfig) || 'noreply@immivo.ai',
          to: [lead.email],
          cc: [],
          bcc: [],
          subject: emailSubject,
          bodyHtml: draftMessage.content.includes('<') ? draftMessage.content : undefined,
          bodyText: draftMessage.content,
          folder: 'SENT',
          isRead: true,
          hasAttachments: false,
          leadId,
          provider: result.provider === 'gmail' ? 'GMAIL' : result.provider === 'outlook' ? 'OUTLOOK' : 'SMTP',
          sentAt: new Date()
        }
      });
      
      console.log(`✅ Auto-reply sent successfully for lead ${leadId} via ${result.provider}`);
      res.json({ success: true, provider: result.provider });
    } else {
      console.log(`❌ Auto-reply failed for lead ${leadId}: ${result.error}`);
      
      // Notify assigned agent about the failure
      if (lead.assignedToId) {
        await JarvisActionService.createPendingAction({
          tenantId,
          userId: lead.assignedToId,
          leadId,
          type: 'ESCALATION',
          question: `Auto-Reply an ${lead.email} fehlgeschlagen: ${result.error}. Bitte manuell senden.`,
          context: { error: result.error }
        });
      }
      
      res.json({ success: false, error: result.error });
    }
  } catch (error: any) {
    console.error('Auto-reply error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Internal endpoint for reminder
app.post('/internal/scheduler/reminder', async (req, res) => {
  try {
    const { actionId } = req.body;
    await JarvisActionService.sendReminder(actionId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Reminder error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Internal endpoint for escalation
app.post('/internal/scheduler/escalation', async (req, res) => {
  try {
    const { actionId } = req.body;
    await JarvisActionService.escalateAction(actionId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Escalation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Internal Lead Ingestion Endpoint (called by Email Parser Lambda)
// ============================================

import { parsePortalEmail, isPortalEmail } from './services/EmailParserService';
import { matchProperty, getPropertiesForSelection } from './services/PropertyMatchingService';

app.post('/internal/ingest-lead', async (req, res) => {
  try {
    const db = await initializePrisma();
    const { recipientEmail, from, subject, text, html, rawEmail } = req.body;

    console.log(`📧 Lead ingestion: Email to ${recipientEmail} from ${from}`);

    // 1. Find tenant by inboundLeadEmail
    const emailPrefix = recipientEmail?.split('@')[0];
    if (!emailPrefix) {
      console.log('⚠️ No recipient email prefix');
      return res.status(400).json({ error: 'Invalid recipient email' });
    }

    const tenantSettings = await db.tenantSettings.findFirst({
      where: { inboundLeadEmail: emailPrefix },
      include: { tenant: true }
    });

    if (!tenantSettings) {
      console.log(`⚠️ No tenant found for email prefix: ${emailPrefix}`);
      return res.status(404).json({ error: 'Tenant not found for this email address' });
    }

    const tenantId = tenantSettings.tenantId;
    console.log(`✅ Tenant identified: ${tenantSettings.tenant.name} (${tenantId})`);

    // 2. Check if this is a portal email
    if (!isPortalEmail(from, subject)) {
      console.log('⚠️ Not a recognized portal email, skipping');
      return res.json({ success: false, message: 'Not a portal email' });
    }

    // 3. Parse email with Jarvis
    console.log('🤖 Parsing email with Jarvis...');
    const parseResult = await parsePortalEmail({ from, subject, text, html });

    if (!parseResult.success) {
      console.log(`⚠️ Failed to parse email: ${parseResult.error}`);
      // Still create a lead with minimal data
    }

    console.log(`📋 Parse result: portal=${parseResult.portal}, hasClickLink=${parseResult.hasClickLink}`);

    // 4. Determine lead stage based on parse result
    let leadStatus: 'NEW' | 'CONTACTED' | 'CONVERSATION' | 'BOOKED' | 'LOST' = 'NEW';
    
    // 5. Create the lead (always!)
    const leadData = parseResult.leadData;
    // Build notes with message and link info
    let leadNotes = leadData.message || parseResult.rawMessage || '';
    if (parseResult.hasClickLink) {
      leadNotes = `⚠️ Portal-Email erfordert Link-Klick. URL: ${parseResult.clickLinkUrl || 'nicht erkannt'}\n\n${leadNotes}`;
    }

    const lead = await db.lead.create({
      data: {
        tenantId,
        email: leadData.email || `unknown-${Date.now()}@portal.lead`,
        firstName: leadData.firstName || undefined,
        lastName: leadData.lastName || undefined,
        phone: leadData.phone || undefined,
        source: 'PORTAL',
        sourceDetails: parseResult.portal,
        status: leadStatus,
        notes: leadNotes || undefined,
      }
    });

    console.log(`✅ Lead created: ${lead.id}`);

    // 6. Try to match property
    let matchedProperty = null;
    let assignedUserIds: string[] = [];

    if (parseResult.propertyRef) {
      console.log(`🔍 Matching property: ${parseResult.propertyRef.type} = ${parseResult.propertyRef.value}`);
      const matchResult = await matchProperty(tenantId, parseResult.propertyRef);
      
      if (matchResult.property) {
        matchedProperty = matchResult.property;
        console.log(`✅ Property matched: ${matchedProperty.title} (${matchResult.matchType}, ${matchResult.confidence}%)`);

        // Get assigned users for this property
        const assignments = await db.propertyAssignment.findMany({
          where: { propertyId: matchedProperty.id },
          select: { userId: true }
        });
        assignedUserIds = assignments.map(a => a.userId);
      }
    }

    // 7. Create activity
    const activityType = parseResult.hasClickLink ? 'LINK_CLICK_REQUIRED' : 'PORTAL_INQUIRY';
    const activityDescription = parseResult.hasClickLink
      ? `Neue Anfrage via ${parseResult.portal} - Link-Klick erforderlich`
      : `Neue Anfrage via ${parseResult.portal}`;

    const activity = await db.leadActivity.create({
      data: {
        leadId: lead.id,
        type: activityType,
        description: activityDescription,
        propertyId: matchedProperty?.id,
        metadata: {
          portal: parseResult.portal,
          hasClickLink: parseResult.hasClickLink,
          clickLinkUrl: parseResult.clickLinkUrl,
          propertyRef: parseResult.propertyRef ? JSON.parse(JSON.stringify(parseResult.propertyRef)) : null,
          originalEmail: { from, subject },
        } as any
      }
    });

    // 8. Determine who to notify
    let usersToNotify: string[] = [];

    if (assignedUserIds.length > 0) {
      // Notify assigned users of the property
      usersToNotify = assignedUserIds;
      console.log(`📢 Notifying ${usersToNotify.length} assigned user(s)`);
    } else {
      // No property match or no assigned users -> notify ALL users in tenant
      const allUsers = await db.user.findMany({
        where: { tenantId },
        select: { id: true }
      });
      usersToNotify = allUsers.map(u => u.id);
      console.log(`📢 No property match - notifying ALL ${usersToNotify.length} user(s)`);
    }

    // 9. Create notifications
    const notificationType = parseResult.hasClickLink ? 'JARVIS_QUESTION' : 'NEW_LEAD';
    const notificationTitle = parseResult.hasClickLink
      ? `Neue Portal-Anfrage - Link-Klick erforderlich`
      : `Neuer Lead: ${[leadData.firstName, leadData.lastName].filter(Boolean).join(' ') || leadData.email || 'Unbekannt'}`;
    const notificationMessage = matchedProperty
      ? `Anfrage für "${matchedProperty.title}" via ${parseResult.portal}`
      : `Anfrage via ${parseResult.portal} - kein Objekt zugeordnet`;

    for (const userId of usersToNotify) {
      await db.notification.create({
        data: {
          tenantId,
          userId,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          metadata: {
            leadId: lead.id,
            propertyId: matchedProperty?.id,
            activityId: activity.id,
          }
        }
      });
    }

    // 10. If no property matched, create JarvisQuery for assignment
    let jarvisAction = null;
    if (!matchedProperty && !parseResult.hasClickLink) {
      // Get properties for selection
      const propertyOptions = await getPropertiesForSelection(tenantId);
      const options = [
        ...propertyOptions.map(p => ({ id: p.id, label: `${p.label} (${p.address})` })),
        { id: 'none', label: 'Keinem Objekt zuordnen' }
      ];

      // Create JarvisQuery for the first user (or admin)
      const targetUser = usersToNotify[0];
      if (targetUser) {
        jarvisAction = await db.jarvisPendingAction.create({
          data: {
            tenantId,
            userId: targetUser,
            leadId: lead.id,
            type: 'ASSIGN_PROPERTY',
            question: `Neuer Lead "${[leadData.firstName, leadData.lastName].filter(Boolean).join(' ') || leadData.email}" via ${parseResult.portal}. Welchem Objekt soll ich die Anfrage zuordnen?`,
            options,
            allowCustom: false,
            context: {
              leadId: lead.id,
              portal: parseResult.portal,
              leadEmail: leadData.email,
            }
          }
        });

        // Link activity to JarvisAction
        await db.leadActivity.update({
          where: { id: activity.id },
          data: {
            type: 'JARVIS_QUERY',
            jarvisActionId: jarvisAction.id,
          }
        });

        console.log(`❓ JarvisQuery created for property assignment: ${jarvisAction.id}`);
      }
    }

    // 11. If hasClickLink, create JarvisQuery for link click
    if (parseResult.hasClickLink) {
      const targetUser = usersToNotify[0];
      if (targetUser) {
        jarvisAction = await db.jarvisPendingAction.create({
          data: {
            tenantId,
            userId: targetUser,
            leadId: lead.id,
            type: 'LINK_CLICK_REQUIRED',
            question: `Neue Anfrage via ${parseResult.portal}. Die Email enthält einen Link, der geklickt werden muss, um die Lead-Daten zu sehen.`,
            options: [
              { id: 'done', label: 'Link geklickt - Daten eingegeben' },
              { id: 'skip', label: 'Überspringen' }
            ],
            allowCustom: true,
            context: {
              leadId: lead.id,
              portal: parseResult.portal,
              clickLinkUrl: parseResult.clickLinkUrl,
              originalEmail: { from, subject },
            }
          }
        });

        // Link activity to JarvisAction
        await db.leadActivity.update({
          where: { id: activity.id },
          data: { jarvisActionId: jarvisAction.id }
        });

        console.log(`❓ JarvisQuery created for link click: ${jarvisAction.id}`);
      }
    }

    res.json({
      success: true,
      leadId: lead.id,
      propertyId: matchedProperty?.id,
      jarvisActionId: jarvisAction?.id,
      notifiedUsers: usersToNotify.length,
      parseResult: {
        portal: parseResult.portal,
        hasClickLink: parseResult.hasClickLink,
        propertyMatched: !!matchedProperty,
      }
    });

  } catch (error: any) {
    console.error('❌ Error in lead ingestion:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export const handler = serverless(app);

// Local dev support
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Orchestrator service running on port ${port}`);
    // Run cleanup on startup
    cleanupOldChats();
  });
}
