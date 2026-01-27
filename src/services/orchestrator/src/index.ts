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
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    const template = await TemplateService.getTemplateForProperty(tenantId, propertyId);

    if (template && property) {
      // 3. Render Email
      const context = { lead, property, user: { name: 'Ihr Makler Team' } }; // Mock user for now
      const emailBody = TemplateService.render(template.body, context);
      const emailSubject = TemplateService.render(template.subject, context);

      // 4. Send Email (Mock for now, will connect to SMTP later)
      console.log('--- SENDING EMAIL ---');
      console.log('To:', email);
      console.log('Subject:', emailSubject);
      console.log('Body:', emailBody);
      
      // 5. Log AI Response
      await prisma.message.create({
        data: {
          leadId: lead.id,
          role: 'ASSISTANT',
          content: emailBody
        }
      });
    }

    res.status(201).json({ message: 'Lead processed', leadId: lead.id });
  } catch (error) {
    console.error(error);
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
