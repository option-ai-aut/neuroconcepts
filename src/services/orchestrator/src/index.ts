import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import { PrismaClient } from '@prisma/client';
import { TemplateService } from './services/TemplateService';
import { GeminiService } from './services/GeminiService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

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
