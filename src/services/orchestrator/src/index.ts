import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import { PrismaClient, Prisma, ActivityType } from '@prisma/client';
import { TemplateService, setPrismaClient as setTemplatePrisma } from './services/TemplateService';
import { OpenAIService } from './services/OpenAIService';
import { PdfService } from './services/PdfService';
import { encryptionService } from './services/EncryptionService';
import { ConversationMemory, setPrismaClient as setConversationPrisma } from './services/ConversationMemory';
import { CalendarService } from './services/CalendarService';
import { setPrismaClient as setAiToolsPrisma } from './services/AiTools';
import { authMiddleware } from './middleware/auth';
import { AiSafetyMiddleware, wrapAiResponse } from './middleware/aiSafety';
import * as AWS from 'aws-sdk';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Load .env.local first (for local dev), then .env as fallback
dotenv.config({ path: '.env.local' });
dotenv.config(); // This won't override existing values from .env.local

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
        // Set environment variables from secrets
        if (secrets.OPENAI_API_KEY) process.env.OPENAI_API_KEY = secrets.OPENAI_API_KEY;
        if (secrets.ENCRYPTION_KEY) process.env.ENCRYPTION_KEY = secrets.ENCRYPTION_KEY;
        if (secrets.GOOGLE_CALENDAR_CLIENT_ID) process.env.GOOGLE_CALENDAR_CLIENT_ID = secrets.GOOGLE_CALENDAR_CLIENT_ID;
        if (secrets.GOOGLE_CALENDAR_CLIENT_SECRET) process.env.GOOGLE_CALENDAR_CLIENT_SECRET = secrets.GOOGLE_CALENDAR_CLIENT_SECRET;
        if (secrets.MICROSOFT_CLIENT_ID) process.env.MICROSOFT_CLIENT_ID = secrets.MICROSOFT_CLIENT_ID;
        if (secrets.MICROSOFT_CLIENT_SECRET) process.env.MICROSOFT_CLIENT_SECRET = secrets.MICROSOFT_CLIENT_SECRET;
        console.log('✅ App secrets loaded from Secrets Manager');
      }
    } catch (error) {
      console.error('Failed to load app secrets from Secrets Manager:', error);
      // Don't throw - some features may still work without all secrets
    }
  }
  
  appSecretsLoaded = true;
}

// Function to initialize Prisma with DATABASE_URL from AWS Secrets Manager
async function initializePrisma() {
  if (prisma) return prisma;
  
  // Load app secrets first
  await loadAppSecrets();
  
  // If DATABASE_URL is already set (local dev), use it
  if (process.env.DATABASE_URL) {
    prisma = new PrismaClient();
    // Inject prisma into services
    setTemplatePrisma(prisma);
    setConversationPrisma(prisma);
    setAiToolsPrisma(prisma);
    return prisma;
  }
  
  // In Lambda, get credentials from Secrets Manager
  if (process.env.DB_SECRET_ARN) {
    const secretsManager = new AWS.SecretsManager();
    try {
      const secret = await secretsManager.getSecretValue({ SecretId: process.env.DB_SECRET_ARN }).promise();
      if (secret.SecretString) {
        const credentials = JSON.parse(secret.SecretString);
        const dbUrl = `postgresql://${credentials.username}:${credentials.password}@${credentials.host}:${credentials.port}/postgres?schema=public`;
        process.env.DATABASE_URL = dbUrl;
        prisma = new PrismaClient();
        // Inject prisma into services
        setTemplatePrisma(prisma);
        setConversationPrisma(prisma);
        setAiToolsPrisma(prisma);
      }
    } catch (error) {
      console.error('Failed to get DB credentials from Secrets Manager:', error);
      throw error;
    }
  }
  
  if (!prisma) {
    prisma = new PrismaClient();
    // Inject prisma into services
    setTemplatePrisma(prisma);
    setConversationPrisma(prisma);
    setAiToolsPrisma(prisma);
  }
  
  return prisma;
}

// Initialize Prisma on startup for local dev
if (!process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.DATABASE_URL) {
  prisma = new PrismaClient();
  // Inject prisma into services
  setTemplatePrisma(prisma);
  setConversationPrisma(prisma);
  setAiToolsPrisma(prisma);
}

