import { PrismaClient } from '@prisma/client';
import { SchemaType, FunctionDeclarationSchema } from '@google/generative-ai';

const prisma = new PrismaClient();

export const CRM_TOOLS = {
  create_lead: {
    name: "create_lead",
    description: "Creates a new lead in the CRM.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        firstName: { type: SchemaType.STRING, description: "First name of the lead" } as FunctionDeclarationSchema,
        lastName: { type: SchemaType.STRING, description: "Last name of the lead" } as FunctionDeclarationSchema,
        email: { type: SchemaType.STRING, description: "Email address" } as FunctionDeclarationSchema,
        phone: { type: SchemaType.STRING, description: "Phone number" } as FunctionDeclarationSchema,
        message: { type: SchemaType.STRING, description: "Initial message or note" } as FunctionDeclarationSchema,
      },
      required: ["email"]
    }
  },
  search_properties: {
    name: "search_properties",
    description: "Searches for properties in the database.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Search term (e.g., 'Berlin', '3 Zimmer')" } as FunctionDeclarationSchema,
        minPrice: { type: SchemaType.NUMBER, description: "Minimum price" } as FunctionDeclarationSchema,
        maxPrice: { type: SchemaType.NUMBER, description: "Maximum price" } as FunctionDeclarationSchema
      }
    }
  },
  get_calendar_availability: {
    name: "get_calendar_availability",
    description: "Checks calendar availability for a given date range.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start: { type: SchemaType.STRING, description: "Start date (ISO string)" } as FunctionDeclarationSchema,
        end: { type: SchemaType.STRING, description: "End date (ISO string)" } as FunctionDeclarationSchema
      },
      required: ["start", "end"]
    }
  }
};

export class AiToolExecutor {
  static async execute(toolName: string, args: any, tenantId: string) {
    console.log(`Executing tool ${toolName} for tenant ${tenantId} with args:`, args);

    switch (toolName) {
      case 'create_lead':
        // SECURITY: Explicitly destructure args to prevent prototype pollution or overwriting protected fields
        const { firstName, lastName, email, phone, message } = args;
        
        return await prisma.lead.create({
          data: {
            firstName,
            lastName,
            email,
            phone,
            tenantId, // Hard-coded from authenticated session
            messages: message ? {
              create: { role: 'USER', content: message }
            } : undefined
          }
        });

      case 'search_properties':
        const { query, minPrice, maxPrice } = args;
        
        return await prisma.property.findMany({
          where: {
            tenantId, // Hard constraint
            OR: [
              { title: { contains: query || '', mode: 'insensitive' } },
              { address: { contains: query || '', mode: 'insensitive' } }
            ],
            price: {
              gte: minPrice,
              lte: maxPrice
            }
          }
        });

      case 'get_calendar_availability':
        // Mock implementation for now
        return [
          { start: args.start, end: args.end, status: 'available' }
        ];

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
