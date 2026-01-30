import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import { PrismaClient } from '@prisma/client';
import { TemplateService } from './services/TemplateService';
import { GeminiService } from './services/GeminiService';
import { PdfService } from './services/PdfService';
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

// Exposé-specific Chat with Jarvis (full tool access)
app.post('/exposes/:id/chat', authMiddleware, async (req, res) => {
  try {
    const { id: exposeId } = req.params;
    const { message, history } = req.body;
    
    const currentUser = await prisma.user.findUnique({ where: { email: req.user!.email } });
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Verify expose belongs to tenant
    const expose = await prisma.expose.findFirst({
      where: { id: exposeId, property: { tenantId: currentUser.tenantId } },
      include: { property: true }
    });
    if (!expose) return res.status(404).json({ error: 'Exposé not found' });

    const gemini = new GeminiService();
    const result = await gemini.exposeChat(message, currentUser.tenantId, exposeId, history || []);

    res.json({ 
      response: result.text, 
      actionsPerformed: result.actionsPerformed 
    });
  } catch (error) {
    console.error('Exposé chat error:', error);
    res.status(500).json({ error: 'AI Error' });
  }
});

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

    const gemini = new GeminiService();
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
export const handler = serverless(app);

// Local dev support
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Orchestrator service running on port ${port}`);
  });
}
