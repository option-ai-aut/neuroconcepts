import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import { PrismaClient } from '@prisma/client';
import { TemplateService } from './services/TemplateService';
import { GeminiService } from './services/GeminiService';
import { authMiddleware } from './middleware/auth';
import * as AWS from 'aws-sdk';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// --- Auth & User Management ---

// Sync User from Token (Create/Update in DB)
app.post('/auth/sync', authMiddleware, async (req, res) => {
  try {
    const { sub, email, given_name, family_name } = req.user!;
    const companyName = req.user!['custom:company_name'];
    // const employeeCount = req.user!['custom:employee_count']; // Not stored in DB yet, maybe later

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
          // address: ... (from token if available)
        }
      });
      tenantId = newTenant.id;

      user = await prisma.user.create({
        data: {
          id: sub, // Use Cognito Sub as ID
          email,
          firstName: given_name,
          lastName: family_name,
          tenantId: newTenant.id,
          role: 'ADMIN' // First user is Admin
        }
      });
      
      // Create default settings
      await prisma.tenantSettings.create({
        data: { tenantId: newTenant.id }
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { email },
        data: {
          firstName: given_name,
          lastName: family_name,
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
    const { firstName, lastName, email, phone, status, notes } = req.body;
    
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        status,
        notes
      }
    });
    
    res.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
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
app.post('/properties', async (req, res) => {
  try {
    const { title, address, price, rooms, area, description, aiFacts, tenantId } = req.body;
    
    const property = await prisma.property.create({
      data: {
        tenantId,
        title,
        address,
        price,
        rooms,
        area,
        description,
        aiFacts
      }
    });

    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/leads', async (req, res) => {
  try {
    const { email, firstName, lastName, propertyId, tenantId, message } = req.body;
    
    // 1. Save Lead
    const lead = await prisma.lead.create({
      data: {
        email,
        firstName,
        lastName,
        tenantId,
        propertyId,
        messages: {
          create: {
            role: 'USER',
            content: message || 'Interesse an Objekt'
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

    res.status(201).json({ message: 'Lead processed', leadId: lead.id });
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

// --- AI Assistant ---
app.get('/chat/history', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const history = await prisma.userChat.findMany({
      where: { userId: String(userId) },
      orderBy: { createdAt: 'asc' }
    });
    res.json(history);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { message, history, tenantId, userId } = req.body;
    
    // Save User Message
    if (userId) {
      await prisma.userChat.create({
        data: { userId, role: 'USER', content: message }
      });
    }

    const gemini = new GeminiService();
    const responseText = await gemini.chat(message, tenantId, history);

    // Save Assistant Message
    if (userId) {
      await prisma.userChat.create({
        data: { userId, role: 'ASSISTANT', content: responseText }
      });
    }

    res.json({ response: responseText });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'AI Error' });
  }
});

// Export for Lambda
export const handler = serverless(app);

// Local dev support
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Orchestrator service running on port ${port}`);
  });
}