const cognito = new AWS.CognitoIdentityServiceProvider();

// Middleware to ensure Prisma is initialized before handling requests
app.use(async (req, res, next) => {
  try {
    await initializePrisma();
    next();
  } catch (error) {
    console.error('Failed to initialize Prisma:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Multer setup for file uploads
// In Lambda, use /tmp (the only writable directory)
// Locally, use ./uploads relative to project
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const uploadDir = isLambda ? '/tmp/uploads' : path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder erlaubt'));
    }
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// --- Auth & User Management ---

// Sync User from Token (Create/Update in DB)
app.post('/auth/sync', authMiddleware, async (req, res) => {
  try {
    const { sub, email, given_name, family_name, address, phone_number } = req.user!;
    const companyName = req.user!['custom:company_name'];
    const postalCode = req.user!['custom:postal_code'];
    const city = req.user!['custom:city'];
    const country = req.user!['custom:country'];
    
    // Handle address - Cognito may return it as object { formatted: "..." } or string
    let streetAddress: string | undefined;
    if (address) {
      if (typeof address === 'object' && address.formatted) {
        streetAddress = address.formatted;
      } else if (typeof address === 'string') {
        streetAddress = address;
      }
    }

    // 1. Find or Create Tenant
    // Strategy: If user has a tenantId in DB, use it. If not, create new Tenant (assuming first user is Admin/Owner)
    // For simplicity in this MVP: We create a tenant based on company name if it doesn't exist for this user.
    // Better: Check if user already exists.

    let user = await prisma.user.findUnique({ where: { email } });
    let tenantId = user?.tenantId;

    if (!user) {
      // New User
      // Check if we should create a new tenant or if this is an invite?
      // For self-signup, we create a new tenant.
      
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
    } else {
      // Update existing user with new data from Cognito (only if values are provided)
      user = await prisma.user.update({
        where: { email },
        data: {
          firstName: given_name || user.firstName,
          lastName: family_name || user.lastName,
          phone: phone_number || user.phone,
          street: streetAddress || user.street,
          postalCode: postalCode || user.postalCode,
          city: city || user.city,
          country: country || user.country,
          // Don't update tenantId or role here
        }
      });
    }

    res.json({ user, tenantId });
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

// Get Seats (Team Members)
app.get('/seats', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    const seats = await prisma.user.findMany({
      where: { tenantId: currentUser.tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
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
    
    if (!currentUser || currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Admins can invite users' });
    }

    // 1. Create User in Cognito
    const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
    await cognito.adminCreateUser({
      UserPoolId: process.env.USER_POOL_ID!,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:company_name', Value: currentUser.tenantId } // Store TenantID in company name for now or use a custom attribute 'tenant_id'
        // Ideally we use a custom attribute 'custom:tenant_id' in Cognito
      ],
      TemporaryPassword: tempPassword,
      MessageAction: 'SUPPRESS', // We send our own email? Or let Cognito send it? Let's use Cognito default for now.
      // Actually, if we use SUPPRESS, we must send the email. If we remove it, Cognito sends it.
      // Let's remove MessageAction to let Cognito send the invite.
    }).promise();
    
    // Note: adminCreateUser sends an email with temp password by default if MessageAction is not SUPPRESS.

    // 2. Create User in DB (Pending state?)
    // Actually, we can pre-create the user in DB so they are linked to the tenant.
    // But their 'sub' will be different until they login? No, adminCreateUser returns the sub.
    // Let's wait for them to login and hit /auth/sync? 
    // Better: Create them now so they appear in the list.
    
    // We don't have the 'sub' yet easily available without parsing the response.
    // Let's just return success and let /auth/sync handle the DB creation on first login.
    // BUT: /auth/sync needs to know which tenant to put them in!
    // The invite flow is tricky without a 'custom:tenant_id' attribute in Cognito.
    
    // Workaround: We create a "PendingInvite" record in DB? 
    // Or we just rely on the fact that we can't easily map them yet.
    
    // Simplest solution for MVP: 
    // When the invited user logs in, /auth/sync is called.
    // We need to know their tenant.
    // We can store the invite in a separate table 'UserInvite' { email, tenantId, role }.
    // In /auth/sync, we check if there is an invite for this email. If yes, use that tenantId.
    
    // Since I don't want to change Prisma schema again right now:
    // I will assume the user enters the company name correctly? No.
    
    // Okay, I will create the user in DB now. I need the 'sub' from Cognito response.
    // const cognitoUser = await cognito.adminCreateUser(...).promise();
    // const sub = cognitoUser.User.Username;
    
    // Let's do that.
    
    const params = {
      UserPoolId: process.env.USER_POOL_ID!,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
      DesiredDeliveryMediums: ['EMAIL'],
      TemporaryPassword: tempPassword,
    };
    
    // @ts-ignore
    const cognitoResponse = await cognito.adminCreateUser(params).promise();
    const sub = cognitoResponse.User?.Username;

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
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'orchestrator', runtime: 'lambda' });
});

// --- Lead Intake ---

// GET /leads - List all leads
app.get('/leads', async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        property: true, // Include property details if needed
      }
    });
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /leads/:id - Get lead details with messages
app.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
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

// GET /properties - List all properties
app.get('/properties', async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /properties/:id - Get property details
app.get('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const property = await prisma.property.findUnique({
      where: { id }
    });
    
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /leads/:id - Update lead details
app.put('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Get old lead data for comparison
    const oldLead = await prisma.lead.findUnique({ where: { id } });
    if (!oldLead) return res.status(404).json({ error: 'Lead not found' });
    
    // Update lead
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData
    });
    
    // Track activities
    const activities: Array<{
      leadId: string;
      type: ActivityType;
      description: string;
      metadata?: any;
    }> = [];
    
    // Status changed
    if (updateData.status && updateData.status !== oldLead.status) {
      activities.push({
        leadId: id,
        type: ActivityType.STATUS_CHANGED,
        description: `Status geändert: ${oldLead.status} → ${updateData.status}`,
        metadata: { old: oldLead.status, new: updateData.status }
      });
    }
    
    // Budget changed
    if (updateData.budgetMin !== undefined || updateData.budgetMax !== undefined) {
      if (updateData.budgetMin !== oldLead.budgetMin || updateData.budgetMax !== oldLead.budgetMax) {
        activities.push({
          leadId: id,
          type: ActivityType.FIELD_UPDATED,
          description: `Budget aktualisiert: ${updateData.budgetMin || 0}€ - ${updateData.budgetMax || 0}€`,
          metadata: { field: 'budget' }
        });
      }
    }
    
    // Notes added/changed
    if (updateData.notes && updateData.notes !== oldLead.notes) {
      activities.push({
        leadId: id,
        type: ActivityType.NOTE_ADDED,
        description: 'Notiz hinzugefügt',
        metadata: { field: 'notes' }
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

// GET /leads/:id/activities - Get lead activities
app.get('/leads/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    
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

// PUT /properties/:id - Update property details
app.put('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
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

// POST /properties/:id/images - Upload images
app.post('/properties/:id/images', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
    }

    // Generate URLs (for local dev, use relative paths)
    const imageUrls = files.map(f => `/uploads/${f.filename}`);
    
    // Get current property
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return res.status(404).json({ error: 'Property nicht gefunden' });
    }

    // Add new images to existing ones
    const updatedImages = [...property.images, ...imageUrls];
    
    await prisma.property.update({
      where: { id },
      data: { images: updatedImages }
    });

    res.json({ success: true, images: imageUrls });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Upload fehlgeschlagen' });
  }
});

// DELETE /properties/:id/images - Remove image
app.delete('/properties/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, isFloorplan } = req.body;

    const property = await prisma.property.findUnique({ where: { id } });
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

    // Delete file from disk (if local)
    if (imageUrl.startsWith('/uploads/')) {
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

// POST /leads/:id/email - Send manual email
app.post('/leads/:id/email', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body } = req.body;
    
    const lead = await prisma.lead.findUnique({ where: { id } });
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

// DELETE /leads/:id - Delete a lead
app.delete('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Delete related messages first (cascade delete would be better in schema)
    await prisma.message.deleteMany({ where: { leadId: id } });
    await prisma.lead.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /properties/:id - Delete a property
app.delete('/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
    const { email, firstName, lastName, propertyId, message, salutation, formalAddress, phone, source, notes } = req.body;
    
    // Get tenantId from authenticated user
    const userEmail = req.user!.email;
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tenantId = user.tenantId;
    
    // 1. Save Lead
    const lead = await prisma.lead.create({
      data: {
        email,
        firstName,
        lastName,
        salutation: salutation || 'NONE',
        formalAddress: formalAddress !== undefined ? formalAddress : true, // Default: "Sie"
        phone,
        source: source || 'WEBSITE',
        notes,
        tenantId,
        propertyId,
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

    // 2. Fetch Context
    let property = null;
    let template = null;

    if (propertyId) {
      property = await prisma.property.findUnique({ where: { id: propertyId } });
      template = await TemplateService.getTemplateForProperty(tenantId, propertyId);
    } else {
      // Fallback: Try to find a default template for the tenant
      // For now, just skip AI draft if no property is selected
      console.log('No propertyId provided, skipping AI draft generation');
    }

    if (template && property) {
      // 3. Render Email
      const context = { lead, property, user: { name: 'Ihr Makler Team' } }; // Mock user for now
      const emailBody = TemplateService.render(template.body, context);
      const emailSubject = TemplateService.render(template.subject, context);

      // 4. Create Draft Message (AI Response)
      await prisma.message.create({
        data: {
          leadId: lead.id,
          role: 'ASSISTANT',
          content: emailBody,
          status: 'DRAFT'
        }
      });
      
      console.log('Draft message created for lead:', lead.id);
    }

    res.status(201).json({ id: lead.id, message: 'Lead processed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /messages/:id/send - Approve and send a draft message
app.post('/messages/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.status !== 'DRAFT') return res.status(400).json({ error: 'Message is not a draft' });
    
    // Fetch Lead to get email
    const lead = await prisma.lead.findUnique({ where: { id: message.leadId } });
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
app.post('/templates/render', (req, res) => {
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
    const { name, blocks, theme, isDefault } = req.body;

    const template = await prisma.exposeTemplate.update({
      where: { id },
      data: { name, blocks, theme, isDefault }
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
    const expose = await prisma.expose.findUnique({
      where: { id },
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
    const { blocks, theme, status } = req.body;

    const expose = await prisma.expose.update({
      where: { id },
      data: { blocks, theme, status }
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
app.get('/chat/history', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const history = await prisma.userChat.findMany({
      where: { 
        userId: String(userId),
        archived: false // Nur aktiven Chat laden
      },
      orderBy: { createdAt: 'asc' }
    });

    // Map to frontend format (role as string, not enum)
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log(`📜 Chat-Historie geladen für User ${userId}: ${formattedHistory.length} Nachrichten`);
    res.json(formattedHistory);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Neuen Chat starten (archiviert alten Chat)
app.post('/chat/new', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Archiviere alle aktuellen Chats
    await prisma.userChat.updateMany({
      where: { 
        userId: String(userId),
        archived: false
      },
      data: { archived: true }
    });

    console.log(`🆕 Neuer Chat gestartet für User ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error starting new chat:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/chat',
  AiSafetyMiddleware.rateLimit(50, 60000), // 50 requests per minute
  AiSafetyMiddleware.contentModeration,
  AiSafetyMiddleware.tenantIsolation,
  AiSafetyMiddleware.auditLog,
  async (req, res) => {
    try {
      const { message, history, tenantId, userId } = req.body;
      
      // Ensure user exists (create if not - for local dev)
      if (userId) {
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          let tenant = await prisma.tenant.findFirst();
          if (!tenant) {
            tenant = await prisma.tenant.create({
              data: { id: 'default-tenant', name: 'Development Tenant' }
            });
          }
          user = await prisma.user.create({
            data: { 
              id: userId, 
              email: `${userId}@local.dev`,
              tenantId: tenant.id,
              firstName: 'Local',
              lastName: 'User'
            }
          });
          console.log(`📝 Default User erstellt: ${userId}`);
        }

        await prisma.userChat.create({
          data: { userId, role: 'USER', content: message }
        });
      }

      const gemini = new OpenAIService();
      const responseText = await gemini.chat(message, tenantId, history);
      
      // Sanitize response before sending
      const sanitizedResponse = wrapAiResponse(responseText);

      // Save Assistant Message
      if (userId) {
        await prisma.userChat.create({
          data: { userId, role: 'ASSISTANT', content: sanitizedResponse }
        });
        console.log(`💾 Chat gespeichert für User ${userId}`);
      }

      res.json({ response: sanitizedResponse });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'AI Error' });
    }
  }
);

// Streaming Chat Endpoint with Optimized Memory
app.post('/chat/stream',
  AiSafetyMiddleware.rateLimit(50, 60000),
  AiSafetyMiddleware.contentModeration,
  AiSafetyMiddleware.tenantIsolation,
  AiSafetyMiddleware.auditLog,
  async (req, res) => {
    try {
      const { message, tenantId, userId } = req.body;
      
      // Set headers for SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Get optimized history (recent messages + summary)
      const { recentMessages, summary } = await ConversationMemory.getOptimizedHistory(userId);
      const optimizedHistory = ConversationMemory.formatForGemini(recentMessages, summary);

      const gemini = new OpenAIService();
      let fullResponse = '';
      let hadFunctionCalls = false;

      // Stream the response with optimized history
      for await (const result of gemini.chatStream(message, tenantId, optimizedHistory)) {
        fullResponse += result.chunk;
        if (result.hadFunctionCalls) hadFunctionCalls = true;
        // Send chunk as SSE
        res.write(`data: ${JSON.stringify({ chunk: result.chunk })}\n\n`);
      }

      // Send done signal with function call info
      res.write(`data: ${JSON.stringify({ done: true, hadFunctionCalls })}\n\n`);
      res.end();

      // Save messages to DB after streaming is complete
      if (userId) {
        // Ensure user exists (create if not - for local dev)
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          // Create default user for local development
          let tenant = await prisma.tenant.findFirst();
          if (!tenant) {
            tenant = await prisma.tenant.create({
              data: { id: 'default-tenant', name: 'Development Tenant' }
            });
          }
          user = await prisma.user.create({
            data: { 
              id: userId, 
              email: `${userId}@local.dev`,
              tenantId: tenant.id,
              firstName: 'Local',
              lastName: 'User'
            }
          });
          console.log(`📝 Default User erstellt: ${userId}`);
        }

        await prisma.userChat.create({
          data: { userId, role: 'USER', content: message }
        });
        await prisma.userChat.create({
          data: { userId, role: 'ASSISTANT', content: wrapAiResponse(fullResponse) }
        });
        console.log(`💾 Chat gespeichert für User ${userId}`);
        
        // Cleanup old summaries (async, don't await)
        ConversationMemory.cleanupOldSummaries(userId).catch(console.error);
      }
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
      const { message, history } = req.body;
      
      const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      // Verify expose belongs to tenant (Tenant Isolation)
      const expose = await prisma.expose.findFirst({
        where: { id: exposeId, property: { tenantId: currentUser.tenantId } },
        include: { property: true }
      });
      if (!expose) return res.status(404).json({ error: 'Exposé not found' });

      const gemini = new OpenAIService();
      const result = await gemini.exposeChat(message, currentUser.tenantId, exposeId, null, expose.blocks as any[], history || []);
      
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
      const { message, history } = req.body;
      
      const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      // Verify template belongs to tenant (Tenant Isolation)
      const template = await prisma.exposeTemplate.findFirst({
        where: { id: templateId, tenantId: currentUser.tenantId }
      });
      if (!template) return res.status(404).json({ error: 'Template not found' });

      const gemini = new OpenAIService();
      const result = await gemini.exposeChat(message, currentUser.tenantId, null, templateId, template.blocks as any[], history || []);
      
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

    const gemini = new OpenAIService();
    const result = await gemini.generatePropertyText(propertyId, textType || 'description', currentUser.tenantId, {
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

// Create Channel
app.post('/channels', authMiddleware, async (req, res) => {
  try {
    const { name, type, members } = req.body; // members = array of userIds
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Only Admins can create public channels
    if (type === 'PUBLIC' && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only Admins can create public channels' });
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        type,
        tenantId: currentUser.tenantId,
        members: {
          create: [
            { userId: currentUser.id }, // Creator is always a member
            ...(members || []).map((userId: string) => ({ userId }))
          ]
        }
      }
    });

    res.json(channel);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Channels for User
app.get('/channels', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch public channels + private channels where user is member
    const channels = await prisma.channel.findMany({
      where: {
        tenantId: currentUser.tenantId,
        OR: [
          { type: 'PUBLIC' },
          { members: { some: { userId: currentUser.id } } }
        ]
      },
      include: {
        _count: {
          select: { members: true }
        }
      }
    });

    res.json(channels);
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Messages for Channel
app.get('/channels/:channelId/messages', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Check access
    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId: currentUser.id }
      }
    });

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });

    if (channel?.type !== 'PUBLIC' && !membership) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    const messages = await prisma.channelMessage.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Send Message
app.post('/channels/:channelId/messages', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Check access (same logic as above)
    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId: currentUser.id }
      }
    });
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });

    if (channel?.type !== 'PUBLIC' && !membership) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    const message = await prisma.channelMessage.create({
      data: {
        channelId,
        userId: currentUser.id,
        content
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    res.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Export for Lambda
// Auto-delete archived chats older than 7 days (runs every 24 hours)
async function cleanupOldChats() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await prisma.userChat.deleteMany({
      where: {
        archived: true,
        createdAt: { lt: sevenDaysAgo }
      }
    });

    console.log(`🗑️ Gelöscht: ${result.count} archivierte Chats (älter als 7 Tage)`);
  } catch (error) {
    console.error('Error cleaning up old chats:', error);
  }
}

// Run cleanup every 24 hours
setInterval(cleanupOldChats, 24 * 60 * 60 * 1000);

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
app.get('/portals', async (req, res) => {
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
app.post('/properties/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const { portalIds, userId, tenantId } = req.body;
    
    if (!portalIds || !Array.isArray(portalIds)) {
      return res.status(400).json({ error: 'portalIds array required' });
    }
    
    const property = await prisma.property.findUnique({
      where: { id }
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
app.get('/calendar/google/auth-url', authMiddleware, async (req, res) => {
  try {
    const authUrl = CalendarService.getGoogleAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Google Calendar: OAuth Callback
app.get('/calendar/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    // Exchange code for tokens
    const tokens = await CalendarService.exchangeGoogleCode(code as string);

    // Store tokens in session or redirect with token
    // For now, redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=google&success=true&email=${encodeURIComponent(tokens.email)}`);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=google&error=true`);
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

    // Update tenant settings
    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        googleCalendarConfig: encryptedConfig as any
      },
      update: {
        googleCalendarConfig: encryptedConfig as any
      }
    });

    res.json({ success: true, email: tokens.email });
  } catch (error) {
    console.error('Error connecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to connect Google Calendar' });
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
app.get('/calendar/outlook/auth-url', authMiddleware, async (req, res) => {
  try {
    const authUrl = await CalendarService.getOutlookAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Outlook auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Outlook Calendar: OAuth Callback
app.get('/calendar/outlook/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    // Exchange code for tokens
    const tokens = await CalendarService.exchangeOutlookCode(code as string);

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=outlook&success=true&email=${encodeURIComponent(tokens.email)}`);
  } catch (error) {
    console.error('Error in Outlook OAuth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard/settings/integrations?provider=outlook&error=true`);
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

    // Update tenant settings
    await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        outlookCalendarConfig: encryptedConfig as any
      },
      update: {
        outlookCalendarConfig: encryptedConfig as any
      }
    });

    res.json({ success: true, email: tokens.email });
  } catch (error) {
    console.error('Error connecting Outlook Calendar:', error);
    res.status(500).json({ error: 'Failed to connect Outlook Calendar' });
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

// --- Email Integration (Gmail & Outlook) ---

import { EmailService } from './services/EmailService';

// Gmail: Get Auth URL
app.get('/email/gmail/auth-url', authMiddleware, async (req, res) => {
  try {
    const authUrl = EmailService.getGmailAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error getting Gmail auth URL:', error);
    res.status(500).json({ error: 'Failed to get auth URL' });
  }
});

// Gmail: OAuth Callback
app.get('/email/gmail/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect('/dashboard/settings/integrations?provider=gmail&error=true');
    }

    const tokens = await EmailService.exchangeGmailCode(code as string);
    
    // Redirect with tokens in URL (frontend will save them)
    const params = new URLSearchParams({
      provider: 'gmail',
      success: 'true',
      email: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiryDate: tokens.expiryDate.toString()
    });
    
    res.redirect(`/dashboard/settings/integrations?${params.toString()}`);
  } catch (error) {
    console.error('Error in Gmail OAuth callback:', error);
    res.redirect('/dashboard/settings/integrations?provider=gmail&error=true');
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
app.get('/email/outlook/auth-url', authMiddleware, async (req, res) => {
  try {
    const authUrl = await EmailService.getOutlookMailAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error getting Outlook Mail auth URL:', error);
    res.status(500).json({ error: 'Failed to get auth URL' });
  }
});

// Outlook Mail: OAuth Callback
app.get('/email/outlook/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect('/dashboard/settings/integrations?provider=outlook-mail&error=true');
    }

    const tokens = await EmailService.exchangeOutlookMailCode(code as string);
    
    // Redirect with tokens in URL (frontend will save them)
    const params = new URLSearchParams({
      provider: 'outlook-mail',
      success: 'true',
      email: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiryDate: tokens.expiryDate.toString()
    });
    
    res.redirect(`/dashboard/settings/integrations?${params.toString()}`);
  } catch (error) {
    console.error('Error in Outlook Mail OAuth callback:', error);
    res.redirect('/dashboard/settings/integrations?provider=outlook-mail&error=true');
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

// POST /ai/image-edit - Edit image with Gemini 3 Pro Image
app.post('/ai/image-edit', authMiddleware, async (req, res) => {
  try {
    const { image, prompt, style, roomType } = req.body;
    
    if (!image || !prompt) {
      return res.status(400).json({ error: 'image and prompt required' });
    }

    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Extract base64 data from data URL if needed
    let imageData = image;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageData = matches[2];
      }
    }

    // Call Gemini 3 Pro Image API
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // Use gemini-3-pro-image-preview model for image editing
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        // @ts-ignore - responseModalities is valid for image models
        responseModalities: ['TEXT', 'IMAGE']
      }
    });

    // Create the prompt for virtual staging
    const stagingPrompt = `You are an expert interior designer and virtual staging specialist. 
Edit this image to add furniture and decor in a ${style} style for a ${roomType}.

Instructions:
${prompt}

Important guidelines:
- Keep the room structure, walls, floors, windows, and doors exactly as they are
- Add realistic furniture that fits the space proportionally
- Use appropriate lighting and shadows for photorealism
- Make the result look like a professional real estate photo
- The furniture should match the ${style} aesthetic perfectly
- Ensure the final image looks natural and inviting`;

    const result = await model.generateContent([
      stagingPrompt,
      {
        inlineData: {
          mimeType,
          data: imageData
        }
      }
    ]);

    const response = result.response;
    
    // Extract the generated image from the response
    let generatedImage = null;
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImage) {
      return res.status(500).json({ error: 'No image generated' });
    }

    // Log usage for billing (future)
    console.log(`🎨 Image edited for user ${currentUser.email}, style: ${style}, room: ${roomType}`);

    res.json({ 
      image: generatedImage,
      style,
      roomType
    });
  } catch (error) {
    console.error('Error editing image:', error);
    res.status(500).json({ error: 'Image editing failed' });
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

// --- Admin: Run Migrations ---
app.post('/admin/migrate', async (req, res) => {
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

// Full database setup - run init migration
app.post('/admin/setup-db', async (req, res) => {
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
