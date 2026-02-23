import { PrismaClient } from '@prisma/client';

// Local schema type definitions (replaces @google/generative-ai dependency)
enum SchemaType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
}
type FunctionDeclarationSchema = {
  type: SchemaType;
  description?: string;
  items?: FunctionDeclarationSchema;
  properties?: Record<string, FunctionDeclarationSchema>;
  required?: string[];
  enum?: string[];
};
import { randomUUID } from 'crypto';
import { ConversationMemory } from './ConversationMemory';
import { EmbeddingService } from './EmbeddingService';
import { CalendarService } from './CalendarService';
import { encryptionService } from './EncryptionService';
import { google } from 'googleapis';

// Helper function to get Google Email config at runtime
const getGoogleEmailConfig = () => ({
  clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_EMAIL_REDIRECT_URI || 'http://localhost:3001/email/gmail/callback'
});

// Prisma client will be injected from index.ts
let prisma: PrismaClient;

export function setPrismaClient(client: PrismaClient) {
  prisma = client;
  console.log('✅ AiTools: Prisma client injected');
}

function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Prisma client not initialized in AiTools. Call setPrismaClient first.');
  }
  return prisma;
}

// replacePlaceholders is injected from index.ts to avoid circular imports
let _replacePlaceholders: ((blocks: any[], property: any, user: any, lead?: any) => any[]) | null = null;

export function setReplacePlaceholders(fn: (blocks: any[], property: any, user: any, lead?: any) => any[]) {
  _replacePlaceholders = fn;
}

function replacePlaceholders(blocks: any[], property: any, user: any, lead?: any): any[] {
  if (_replacePlaceholders) return _replacePlaceholders(blocks, property, user, lead);
  // Minimal fallback if not injected: return blocks as-is
  return blocks;
}

export const CRM_TOOLS = {
  // === SEMANTIC SEARCH (RAG) ===
  semantic_search: {
    name: "semantic_search",
    description: "Semantische Suche über Immobilien und Leads. Findet passende Einträge basierend auf Bedeutung, nicht nur exakten Texttreffer. Nutze dies wenn der User nach Immobilien mit bestimmten Eigenschaften sucht, passende Leads finden will, oder allgemein nach Daten sucht die zum Kontext passen.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Suchanfrage in natürlicher Sprache, z.B. 'große Wohnung in Wien mit Balkon unter 500000' oder 'Lead der sich für Einfamilienhäuser interessiert'" } as FunctionDeclarationSchema,
        entityType: { type: SchemaType.STRING, description: "Typ der Suche: 'property' für Immobilien, 'lead' für Leads, 'all' für beides. Default: 'all'", enum: ['property', 'lead', 'all'] } as FunctionDeclarationSchema,
        limit: { type: SchemaType.NUMBER, description: "Maximale Anzahl Ergebnisse (1-20). Default: 5" } as FunctionDeclarationSchema,
      },
      required: ["query"]
    }
  },

  // === MEMORY & CONTEXT TOOLS ===
  search_chat_history: {
    name: "search_chat_history",
    description: "Search through past conversations (including archived chats) to find relevant context. Use this when the user refers to something discussed earlier or you need to recall past information.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Search term or topic to look for in chat history" } as FunctionDeclarationSchema,
        includeArchived: { type: SchemaType.BOOLEAN, description: "Include archived/old chats in search. Default: true" } as FunctionDeclarationSchema,
      },
      required: ["query"]
    }
  },

  get_conversation_context: {
    name: "get_conversation_context",
    description: "Get detailed context around a specific topic from past conversations. Returns messages before and after mentions of the topic.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: { type: SchemaType.STRING, description: "Topic or keyword to find context for" } as FunctionDeclarationSchema,
      },
      required: ["topic"]
    }
  },

  get_memory_summary: {
    name: "get_memory_summary",
    description: "Get the long-term memory summary of all past conversations with this user. Use this to recall user preferences, past requests, and important context.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: []
    }
  },

  get_last_conversation: {
    name: "get_last_conversation",
    description: "Get the last/previous conversation (archived chat session). Use this when user asks 'what did we discuss?', 'our last conversation', 'remember what we talked about?', etc.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: "Number of messages to retrieve (default: 20)" } as FunctionDeclarationSchema,
      },
      required: []
    }
  },

  // === LEAD TOOLS ===
  create_lead: {
    name: "create_lead",
    description: "Creates a new lead in the CRM. Always include firstName, lastName, and email. For test/demo leads: invent realistic DACH names and emails yourself (e.g. 'Lisa Weber', 'lisa.weber@test.at'). NEVER ask the user for test data — just create it.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        salutation: { type: SchemaType.STRING, description: "Salutation: NONE, MR (Herr), MS (Frau), DIVERSE (Divers)" } as FunctionDeclarationSchema,
        formalAddress: { type: SchemaType.BOOLEAN, description: "Use formal address (Sie) if true, informal (Du) if false. Default: true" } as FunctionDeclarationSchema,
        firstName: { type: SchemaType.STRING, description: "First name of the lead - REQUIRED for proper lead management" } as FunctionDeclarationSchema,
        lastName: { type: SchemaType.STRING, description: "Last name of the lead - REQUIRED for proper lead management" } as FunctionDeclarationSchema,
        email: { type: SchemaType.STRING, description: "Email address" } as FunctionDeclarationSchema,
        phone: { type: SchemaType.STRING, description: "Phone number" } as FunctionDeclarationSchema,
        message: { type: SchemaType.STRING, description: "Initial message or note" } as FunctionDeclarationSchema,
        budgetMin: { type: SchemaType.NUMBER, description: "Minimum budget in EUR" } as FunctionDeclarationSchema,
        budgetMax: { type: SchemaType.NUMBER, description: "Maximum budget in EUR" } as FunctionDeclarationSchema,
        preferredType: { type: SchemaType.STRING, description: "Preferred property type: APARTMENT, HOUSE, COMMERCIAL, LAND, GARAGE, OTHER" } as FunctionDeclarationSchema,
        preferredLocation: { type: SchemaType.STRING, description: "Preferred location (city or postal code)" } as FunctionDeclarationSchema,
        minRooms: { type: SchemaType.NUMBER, description: "Minimum number of rooms" } as FunctionDeclarationSchema,
        minArea: { type: SchemaType.NUMBER, description: "Minimum area in m²" } as FunctionDeclarationSchema,
        timeFrame: { type: SchemaType.STRING, description: "Time frame: IMMEDIATE, THREE_MONTHS, SIX_MONTHS, TWELVE_MONTHS, LONGTERM" } as FunctionDeclarationSchema,
        financingStatus: { type: SchemaType.STRING, description: "Financing status: NOT_CLARIFIED, PRE_QUALIFIED, APPROVED, CASH_BUYER" } as FunctionDeclarationSchema,
        source: { type: SchemaType.STRING, description: "Lead source: WEBSITE, PORTAL, REFERRAL, SOCIAL_MEDIA, COLD_CALL, EVENT, OTHER" } as FunctionDeclarationSchema,
      },
      required: ["email", "firstName", "lastName"]
    }
  },
  create_property: {
    name: "create_property",
    description: "Creates a new property/real estate object in the CRM with all details. Supports ALL property fields.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Property title (e.g., 'Moderne Wohnung in Berlin-Mitte')" } as FunctionDeclarationSchema,
        description: { type: SchemaType.STRING, description: "Detailed description of the property" } as FunctionDeclarationSchema,
        address: { type: SchemaType.STRING, description: "Full street address" } as FunctionDeclarationSchema,
        street: { type: SchemaType.STRING, description: "Street name" } as FunctionDeclarationSchema,
        houseNumber: { type: SchemaType.STRING, description: "House number" } as FunctionDeclarationSchema,
        floor: { type: SchemaType.INTEGER, description: "Floor number" } as FunctionDeclarationSchema,
        zipCode: { type: SchemaType.STRING, description: "Postal code" } as FunctionDeclarationSchema,
        city: { type: SchemaType.STRING, description: "City" } as FunctionDeclarationSchema,
        district: { type: SchemaType.STRING, description: "District/Bezirk" } as FunctionDeclarationSchema,
        state: { type: SchemaType.STRING, description: "State/Bundesland" } as FunctionDeclarationSchema,
        country: { type: SchemaType.STRING, description: "Country (default: Deutschland)" } as FunctionDeclarationSchema,
        propertyType: { type: SchemaType.STRING, description: "Type: APARTMENT, HOUSE, COMMERCIAL, LAND, GARAGE, OTHER" } as FunctionDeclarationSchema,
        marketingType: { type: SchemaType.STRING, description: "Marketing type: SALE, RENT, LEASE" } as FunctionDeclarationSchema,
        salePrice: { type: SchemaType.NUMBER, description: "Sale price in EUR (for SALE)" } as FunctionDeclarationSchema,
        rentCold: { type: SchemaType.NUMBER, description: "Cold rent in EUR/month (for RENT)" } as FunctionDeclarationSchema,
        rentWarm: { type: SchemaType.NUMBER, description: "Warm rent in EUR/month" } as FunctionDeclarationSchema,
        additionalCosts: { type: SchemaType.NUMBER, description: "Additional costs in EUR/month" } as FunctionDeclarationSchema,
        deposit: { type: SchemaType.STRING, description: "Deposit (e.g., '3 Monatsmieten')" } as FunctionDeclarationSchema,
        commission: { type: SchemaType.STRING, description: "Commission (e.g., '3,57% inkl. MwSt.')" } as FunctionDeclarationSchema,
        livingArea: { type: SchemaType.NUMBER, description: "Living area in m²" } as FunctionDeclarationSchema,
        usableArea: { type: SchemaType.NUMBER, description: "Usable area in m²" } as FunctionDeclarationSchema,
        plotArea: { type: SchemaType.NUMBER, description: "Plot area in m²" } as FunctionDeclarationSchema,
        rooms: { type: SchemaType.NUMBER, description: "Number of rooms" } as FunctionDeclarationSchema,
        bedrooms: { type: SchemaType.NUMBER, description: "Number of bedrooms" } as FunctionDeclarationSchema,
        bathrooms: { type: SchemaType.NUMBER, description: "Number of bathrooms" } as FunctionDeclarationSchema,
        yearBuilt: { type: SchemaType.NUMBER, description: "Year built (YYYY)" } as FunctionDeclarationSchema,
        yearRenovated: { type: SchemaType.NUMBER, description: "Year last renovated (YYYY)" } as FunctionDeclarationSchema,
        condition: { type: SchemaType.STRING, description: "Condition: FIRST_OCCUPANCY, NEW, RENOVATED, REFURBISHED, WELL_MAINTAINED, MODERNIZED, NEEDS_RENOVATION" } as FunctionDeclarationSchema,
        buildingType: { type: SchemaType.STRING, description: "Building type enum: NEW_BUILDING, OLD_BUILDING, MONUMENT" } as FunctionDeclarationSchema,
        totalFloors: { type: SchemaType.INTEGER, description: "Total number of floors in the building" } as FunctionDeclarationSchema,
        heatingType: { type: SchemaType.STRING, description: "Heating type (e.g., 'Fernwärme', 'Gas', 'Wärmepumpe')" } as FunctionDeclarationSchema,
        energyCertificateType: { type: SchemaType.STRING, description: "Energy certificate type: DEMAND, CONSUMPTION" } as FunctionDeclarationSchema,
        energyEfficiencyClass: { type: SchemaType.STRING, description: "Energy efficiency class: A_PLUS, A, B, C, D, E, F, G, H" } as FunctionDeclarationSchema,
        energyConsumption: { type: SchemaType.NUMBER, description: "Energy consumption in kWh/(m²·a)" } as FunctionDeclarationSchema,
        primaryEnergySource: { type: SchemaType.STRING, description: "Primary energy source (e.g., Gas, Fernwärme)" } as FunctionDeclarationSchema,
        features: { type: SchemaType.ARRAY, description: "List of features/equipment (e.g., ['Einbauküche', 'Balkon', 'Aufzug'])", items: { type: SchemaType.STRING } } as FunctionDeclarationSchema,
        locationDescription: { type: SchemaType.STRING, description: "Description of location, surroundings, infrastructure" } as FunctionDeclarationSchema,
        equipmentDescription: { type: SchemaType.STRING, description: "Detailed description of equipment/Ausstattung" } as FunctionDeclarationSchema,
        virtualTour: { type: SchemaType.STRING, description: "URL to virtual tour (e.g., Matterport)" } as FunctionDeclarationSchema,
        status: { type: SchemaType.STRING, description: "Status: ACTIVE, RESERVED, SOLD, RENTED, ARCHIVED" } as FunctionDeclarationSchema,
        priority: { type: SchemaType.STRING, description: "Priority: LOW, MEDIUM, HIGH" } as FunctionDeclarationSchema,
      },
      required: ["title", "address"]
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
  get_leads: {
    name: "get_leads",
    description: "Retrieves leads from the CRM. Use search to find leads by full name (e.g. 'Anna Schmidt'), first name, last name, email, or phone. Always use this first when the user asks about a specific lead.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING, description: "Filter by status: NEW, CONTACTED, CONVERSATION, BOOKED, LOST" } as FunctionDeclarationSchema,
        search: { type: SchemaType.STRING, description: "Search by full name, first name, last name, email, or phone. Supports multi-word search like 'Anna Schmidt'." } as FunctionDeclarationSchema,
        limit: { type: SchemaType.NUMBER, description: "Maximum number of leads to return (default: 50)" } as FunctionDeclarationSchema,
      }
    }
  },
  get_lead: {
    name: "get_lead",
    description: "Retrieves ALL details of a specific lead by ID, including documents, messages, property, activities. Use after get_leads to answer follow-up questions about a specific lead. If the user asks about a lead's documents, notes, messages etc. and you already have the ID from a previous get_leads call, use this tool.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leadId: { type: SchemaType.STRING, description: "ID of the lead" } as FunctionDeclarationSchema,
      },
      required: ["leadId"]
    }
  },
  update_lead: {
    name: "update_lead",
    description: "Updates an existing lead's information including buyer preferences.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leadId: { type: SchemaType.STRING, description: "ID of the lead to update" } as FunctionDeclarationSchema,
        salutation: { type: SchemaType.STRING, description: "Salutation: NONE, MR (Herr), MS (Frau), DIVERSE (Divers)" } as FunctionDeclarationSchema,
        formalAddress: { type: SchemaType.BOOLEAN, description: "Use formal address (Sie) if true, informal (Du) if false" } as FunctionDeclarationSchema,
        firstName: { type: SchemaType.STRING, description: "First name" } as FunctionDeclarationSchema,
        lastName: { type: SchemaType.STRING, description: "Last name" } as FunctionDeclarationSchema,
        email: { type: SchemaType.STRING, description: "Email address" } as FunctionDeclarationSchema,
        phone: { type: SchemaType.STRING, description: "Phone number" } as FunctionDeclarationSchema,
        status: { type: SchemaType.STRING, description: "Status: NEW, CONTACTED, CONVERSATION, BOOKED, LOST" } as FunctionDeclarationSchema,
        budgetMin: { type: SchemaType.NUMBER, description: "Minimum budget in EUR" } as FunctionDeclarationSchema,
        budgetMax: { type: SchemaType.NUMBER, description: "Maximum budget in EUR" } as FunctionDeclarationSchema,
        preferredType: { type: SchemaType.STRING, description: "Preferred property type: APARTMENT, HOUSE, COMMERCIAL, LAND, GARAGE, OTHER" } as FunctionDeclarationSchema,
        preferredLocation: { type: SchemaType.STRING, description: "Preferred location (city or postal code)" } as FunctionDeclarationSchema,
        minRooms: { type: SchemaType.NUMBER, description: "Minimum number of rooms" } as FunctionDeclarationSchema,
        minArea: { type: SchemaType.NUMBER, description: "Minimum area in m²" } as FunctionDeclarationSchema,
        timeFrame: { type: SchemaType.STRING, description: "Time frame: IMMEDIATE, THREE_MONTHS, SIX_MONTHS, TWELVE_MONTHS, LONGTERM" } as FunctionDeclarationSchema,
        financingStatus: { type: SchemaType.STRING, description: "Financing status: NOT_CLARIFIED, PRE_QUALIFIED, APPROVED, CASH_BUYER" } as FunctionDeclarationSchema,
        notes: { type: SchemaType.STRING, description: "Internal notes" } as FunctionDeclarationSchema,
        propertyId: { type: SchemaType.STRING, description: "ID of the property to assign this lead to (use get_properties to find IDs)" } as FunctionDeclarationSchema,
        assignedToId: { type: SchemaType.STRING, description: "ID of the team member to assign this lead to (use get_team_members to find IDs)" } as FunctionDeclarationSchema,
      },
      required: ["leadId"]
    }
  },
  delete_lead: {
    name: "delete_lead",
    description: "Deletes a single lead from the CRM by ID. IMPORTANT: First use get_leads to find the lead ID, then delete. Use with caution!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leadId: { type: SchemaType.STRING, description: "ID of the lead to delete. Get this from get_leads first!" } as FunctionDeclarationSchema,
      },
      required: ["leadId"]
    }
  },
  delete_all_leads: {
    name: "delete_all_leads",
    description: "Deletes ALL leads from the CRM. DANGEROUS! Always ask for confirmation first. Returns the count of deleted leads.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to confirm deletion. Always ask user for confirmation first!" } as FunctionDeclarationSchema,
      },
      required: ["confirmed"]
    }
  },
  get_properties: {
    name: "get_properties",
    description: "Retrieves all properties from the CRM.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: "Maximum number of properties to return (default: 50)" } as FunctionDeclarationSchema,
      }
    }
  },
  get_property: {
    name: "get_property",
    description: "Retrieves a specific property by ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property" } as FunctionDeclarationSchema,
      },
      required: ["propertyId"]
    }
  },
  update_property: {
    name: "update_property",
    description: "Updates an existing property. Supports ALL property fields — address details, prices, areas, rooms, building info, energy certificate, features, descriptions, media links, status, and more.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property to update" } as FunctionDeclarationSchema,
        title: { type: SchemaType.STRING, description: "Property title" } as FunctionDeclarationSchema,
        description: { type: SchemaType.STRING, description: "Detailed description" } as FunctionDeclarationSchema,
        address: { type: SchemaType.STRING, description: "Full street address" } as FunctionDeclarationSchema,
        street: { type: SchemaType.STRING, description: "Street name" } as FunctionDeclarationSchema,
        houseNumber: { type: SchemaType.STRING, description: "House number" } as FunctionDeclarationSchema,
        floor: { type: SchemaType.INTEGER, description: "Floor number" } as FunctionDeclarationSchema,
        zipCode: { type: SchemaType.STRING, description: "Postal code" } as FunctionDeclarationSchema,
        city: { type: SchemaType.STRING, description: "City" } as FunctionDeclarationSchema,
        district: { type: SchemaType.STRING, description: "District/Bezirk" } as FunctionDeclarationSchema,
        state: { type: SchemaType.STRING, description: "State/Bundesland" } as FunctionDeclarationSchema,
        country: { type: SchemaType.STRING, description: "Country" } as FunctionDeclarationSchema,
        propertyType: { type: SchemaType.STRING, description: "Type: APARTMENT, HOUSE, COMMERCIAL, LAND, GARAGE, OTHER" } as FunctionDeclarationSchema,
        marketingType: { type: SchemaType.STRING, description: "Marketing type: SALE, RENT, LEASE" } as FunctionDeclarationSchema,
        salePrice: { type: SchemaType.NUMBER, description: "Sale price in EUR" } as FunctionDeclarationSchema,
        rentCold: { type: SchemaType.NUMBER, description: "Cold rent in EUR/month" } as FunctionDeclarationSchema,
        rentWarm: { type: SchemaType.NUMBER, description: "Warm rent in EUR/month" } as FunctionDeclarationSchema,
        additionalCosts: { type: SchemaType.NUMBER, description: "Additional costs in EUR/month" } as FunctionDeclarationSchema,
        deposit: { type: SchemaType.STRING, description: "Deposit (e.g., '3 Monatsmieten')" } as FunctionDeclarationSchema,
        commission: { type: SchemaType.STRING, description: "Commission (e.g., '3,57% inkl. MwSt.')" } as FunctionDeclarationSchema,
        livingArea: { type: SchemaType.NUMBER, description: "Living area in m²" } as FunctionDeclarationSchema,
        usableArea: { type: SchemaType.NUMBER, description: "Usable area in m²" } as FunctionDeclarationSchema,
        plotArea: { type: SchemaType.NUMBER, description: "Plot area in m²" } as FunctionDeclarationSchema,
        rooms: { type: SchemaType.NUMBER, description: "Number of rooms" } as FunctionDeclarationSchema,
        bedrooms: { type: SchemaType.NUMBER, description: "Number of bedrooms" } as FunctionDeclarationSchema,
        bathrooms: { type: SchemaType.NUMBER, description: "Number of bathrooms" } as FunctionDeclarationSchema,
        yearBuilt: { type: SchemaType.NUMBER, description: "Year built (YYYY)" } as FunctionDeclarationSchema,
        yearRenovated: { type: SchemaType.NUMBER, description: "Year last renovated (YYYY)" } as FunctionDeclarationSchema,
        condition: { type: SchemaType.STRING, description: "Condition: FIRST_OCCUPANCY, NEW, RENOVATED, REFURBISHED, WELL_MAINTAINED, MODERNIZED, NEEDS_RENOVATION" } as FunctionDeclarationSchema,
        buildingType: { type: SchemaType.STRING, description: "Building type enum: NEW_BUILDING, OLD_BUILDING, MONUMENT" } as FunctionDeclarationSchema,
        totalFloors: { type: SchemaType.INTEGER, description: "Total number of floors in the building" } as FunctionDeclarationSchema,
        heatingType: { type: SchemaType.STRING, description: "Heating type (e.g., 'Fernwärme', 'Gas', 'Wärmepumpe')" } as FunctionDeclarationSchema,
        energyCertificateType: { type: SchemaType.STRING, description: "Energy certificate type: DEMAND, CONSUMPTION" } as FunctionDeclarationSchema,
        energyEfficiencyClass: { type: SchemaType.STRING, description: "Energy efficiency class: A_PLUS, A, B, C, D, E, F, G, H" } as FunctionDeclarationSchema,
        energyConsumption: { type: SchemaType.NUMBER, description: "Energy consumption in kWh/(m²·a)" } as FunctionDeclarationSchema,
        primaryEnergySource: { type: SchemaType.STRING, description: "Primary energy source (e.g., Gas, Fernwärme)" } as FunctionDeclarationSchema,
        features: { type: SchemaType.ARRAY, description: "List of features/equipment (e.g., ['Einbauküche', 'Balkon'])", items: { type: SchemaType.STRING } } as FunctionDeclarationSchema,
        locationDescription: { type: SchemaType.STRING, description: "Description of location, surroundings, infrastructure" } as FunctionDeclarationSchema,
        equipmentDescription: { type: SchemaType.STRING, description: "Detailed description of equipment/Ausstattung" } as FunctionDeclarationSchema,
        aiFacts: { type: SchemaType.STRING, description: "AI-generated facts or context notes" } as FunctionDeclarationSchema,
        virtualTour: { type: SchemaType.STRING, description: "URL to virtual tour (e.g., Matterport)" } as FunctionDeclarationSchema,
        status: { type: SchemaType.STRING, description: "Status: ACTIVE, RESERVED, SOLD, RENTED, ARCHIVED" } as FunctionDeclarationSchema,
        priority: { type: SchemaType.STRING, description: "Priority: LOW, MEDIUM, HIGH" } as FunctionDeclarationSchema,
        defaultExposeTemplateId: { type: SchemaType.STRING, description: "ID of default expose template for auto-generation" } as FunctionDeclarationSchema,
      },
      required: ["propertyId"]
    }
  },
  delete_property: {
    name: "delete_property",
    description: "Deletes a single property from the CRM by ID. Use with caution!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property to delete" } as FunctionDeclarationSchema,
      },
      required: ["propertyId"]
    }
  },
  delete_all_properties: {
    name: "delete_all_properties",
    description: "Deletes ALL properties from the CRM. DANGEROUS! Always ask for confirmation first. Returns the count of deleted properties.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to confirm deletion. Always ask user for confirmation first!" } as FunctionDeclarationSchema,
      },
      required: ["confirmed"]
    }
  },
  upload_images_to_property: {
    name: "upload_images_to_property",
    description: "Uploads images to a specific property. Images are taken from chat attachments of the current message. If the user uploaded images in a PREVIOUS message, extract their URLs from the [HOCHGELADENE BILDER: ...] context in the conversation and pass them via the imageUrls parameter.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property to upload images to" } as FunctionDeclarationSchema,
        isFloorplan: { type: SchemaType.BOOLEAN, description: "If true, uploads as floorplans instead of regular images. Default: false" } as FunctionDeclarationSchema,
        imageUrls: { type: SchemaType.STRING, description: "Comma-separated list of image URLs from previous messages in the conversation context. Use this when the user uploaded images in an earlier message." } as FunctionDeclarationSchema,
      },
      required: ["propertyId"]
    }
  },
  upload_documents_to_lead: {
    name: "upload_documents_to_lead",
    description: "Uploads files/documents/images to a specific lead. Files are taken from chat attachments of the current message. If files were uploaded in a PREVIOUS message, extract their URLs from the conversation context and pass them via the fileUrls parameter.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leadId: { type: SchemaType.STRING, description: "ID of the lead to upload documents to. Get this from get_leads first." } as FunctionDeclarationSchema,
        fileUrls: { type: SchemaType.STRING, description: "Comma-separated list of file URLs from previous messages in the conversation context. Use this when the user uploaded files in an earlier message." } as FunctionDeclarationSchema,
      },
      required: ["leadId"]
    }
  },
  get_property_images: {
    name: "get_property_images",
    description: "Gets all images and floorplans of a property. Returns URLs and counts.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property" } as FunctionDeclarationSchema,
      },
      required: ["propertyId"]
    }
  },
  delete_property_image: {
    name: "delete_property_image",
    description: "Deletes a specific image or floorplan from a property.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property" } as FunctionDeclarationSchema,
        imageUrl: { type: SchemaType.STRING, description: "URL of the image to delete" } as FunctionDeclarationSchema,
        isFloorplan: { type: SchemaType.BOOLEAN, description: "If true, deletes from floorplans. Default: false" } as FunctionDeclarationSchema,
      },
      required: ["propertyId", "imageUrl"]
    }
  },
  delete_all_property_images: {
    name: "delete_all_property_images",
    description: "Deletes all images or all floorplans from a property. Ask for confirmation first!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property" } as FunctionDeclarationSchema,
        isFloorplan: { type: SchemaType.BOOLEAN, description: "If true, deletes all floorplans. If false, deletes all images." } as FunctionDeclarationSchema,
        confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to confirm deletion" } as FunctionDeclarationSchema,
      },
      required: ["propertyId", "confirmed"]
    }
  },
  move_image_to_floorplan: {
    name: "move_image_to_floorplan",
    description: "Moves an image to floorplans or vice versa.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property" } as FunctionDeclarationSchema,
        imageUrl: { type: SchemaType.STRING, description: "URL of the image to move" } as FunctionDeclarationSchema,
        toFloorplan: { type: SchemaType.BOOLEAN, description: "If true, moves image to floorplans. If false, moves floorplan to images." } as FunctionDeclarationSchema,
      },
      required: ["propertyId", "imageUrl", "toFloorplan"]
    }
  },
  // === COMPANY INFO TOOL ===
  get_company_info: {
    name: "get_company_info",
    description: "Retrieves detailed information about the user's company (name, description, services, regions, contact info, slogan, team size). Use when the user asks about their own company, needs company details for emails/exposés, or asks 'Wer sind wir?'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  // === TEAM & CONTACTS TOOLS ===
  get_team_members: {
    name: "get_team_members",
    description: "Retrieves all team members (agents/seats) in the company. Use this to find colleagues' email addresses when the user wants to send an email to a team member by name.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        search: { type: SchemaType.STRING, description: "Optional: Search by name" } as FunctionDeclarationSchema,
      }
    }
  },
  search_contacts: {
    name: "search_contacts",
    description: "Searches for contacts in the CRM (leads). Use this to find a contact's email address when the user wants to send an email to someone by name.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Search term (name, email, phone)" } as FunctionDeclarationSchema,
        limit: { type: SchemaType.NUMBER, description: "Maximum results (default: 10)" } as FunctionDeclarationSchema,
      },
      required: ["query"]
    }
  },
  // === EMAIL TOOLS ===
  get_emails: {
    name: "get_emails",
    description: "Retrieves emails from the user's mailbox. Can filter by folder, unread status, or search term. Returns a list with subject, sender, date, and preview.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        folder: { type: SchemaType.STRING, description: "Filter by folder: INBOX, SENT, DRAFTS, TRASH" } as FunctionDeclarationSchema,
        unreadOnly: { type: SchemaType.BOOLEAN, description: "If true, only return unread emails" } as FunctionDeclarationSchema,
        search: { type: SchemaType.STRING, description: "Search term to filter by subject, sender, or content" } as FunctionDeclarationSchema,
        limit: { type: SchemaType.NUMBER, description: "Maximum number of emails (default: 50, max: 100)" } as FunctionDeclarationSchema,
      }
    }
  },
  get_email: {
    name: "get_email",
    description: "Retrieves the full content of a specific email by ID, including the complete body text.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        emailId: { type: SchemaType.STRING, description: "ID of the email to retrieve" } as FunctionDeclarationSchema,
      },
      required: ["emailId"]
    }
  },
  draft_email: {
    name: "draft_email",
    description: "Creates an email draft. Does NOT send it automatically.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        to: { type: SchemaType.STRING, description: "Recipient email address" } as FunctionDeclarationSchema,
        subject: { type: SchemaType.STRING, description: "Email subject" } as FunctionDeclarationSchema,
        body: { type: SchemaType.STRING, description: "Email body (HTML or plain text)" } as FunctionDeclarationSchema,
        leadId: { type: SchemaType.STRING, description: "Optional: Link to lead" } as FunctionDeclarationSchema,
      },
      required: ["to", "subject", "body"]
    }
  },
  send_email: {
    name: "send_email",
    description: "Sends an email immediately. Use draft_email for drafts.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        to: { type: SchemaType.STRING, description: "Recipient email address" } as FunctionDeclarationSchema,
        subject: { type: SchemaType.STRING, description: "Email subject" } as FunctionDeclarationSchema,
        body: { type: SchemaType.STRING, description: "Email body (HTML or plain text)" } as FunctionDeclarationSchema,
        leadId: { type: SchemaType.STRING, description: "Optional: Link to lead" } as FunctionDeclarationSchema,
      },
      required: ["to", "subject", "body"]
    }
  },
  reply_to_email: {
    name: "reply_to_email",
    description: "Replies to an existing email thread.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        emailId: { type: SchemaType.STRING, description: "ID of the email to reply to" } as FunctionDeclarationSchema,
        body: { type: SchemaType.STRING, description: "Reply body" } as FunctionDeclarationSchema,
      },
      required: ["emailId", "body"]
    }
  },
  
  // === CALENDAR TOOLS ===
  get_calendar_events: {
    name: "get_calendar_events",
    description: "Retrieves all calendar events (appointments, meetings, viewings) for a date range from the user's connected Google or Outlook calendar. Use this to check what appointments exist, find free slots, or answer questions about the user's schedule.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start: { type: SchemaType.STRING, description: "Start date (ISO string, e.g. '2026-02-06T00:00:00.000Z')" } as FunctionDeclarationSchema,
        end: { type: SchemaType.STRING, description: "End date (ISO string, e.g. '2026-02-13T23:59:59.000Z')" } as FunctionDeclarationSchema,
      },
      required: ["start", "end"]
    }
  },
  create_calendar_event: {
    name: "create_calendar_event",
    description: "Creates a new calendar event/appointment in the user's connected Google or Outlook calendar. Use this to schedule viewings, meetings, or any other appointments. The event will appear in the user's real calendar.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Event title (e.g. 'Besichtigung: Musterstraße 1')" } as FunctionDeclarationSchema,
        description: { type: SchemaType.STRING, description: "Event description with details" } as FunctionDeclarationSchema,
        start: { type: SchemaType.STRING, description: "Start date/time (ISO string, e.g. '2026-02-10T14:00:00.000Z')" } as FunctionDeclarationSchema,
        end: { type: SchemaType.STRING, description: "End date/time (ISO string, e.g. '2026-02-10T15:00:00.000Z')" } as FunctionDeclarationSchema,
        location: { type: SchemaType.STRING, description: "Event location/address" } as FunctionDeclarationSchema,
        attendees: { type: SchemaType.STRING, description: "Comma-separated email addresses of attendees" } as FunctionDeclarationSchema,
      },
      required: ["title", "start", "end"]
    }
  },
  update_calendar_event: {
    name: "update_calendar_event",
    description: "Updates an existing calendar event. Use this to change the time, title, location, or description of an appointment. You need the eventId from get_calendar_events.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        eventId: { type: SchemaType.STRING, description: "ID of the event (from get_calendar_events)" } as FunctionDeclarationSchema,
        title: { type: SchemaType.STRING, description: "New title (optional)" } as FunctionDeclarationSchema,
        start: { type: SchemaType.STRING, description: "New start time (ISO string, optional)" } as FunctionDeclarationSchema,
        end: { type: SchemaType.STRING, description: "New end time (ISO string, optional)" } as FunctionDeclarationSchema,
        location: { type: SchemaType.STRING, description: "New location (optional)" } as FunctionDeclarationSchema,
        description: { type: SchemaType.STRING, description: "New description (optional)" } as FunctionDeclarationSchema,
      },
      required: ["eventId"]
    }
  },
  delete_calendar_event: {
    name: "delete_calendar_event",
    description: "Deletes/cancels a calendar event. Use this to remove appointments from the user's calendar. You need the eventId from get_calendar_events.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        eventId: { type: SchemaType.STRING, description: "ID of the event to delete (from get_calendar_events)" } as FunctionDeclarationSchema,
      },
      required: ["eventId"]
    }
  },
  get_calendar_availability: {
    name: "get_calendar_availability",
    description: "Checks calendar availability for a given date range. Returns busy slots and a summary of how many appointments exist. Use this to find free time slots for scheduling new appointments.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start: { type: SchemaType.STRING, description: "Start date (ISO string)" } as FunctionDeclarationSchema,
        end: { type: SchemaType.STRING, description: "End date (ISO string)" } as FunctionDeclarationSchema
      },
      required: ["start", "end"]
    }
  },
  
  // === TEAM CHAT TOOLS ===
  send_team_message: {
    name: "send_team_message",
    description: "Sends a message to a team chat channel on behalf of Mivo (the AI assistant). Use this when the user asks you to post something in the team chat, notify the team, or share information with colleagues. The message will be clearly marked as sent by Mivo AI.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        channelId: { type: SchemaType.STRING, description: "ID of the channel to post in. If not provided, posts to the default channel." } as FunctionDeclarationSchema,
        content: { type: SchemaType.STRING, description: "The message content to send. Can include @mentions in format @[Name](userId)." } as FunctionDeclarationSchema,
      },
      required: ["content"]
    }
  },
  get_team_channels: {
    name: "get_team_channels",
    description: "Gets all available team chat channels for this tenant. Use this to find the right channel to post messages to.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },

  // === EXPOSÉ TOOLS (non-editor) ===
  get_exposes: {
    name: "get_exposes",
    description: "Retrieves all existing Exposés for this tenant. Use this FIRST when the user asks about exposés, how many exist, or wants to work with them. Can filter by status or property.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING, description: "Filter by status: DRAFT, PUBLISHED" } as FunctionDeclarationSchema,
        propertyId: { type: SchemaType.STRING, description: "Filter by property ID" } as FunctionDeclarationSchema,
        limit: { type: SchemaType.NUMBER, description: "Maximum number (default: 50)" } as FunctionDeclarationSchema,
      }
    }
  },
  create_expose_from_template: {
    name: "create_expose_from_template",
    description: "Creates a new Exposé from a template for a property.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property" } as FunctionDeclarationSchema,
        templateId: { type: SchemaType.STRING, description: "ID of the template to use" } as FunctionDeclarationSchema,
      },
      required: ["propertyId", "templateId"]
    }
  },
  create_expose_template: {
    name: "create_expose_template",
    description: "Creates a new Exposé template. BE CREATIVE! Choose a unique, descriptive name yourself (e.g. 'Luxus Villa', 'Stadtapartment Modern', 'Landhaus Klassik'). Pick a fitting theme. Do NOT ask the user - just create something great!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Creative name for the template - choose yourself, don't ask! Examples: 'Premium Penthouse', 'Gemütliches Zuhause', 'Business Loft'" } as FunctionDeclarationSchema,
        theme: { type: SchemaType.STRING, description: "Visual theme: 'modern' (clean lines), 'elegant' (luxurious), 'minimal' (simple), 'classic' (traditional). Pick what fits the name!" } as FunctionDeclarationSchema,
      },
      required: []
    }
  },
  delete_expose: {
    name: "delete_expose",
    description: "Deletes a single Exposé by ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé to delete" } as FunctionDeclarationSchema,
      },
      required: ["exposeId"]
    }
  },
  delete_all_exposes: {
    name: "delete_all_exposes",
    description: "Deletes ALL Exposés from the CRM. DANGEROUS! Always ask for confirmation first. Returns the count of deleted exposés.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to confirm deletion. Always ask user for confirmation first!" } as FunctionDeclarationSchema,
      },
      required: ["confirmed"]
    }
  },
  generate_expose_pdf: {
    name: "generate_expose_pdf",
    description: "Generates a PDF for an Exposé.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé" } as FunctionDeclarationSchema,
      },
      required: ["exposeId"]
    }
  },
  
  get_channel_messages: {
    name: "get_channel_messages",
    description: "Retrieves messages from a specific channel.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        channelId: { type: SchemaType.STRING, description: "ID of the channel" } as FunctionDeclarationSchema,
        limit: { type: SchemaType.NUMBER, description: "Maximum number of messages (default: 50)" } as FunctionDeclarationSchema,
      },
      required: ["channelId"]
    }
  },
  // === DASHBOARD / STATS TOOLS ===
  get_dashboard_stats: {
    name: "get_dashboard_stats",
    description: "Retrieves dashboard statistics (leads count, properties count, etc.).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: { type: SchemaType.STRING, description: "Time period: today, week, month, year" } as FunctionDeclarationSchema,
      }
    }
  },
  get_lead_statistics: {
    name: "get_lead_statistics",
    description: "Retrieves detailed lead statistics and conversion rates.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: { type: SchemaType.STRING, description: "Time period: today, week, month, year" } as FunctionDeclarationSchema,
      }
    }
  },
  get_property_statistics: {
    name: "get_property_statistics",
    description: "Retrieves property statistics (sold, rented, available, etc.).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: { type: SchemaType.STRING, description: "Time period: today, week, month, year" } as FunctionDeclarationSchema,
      }
    }
  },
  
  // === TEMPLATE TOOLS ===
  get_email_templates: {
    name: "get_email_templates",
    description: "Retrieves all email templates.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: "Maximum number (default: 50)" } as FunctionDeclarationSchema,
      }
    }
  },
  get_expose_templates: {
    name: "get_expose_templates",
    description: "Retrieves all existing Exposé templates (Vorlagen) for this tenant. Use this when the user asks about templates/Vorlagen or wants to see which ones exist.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: "Maximum number (default: 50)" } as FunctionDeclarationSchema,
      }
    }
  },
  update_expose_template: {
    name: "update_expose_template",
    description: "Updates an Exposé template's name, theme, or content blocks. Use this to improve a template layout, add/edit sections, or rename/restyle it.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        templateId: { type: SchemaType.STRING, description: "ID of the template to update" } as FunctionDeclarationSchema,
        name: { type: SchemaType.STRING, description: "New template name" } as FunctionDeclarationSchema,
        theme: { type: SchemaType.STRING, description: "Theme: modern, classic, elegant, minimal, luxury, bold" } as FunctionDeclarationSchema,
        blocks: { type: SchemaType.ARRAY, description: "Full replacement of template content blocks as JSON array. Each block has an 'id', 'type', and type-specific fields. Supported types: hero, stats, gallery, text, contact, map, features, timeline, video.", items: { type: SchemaType.OBJECT } } as FunctionDeclarationSchema,
      },
      required: ["templateId"]
    }
  },
  delete_expose_template: {
    name: "delete_expose_template",
    description: "Deletes an Exposé template. DANGEROUS! Ask for confirmation first.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        templateId: { type: SchemaType.STRING, description: "ID of the template to delete" } as FunctionDeclarationSchema,
        confirmed: { type: SchemaType.BOOLEAN, description: "Must be true to confirm deletion" } as FunctionDeclarationSchema,
      },
      required: ["templateId", "confirmed"]
    }
  },
  add_video_to_property: {
    name: "add_video_to_property",
    description: "Adds a video URL to a property's video list.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property" } as FunctionDeclarationSchema,
        videoUrl: { type: SchemaType.STRING, description: "URL of the video" } as FunctionDeclarationSchema,
      },
      required: ["propertyId", "videoUrl"]
    }
  },
  set_virtual_tour: {
    name: "set_virtual_tour",
    description: "Sets or updates the virtual tour URL for a property.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property" } as FunctionDeclarationSchema,
        tourUrl: { type: SchemaType.STRING, description: "URL of the virtual tour (e.g. Matterport link)" } as FunctionDeclarationSchema,
      },
      required: ["propertyId", "tourUrl"]
    }
  },
  virtual_staging: {
    name: "virtual_staging",
    description: "Virtual Staging: Fügt KI-generierte Möbel in ein leeres Raumfoto ein. Kann ein vom User hochgeladenes Bild oder ein Bild aus einem Objekt verwenden. Gibt ein bearbeitetes Bild als URL zurück. Optional kann das Ergebnis direkt zum Objekt gespeichert werden.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        imageUrl: { type: SchemaType.STRING, description: "URL des Bildes das bearbeitet werden soll. Entweder eine hochgeladene Datei-URL oder ein Bild aus property.images[]" } as FunctionDeclarationSchema,
        propertyId: { type: SchemaType.STRING, description: "Optional: Property-ID um ein Bild daraus zu verwenden (nimmt das erste Bild wenn imageUrl leer)" } as FunctionDeclarationSchema,
        imageIndex: { type: SchemaType.INTEGER, description: "Optional: Index des Bildes aus dem Objekt (0-basiert, default: 0)" } as FunctionDeclarationSchema,
        style: { type: SchemaType.STRING, description: "Einrichtungsstil: modern, scandinavian, industrial, classic, bohemian, luxury" } as FunctionDeclarationSchema,
        roomType: { type: SchemaType.STRING, description: "Raumtyp: living room, bedroom, kitchen, dining room, home office, bathroom, kids room" } as FunctionDeclarationSchema,
        prompt: { type: SchemaType.STRING, description: "Eigene Anweisung z.B. 'Graues Sofa, Holztisch, warme Beleuchtung'" } as FunctionDeclarationSchema,
        saveToPropertyId: { type: SchemaType.STRING, description: "Optional: Property-ID zu der das fertige Bild gespeichert werden soll" } as FunctionDeclarationSchema,
      }
    }
  },
  export_data: {
    name: "export_data",
    description: "Exports CRM data (leads, properties, or both) as a downloadable CSV or Excel file. Returns a download link the user can click. Use when the user asks to export, download, or save data as a file.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: { type: SchemaType.STRING, description: "What to export: 'leads', 'properties', or 'all' (both in one Excel file with two sheets)" } as FunctionDeclarationSchema,
        format: { type: SchemaType.STRING, description: "File format: 'csv' (only for leads or properties separately) or 'xlsx' (Excel, supports 'all'). Default: 'xlsx'" } as FunctionDeclarationSchema,
      },
      required: ["type"]
    }
  },
};

// Exposé Tools for Mivo - Full palette of block types
export const EXPOSE_TOOLS = {
  create_expose_block: {
    name: "create_expose_block",
    description: `Creates a new block in an Exposé or Template. Available block types:
    
HEADER:
- hero: Hero image with title/subtitle overlay. Fields: title, subtitle, imageUrl

CONTENT:
- text: Text paragraph. Fields: title, content, style (normal/highlight/quote)
- features: Feature/amenity list. Fields: title, items (array of strings)
- highlights: Highlight bullet points. Fields: title, items (array of strings)
- twoColumn: Two-column layout. Fields: leftContent, rightContent
- quote: Testimonial/quote. Fields: text, author

MEDIA:
- gallery: Image gallery. Fields: images (array of URLs), columns (2 or 3)
- floorplan: Floor plan image. Fields: title, imageUrl
- video: Embedded video. Fields: title, videoUrl
- virtualTour: 360° tour embed. Fields: title, tourUrl

DATA:
- stats: Key statistics. Fields: items (array of {label, value})
- priceTable: Price breakdown. Fields: title, items (array of {label, value})
- energyCertificate: Energy info. Fields: energyClass, consumption
- location: Location/map. Fields: title, address, description
- contact: Makler/Agent contact. Fields: title, name, email, phone
- leadInfo: Lead/customer personalization. Fields: title, leadName, leadEmail, leadPhone, showGreeting

CTA:
- cta: Call-to-action button. Fields: title, buttonText, buttonUrl
- pageBreak: Manual page break (no fields)

TEMPLATE VARIABLES (use these in text fields for templates):
Property: {{property.title}}, {{property.address}}, {{property.city}}, {{property.price}}, {{property.rooms}}, {{property.area}}, {{property.bedrooms}}, {{property.bathrooms}}, {{property.yearBuilt}}, {{property.propertyType}}, {{property.energyClass}}, {{property.description}}
Agent: {{user.name}}, {{user.email}}, {{user.phone}}, {{company.name}}
Lead: {{lead.name}}, {{lead.firstName}}, {{lead.lastName}}, {{lead.email}}, {{lead.phone}}, {{lead.greeting}}
Date: {{date.today}}, {{date.year}}`,
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé to modify (use for actual exposés)" } as FunctionDeclarationSchema,
        templateId: { type: SchemaType.STRING, description: "ID of the Template to modify (use for templates)" } as FunctionDeclarationSchema,
        blockType: { 
          type: SchemaType.STRING, 
          description: "Type of block: hero, text, features, highlights, twoColumn, quote, gallery, floorplan, video, virtualTour, stats, priceTable, energyCertificate, location, contact, cta" 
        } as FunctionDeclarationSchema,
        position: { type: SchemaType.NUMBER, description: "Position index where to insert the block (0-based). Omit to append at end." } as FunctionDeclarationSchema,
        // Common fields
        title: { type: SchemaType.STRING, description: "Title for the block" } as FunctionDeclarationSchema,
        content: { type: SchemaType.STRING, description: "Text content for text blocks" } as FunctionDeclarationSchema,
        subtitle: { type: SchemaType.STRING, description: "Subtitle for hero blocks" } as FunctionDeclarationSchema,
        imageUrl: { type: SchemaType.STRING, description: "Image URL for hero, floorplan blocks" } as FunctionDeclarationSchema,
        // List fields
        items: { type: SchemaType.STRING, description: "JSON array of items. For features/highlights: [\"item1\", \"item2\"]. For stats/priceTable: [{\"label\":\"Zimmer\",\"value\":\"3\"}]" } as FunctionDeclarationSchema,
        // Gallery fields
        images: { type: SchemaType.STRING, description: "JSON array of image URLs for gallery: [\"url1\", \"url2\"]" } as FunctionDeclarationSchema,
        columns: { type: SchemaType.NUMBER, description: "Number of columns for gallery (2 or 3)" } as FunctionDeclarationSchema,
        // Two column fields
        leftContent: { type: SchemaType.STRING, description: "Left column content for twoColumn block" } as FunctionDeclarationSchema,
        rightContent: { type: SchemaType.STRING, description: "Right column content for twoColumn block" } as FunctionDeclarationSchema,
        // Quote fields
        text: { type: SchemaType.STRING, description: "Quote text" } as FunctionDeclarationSchema,
        author: { type: SchemaType.STRING, description: "Quote author" } as FunctionDeclarationSchema,
        // Video/Tour fields
        videoUrl: { type: SchemaType.STRING, description: "Video URL for video block" } as FunctionDeclarationSchema,
        tourUrl: { type: SchemaType.STRING, description: "Virtual tour URL" } as FunctionDeclarationSchema,
        // Energy fields
        energyClass: { type: SchemaType.STRING, description: "Energy efficiency class (A+, A, B, C, D, E, F, G, H)" } as FunctionDeclarationSchema,
        consumption: { type: SchemaType.STRING, description: "Energy consumption value" } as FunctionDeclarationSchema,
        // Location fields
        address: { type: SchemaType.STRING, description: "Address for location block" } as FunctionDeclarationSchema,
        description: { type: SchemaType.STRING, description: "Description for location block" } as FunctionDeclarationSchema,
        // Contact fields (for agent/makler)
        name: { type: SchemaType.STRING, description: "Contact person name (agent)" } as FunctionDeclarationSchema,
        email: { type: SchemaType.STRING, description: "Contact email (agent)" } as FunctionDeclarationSchema,
        phone: { type: SchemaType.STRING, description: "Contact phone (agent)" } as FunctionDeclarationSchema,
        // Lead info fields (for personalization)
        leadName: { type: SchemaType.STRING, description: "Lead/customer name for personalization" } as FunctionDeclarationSchema,
        leadEmail: { type: SchemaType.STRING, description: "Lead email" } as FunctionDeclarationSchema,
        leadPhone: { type: SchemaType.STRING, description: "Lead phone" } as FunctionDeclarationSchema,
        showGreeting: { type: SchemaType.BOOLEAN, description: "Show personalized greeting (default: true)" } as FunctionDeclarationSchema,
        // CTA fields
        buttonText: { type: SchemaType.STRING, description: "Button text for CTA" } as FunctionDeclarationSchema,
        buttonUrl: { type: SchemaType.STRING, description: "Button URL for CTA" } as FunctionDeclarationSchema,
        // Style
        style: { type: SchemaType.STRING, description: "Style variant: normal, highlight, quote (for text blocks)" } as FunctionDeclarationSchema,
      },
      required: ["blockType"]
    }
  },
  update_expose_block: {
    name: "update_expose_block",
    description: "Updates an existing block in an Exposé or Template. Use this to modify content, images, or styling of a block.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé (use for actual exposés)" } as FunctionDeclarationSchema,
        templateId: { type: SchemaType.STRING, description: "ID of the Template (use for templates)" } as FunctionDeclarationSchema,
        blockId: { type: SchemaType.STRING, description: "ID of the block to update" } as FunctionDeclarationSchema,
        // All possible fields that can be updated
        title: { type: SchemaType.STRING, description: "New title" } as FunctionDeclarationSchema,
        content: { type: SchemaType.STRING, description: "New text content" } as FunctionDeclarationSchema,
        subtitle: { type: SchemaType.STRING, description: "New subtitle" } as FunctionDeclarationSchema,
        imageUrl: { type: SchemaType.STRING, description: "New image URL" } as FunctionDeclarationSchema,
        items: { type: SchemaType.STRING, description: "JSON array of items" } as FunctionDeclarationSchema,
        images: { type: SchemaType.STRING, description: "JSON array of image URLs" } as FunctionDeclarationSchema,
        columns: { type: SchemaType.NUMBER, description: "Number of columns" } as FunctionDeclarationSchema,
        leftContent: { type: SchemaType.STRING, description: "Left column content" } as FunctionDeclarationSchema,
        rightContent: { type: SchemaType.STRING, description: "Right column content" } as FunctionDeclarationSchema,
        text: { type: SchemaType.STRING, description: "Quote text" } as FunctionDeclarationSchema,
        author: { type: SchemaType.STRING, description: "Quote author" } as FunctionDeclarationSchema,
        videoUrl: { type: SchemaType.STRING, description: "Video URL" } as FunctionDeclarationSchema,
        tourUrl: { type: SchemaType.STRING, description: "Virtual tour URL" } as FunctionDeclarationSchema,
        energyClass: { type: SchemaType.STRING, description: "Energy class" } as FunctionDeclarationSchema,
        consumption: { type: SchemaType.STRING, description: "Energy consumption" } as FunctionDeclarationSchema,
        address: { type: SchemaType.STRING, description: "Address" } as FunctionDeclarationSchema,
        description: { type: SchemaType.STRING, description: "Description" } as FunctionDeclarationSchema,
        name: { type: SchemaType.STRING, description: "Contact name" } as FunctionDeclarationSchema,
        email: { type: SchemaType.STRING, description: "Contact email" } as FunctionDeclarationSchema,
        phone: { type: SchemaType.STRING, description: "Contact phone" } as FunctionDeclarationSchema,
        buttonText: { type: SchemaType.STRING, description: "Button text" } as FunctionDeclarationSchema,
        buttonUrl: { type: SchemaType.STRING, description: "Button URL" } as FunctionDeclarationSchema,
        style: { type: SchemaType.STRING, description: "Style variant (normal, highlight, quote)" } as FunctionDeclarationSchema,
      },
      required: ["blockId"]
    }
  },
  delete_expose_block: {
    name: "delete_expose_block",
    description: "Removes a block from an Exposé or Template.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé (use for actual exposés)" } as FunctionDeclarationSchema,
        templateId: { type: SchemaType.STRING, description: "ID of the Template (use for templates)" } as FunctionDeclarationSchema,
        blockId: { type: SchemaType.STRING, description: "ID of the block to delete" } as FunctionDeclarationSchema,
      },
      required: ["blockId"]
    }
  },
  reorder_expose_blocks: {
    name: "reorder_expose_blocks",
    description: "Reorders blocks in an Exposé or Template by moving a block to a new position.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé (use for actual exposés)" } as FunctionDeclarationSchema,
        templateId: { type: SchemaType.STRING, description: "ID of the Template (use for templates)" } as FunctionDeclarationSchema,
        blockId: { type: SchemaType.STRING, description: "ID of the block to move" } as FunctionDeclarationSchema,
        newPosition: { type: SchemaType.NUMBER, description: "New position index (0-based)" } as FunctionDeclarationSchema,
      },
      required: ["blockId", "newPosition"]
    }
  },
  generate_expose_text: {
    name: "generate_expose_text",
    description: "Generates professional marketing text for a property based on its data. Returns the generated text.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property to generate text for" } as FunctionDeclarationSchema,
        textType: { 
          type: SchemaType.STRING, 
          description: "Type of text: description (full property description), headline (catchy title), highlights (bullet points), location (area description)" 
        } as FunctionDeclarationSchema,
        tone: { 
          type: SchemaType.STRING, 
          description: "Tone of voice: professional, luxurious, friendly, modern" 
        } as FunctionDeclarationSchema,
        maxLength: { type: SchemaType.NUMBER, description: "Maximum character length" } as FunctionDeclarationSchema,
      },
      required: ["propertyId", "textType"]
    }
  },
  get_expose_status: {
    name: "get_expose_status",
    description: "Gets the current status and structure of an Exposé including all blocks.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé" } as FunctionDeclarationSchema,
      },
      required: ["exposeId"]
    }
  },
  set_expose_status: {
    name: "set_expose_status",
    description: "Sets the status of an Exposé to DRAFT or PUBLISHED.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé" } as FunctionDeclarationSchema,
        status: { type: SchemaType.STRING, description: "New status: DRAFT or PUBLISHED" } as FunctionDeclarationSchema,
      },
      required: ["exposeId", "status"]
    }
  },
  create_full_expose: {
    name: "create_full_expose",
    description: "Creates a complete professional Exposé or Template with all necessary blocks. Use templateId for templates (with placeholder variables like {{property.title}}) or exposeId for real exposes with property data. IMPORTANT: When working on a template, always use templateId, NOT exposeId.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé to populate (for real exposes, not templates)" } as FunctionDeclarationSchema,
        templateId: { type: SchemaType.STRING, description: "ID of the Template to populate (for templates - uses placeholder variables)" } as FunctionDeclarationSchema,
        style: { 
          type: SchemaType.STRING, 
          description: "Visual style: luxurious (elegant, high-end), modern (clean, minimalist), warm (friendly, inviting), professional (business-like)" 
        } as FunctionDeclarationSchema,
        includeBlocks: { 
          type: SchemaType.STRING, 
          description: "Comma-separated list of blocks to include: hero,stats,description,highlights,gallery,floorplan,location,features,energyCertificate,priceTable,contact,cta" 
        } as FunctionDeclarationSchema,
        theme: { 
          type: SchemaType.STRING, 
          description: "Color theme: default, modern, elegant, minimal, luxury" 
        } as FunctionDeclarationSchema,
        customInstructions: { type: SchemaType.STRING, description: "Any additional instructions from the user" } as FunctionDeclarationSchema,
      },
      required: []
    }
  },
  set_expose_theme: {
    name: "set_expose_theme",
    description: "Changes the color theme of an Exposé.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé" } as FunctionDeclarationSchema,
        theme: { 
          type: SchemaType.STRING, 
          description: "Theme name: default, modern, elegant, minimal, luxury" 
        } as FunctionDeclarationSchema,
      },
      required: ["exposeId", "theme"]
    }
  },
  clear_expose_blocks: {
    name: "clear_expose_blocks",
    description: "Removes all blocks from an Exposé or Template to start fresh.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé (use for actual exposés)" } as FunctionDeclarationSchema,
        templateId: { type: SchemaType.STRING, description: "ID of the Template (use for templates)" } as FunctionDeclarationSchema,
      }
    }
  },
  get_template: {
    name: "get_template",
    description: "Gets the current structure of a Template including all blocks.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        templateId: { type: SchemaType.STRING, description: "ID of the Template" } as FunctionDeclarationSchema,
      },
      required: ["templateId"]
    }
  },
  update_template: {
    name: "update_template",
    description: "Updates template metadata like name or theme.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        templateId: { type: SchemaType.STRING, description: "ID of the Template" } as FunctionDeclarationSchema,
        name: { type: SchemaType.STRING, description: "New template name" } as FunctionDeclarationSchema,
        theme: { type: SchemaType.STRING, description: "Theme: default, modern, elegant, minimal, luxury" } as FunctionDeclarationSchema,
        isDefault: { type: SchemaType.BOOLEAN, description: "Set as default template" } as FunctionDeclarationSchema,
      },
      required: ["templateId"]
    }
  },
  get_email_signature: {
    name: "get_email_signature",
    description: "Reads the current email signature and signature name of the user from settings.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  update_email_signature: {
    name: "update_email_signature",
    description: "Updates the user's email signature and/or signature name in the email settings. The signature supports HTML formatting. After calling this tool the settings page will auto-reload.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        emailSignature: { type: SchemaType.STRING, description: "The HTML email signature content" } as FunctionDeclarationSchema,
        emailSignatureName: { type: SchemaType.STRING, description: "Optional name/label for the signature (e.g. 'Geschäftlich')" } as FunctionDeclarationSchema,
      }
    }
  }
};

export class AiToolExecutor {
  static async execute(toolName: string, args: any, tenantId: string, userId?: string): Promise<any> {
    console.log(`Executing tool ${toolName} for tenant ${tenantId} with args:`, args);

    switch (toolName) {
      // === SEMANTIC SEARCH (RAG) ===
      case 'semantic_search': {
        const { query, entityType = 'all', limit = 5 } = args;
        
        const results = await EmbeddingService.semanticSearch(query, tenantId, {
          entityType: entityType as 'property' | 'lead' | 'all',
          limit: Math.min(limit, 20),
          minScore: 0.25,
        });

        if (results.length === 0) {
          return { message: `Keine semantisch passenden Ergebnisse für "${query}" gefunden.` };
        }

        // Enrich results with full entity data
        const enriched = await Promise.all(results.map(async (r) => {
          if (r.entityType === 'property') {
            const prop = await prisma.property.findUnique({ 
              where: { id: r.entityId },
              select: { id: true, title: true, address: true, city: true, price: true, rooms: true, area: true, status: true, propertyType: true }
            });
            return { ...r, entity: prop };
          } else if (r.entityType === 'lead') {
            const lead = await prisma.lead.findUnique({ 
              where: { id: r.entityId },
              select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, source: true, budgetMin: true, budgetMax: true }
            });
            return { ...r, entity: lead };
          }
          return r;
        }));

        return {
          message: `${results.length} Ergebnisse gefunden (Relevanz ${(results[0].score * 100).toFixed(0)}%-${(results[results.length - 1].score * 100).toFixed(0)}%):`,
          results: enriched.map(r => ({
            type: r.entityType,
            id: r.entityId,
            score: `${(r.score * 100).toFixed(0)}%`,
            entity: (r as any).entity || null,
            summary: r.content.substring(0, 200),
          }))
        };
      }

      // === MEMORY & CONTEXT TOOLS ===
      case 'search_chat_history': {
        if (!userId) return { error: 'Kein Benutzer-Kontext verfügbar.' };
        const { query, includeArchived = true } = args;
        
        const results = await ConversationMemory.searchChatHistory(userId, query, {
          includeArchived,
          limit: 15
        });

        if (results.length === 0) {
          return { message: `Keine Ergebnisse für "${query}" in der Chat-Historie gefunden.` };
        }

        return {
          message: `${results.length} relevante Nachrichten gefunden:`,
          results: results.map(r => ({
            role: r.role,
            content: r.content.substring(0, 300) + (r.content.length > 300 ? '...' : ''),
            date: new Date(r.date).toLocaleDateString('de-DE'),
            archived: r.isArchived ? 'Archiviert' : 'Aktuell'
          }))
        };
      }

      case 'get_conversation_context': {
        if (!userId) return { error: 'Kein Benutzer-Kontext verfügbar.' };
        const { topic } = args;
        
        const contexts = await ConversationMemory.getContextAroundTopic(userId, topic, 5);

        if (contexts.length === 0) {
          return { message: `Kein Kontext zu "${topic}" gefunden.` };
        }

        return {
          message: `${contexts.length} Konversationen zu "${topic}" gefunden:`,
          contexts: contexts.map(c => ({
            messages: c.context.map(m => ({
              role: m.role,
              content: m.content.substring(0, 200) + (m.content.length > 200 ? '...' : ''),
              date: new Date(m.date).toLocaleDateString('de-DE')
            }))
          }))
        };
      }

      case 'get_memory_summary': {
        if (!userId) return { error: 'Kein Benutzer-Kontext verfügbar.' };
        
        const summary = await ConversationMemory.getLongTermMemory(userId);

        if (!summary) {
          return { message: 'Noch keine Langzeit-Erinnerungen vorhanden. Diese werden automatisch erstellt, je mehr wir miteinander sprechen.' };
        }

        return {
          message: 'Langzeit-Gedächtnis:',
          summary
        };
      }

      case 'get_last_conversation': {
        if (!userId) return { error: 'Kein Benutzer-Kontext verfügbar.' };
        const { limit = 20 } = args;
        
        const messages = await ConversationMemory.getLastArchivedConversation(userId, limit);

        if (messages.length === 0) {
          return { message: 'Keine vorherige Unterhaltung gefunden. Dies ist unser erstes Gespräch oder der Verlauf wurde gelöscht.' };
        }

        return {
          message: `Letzte Unterhaltung (${messages.length} Nachrichten):`,
          conversation: messages.map(m => ({
            role: m.role === 'USER' ? 'Du' : 'Mivo',
            content: m.content.substring(0, 500) + (m.content.length > 500 ? '...' : ''),
            date: new Date(m.date).toLocaleDateString('de-DE')
          }))
        };
      }

      // === CRM TOOLS ===
      case 'create_lead': {
        const { 
          salutation, formalAddress, firstName, lastName, email, phone, message,
          budgetMin, budgetMax, preferredType, preferredLocation,
          minRooms, minArea, timeFrame, financingStatus, source
        } = args;
        
        const newLead = await getPrisma().lead.create({
          data: {
            salutation: salutation || 'NONE',
            formalAddress: formalAddress !== undefined ? formalAddress : true,
            firstName,
            lastName,
            email,
            phone,
            tenantId,
            budgetMin,
            budgetMax,
            preferredType,
            preferredLocation,
            minRooms,
            minArea,
            timeFrame,
            financingStatus,
            source,
            messages: message ? {
              create: { role: 'USER', content: message }
            } : undefined,
            activities: {
              create: {
                type: 'LEAD_CREATED',
                description: `Lead ${firstName} ${lastName} erstellt`,
                createdBy: userId
              }
            }
          }
        });
        return `Lead "${firstName} ${lastName}" (${email || 'keine E-Mail'}) wurde angelegt. ID: ${newLead.id}`;
      }

      case 'get_leads': {
        const { status, search, limit = 50 } = args;
        
        // Build search conditions - split search into parts to match "Anna Schmidt" against firstName + lastName
        let searchConditions: any = {};
        if (search) {
          const searchParts = search.trim().split(/\s+/);
          
          if (searchParts.length >= 2) {
            // Multi-word search: try matching firstName + lastName combination AND individual parts
            searchConditions = {
              OR: [
                // Match first word as firstName AND second word as lastName
                {
                  AND: [
                    { firstName: { contains: searchParts[0], mode: 'insensitive' as const } },
                    { lastName: { contains: searchParts.slice(1).join(' '), mode: 'insensitive' as const } },
                  ]
                },
                // Also try reversed (lastName first)
                {
                  AND: [
                    { lastName: { contains: searchParts[0], mode: 'insensitive' as const } },
                    { firstName: { contains: searchParts.slice(1).join(' '), mode: 'insensitive' as const } },
                  ]
                },
                // Individual parts match any field
                ...searchParts.map((part: string) => ({ firstName: { contains: part, mode: 'insensitive' as const } })),
                ...searchParts.map((part: string) => ({ lastName: { contains: part, mode: 'insensitive' as const } })),
                { email: { contains: search, mode: 'insensitive' as const } },
              ]
            };
          } else {
            // Single-word search
            searchConditions = {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { phone: { contains: search, mode: 'insensitive' as const } },
              ]
            };
          }
        }
        
        return await getPrisma().lead.findMany({
          where: { 
            tenantId,
            ...(status && { status }),
            ...searchConditions
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
            notes: true,
            source: true,
            salutation: true,
            formalAddress: true,
            budgetMin: true,
            budgetMax: true,
            preferredType: true,
            preferredLocation: true,
            minRooms: true,
            minArea: true,
            timeFrame: true,
            financingStatus: true,
            documents: true,
            alternateEmails: true,
            createdAt: true,
            updatedAt: true,
            propertyId: true,
            assignedToId: true,
            property: {
              select: { id: true, title: true, address: true }
            }
          }
        });
      }

      case 'get_lead': {
        const { leadId } = args;
        return await getPrisma().lead.findFirst({
          where: { id: leadId, tenantId },
          include: { 
            messages: { orderBy: { createdAt: 'desc' }, take: 20 },
            property: { select: { id: true, title: true, address: true, propertyType: true, salePrice: true, rentCold: true } },
            activities: { orderBy: { createdAt: 'desc' }, take: 10, select: { type: true, description: true, createdAt: true } }
          }
        });
      }

      case 'update_lead': {
        const { leadId, ...updateData } = args;
        
        // Verify tenant ownership
        const currentLead = await getPrisma().lead.findFirst({ where: { id: leadId, tenantId } });
        if (!currentLead) return 'Der Lead wurde nicht gefunden.';
        
        const updatedLead = await getPrisma().lead.update({
          where: { id: leadId },
          data: updateData,
          select: { id: true, firstName: true, lastName: true, email: true, status: true }
        });
        
        // Create activities for important changes
        if (currentLead && updateData.status && currentLead.status !== updateData.status) {
          await getPrisma().leadActivity.create({
            data: {
              leadId,
              type: 'STATUS_CHANGED',
              description: `Status geändert: ${currentLead.status} → ${updateData.status}`,
              createdBy: userId
            }
          });
        }
        
        if (updateData.notes && currentLead?.notes !== updateData.notes) {
          await getPrisma().leadActivity.create({
            data: {
              leadId,
              type: 'NOTE_ADDED',
              description: 'Notiz aktualisiert',
              createdBy: userId
            }
          });
        }
        
        return `Lead "${updatedLead.firstName} ${updatedLead.lastName}" wurde aktualisiert.`;
      }

      case 'delete_lead': {
        const { leadId } = args;
        const db = getPrisma();
        // Verify tenant ownership
        const leadToDelete = await db.lead.findFirst({ where: { id: leadId, tenantId } });
        if (!leadToDelete) return 'Der Lead wurde nicht gefunden.';
        // Explicitly delete all dependent records, then delete the lead
        await db.$transaction([
          db.message.deleteMany({ where: { leadId } }),
          db.leadActivity.deleteMany({ where: { leadId } }),
          db.email.updateMany({ where: { leadId }, data: { leadId: null } }),
          db.mivoPendingAction.updateMany({ where: { leadId }, data: { leadId: null } }),
          db.lead.delete({ where: { id: leadId } }),
        ]);
        const deletedName = [leadToDelete.firstName, leadToDelete.lastName].filter(Boolean).join(' ') || leadToDelete.email;
        return `Der Lead "${deletedName}" wurde gelöscht.`;
      }

      case 'delete_all_leads': {
        const { confirmed } = args;
        if (!confirmed) {
          return 'Löschung abgebrochen. Bitte bestätige mit confirmed: true.';
        }
        const db = getPrisma();
        // Get all lead IDs for this tenant
        const leads = await db.lead.findMany({ where: { tenantId }, select: { id: true } });
        const leadIds = leads.map(l => l.id);
        if (leadIds.length === 0) {
          return 'Es gibt keine Leads zum Löschen.';
        }
        // Explicitly delete all dependent records, then delete leads
        await db.$transaction([
          db.message.deleteMany({ where: { leadId: { in: leadIds } } }),
          db.leadActivity.deleteMany({ where: { leadId: { in: leadIds } } }),
          db.email.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
          db.mivoPendingAction.updateMany({ where: { leadId: { in: leadIds } }, data: { leadId: null } }),
          db.lead.deleteMany({ where: { tenantId } }),
        ]);
        return `${leadIds.length} Lead(s) wurden gelöscht.`;
      }

      case 'create_property':
        return await executeCreateProperty(args, tenantId);

      case 'get_properties': {
        const { limit = 50 } = args;
        return await getPrisma().property.findMany({
          where: { tenantId },
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, title: true, address: true, city: true, zipCode: true,
            propertyType: true, marketingType: true, status: true,
            salePrice: true, rentCold: true, rooms: true, area: true,
            createdAt: true,
          }
        });
      }

      case 'get_property': {
        const { propertyId } = args;
        return await getPrisma().property.findFirst({
          where: { id: propertyId, tenantId },
          select: {
            id: true, title: true, address: true, city: true, zipCode: true,
            propertyType: true, marketingType: true, status: true,
            salePrice: true, rentCold: true, rentWarm: true,
            rooms: true, bedrooms: true, bathrooms: true, area: true, plotArea: true,
            floor: true, totalFloors: true, yearBuilt: true,
            description: true, features: true, energyEfficiencyClass: true,
            images: true, videos: true, virtualTour: true,
            createdAt: true, updatedAt: true,
          }
        });
      }

      case 'update_property': {
        const { propertyId, ...updateData } = args;
        const propToUpdate = await getPrisma().property.findFirst({ where: { id: propertyId, tenantId } });
        if (!propToUpdate) return 'Das Objekt wurde nicht gefunden.';
        const updated = await getPrisma().property.update({
          where: { id: propertyId },
          data: updateData,
          select: { id: true, title: true, address: true }
        });
        return `Objekt "${updated.title}" (${updated.address || ''}) wurde aktualisiert.`;
      }

      case 'delete_property': {
        const { propertyId } = args;
        const db = getPrisma();
        // Verify tenant ownership
        const prop = await db.property.findFirst({ where: { id: propertyId, tenantId } });
        if (!prop) return 'Das Objekt wurde nicht gefunden.';
        // Clean up references, then delete
        await db.$transaction([
          db.expose.deleteMany({ where: { propertyId } }),
          db.lead.updateMany({ where: { propertyId }, data: { propertyId: null } }),
          db.leadActivity.updateMany({ where: { propertyId }, data: { propertyId: null } }),
          db.property.delete({ where: { id: propertyId } }),
        ]);
        return `Das Objekt "${prop.title}" wurde gelöscht.`;
      }

      case 'delete_all_properties': {
        const { confirmed } = args;
        if (!confirmed) {
          return 'Löschung abgebrochen. Bitte bestätige mit confirmed: true.';
        }
        
        const db = getPrisma();
        const properties = await db.property.findMany({ 
          where: { tenantId },
          select: { id: true }
        });
        const propertyIds = properties.map(p => p.id);
        
        if (propertyIds.length === 0) {
          return 'Es gibt keine Objekte zum Löschen.';
        }
        
        // Clean up references in a transaction
        await db.$transaction([
          // Delete exposes linked to these properties
          db.expose.deleteMany({ where: { propertyId: { in: propertyIds } } }),
          // Unlink leads (DON'T delete them!)
          db.lead.updateMany({ where: { propertyId: { in: propertyIds } }, data: { propertyId: null } }),
          // Unlink lead activities from properties
          db.leadActivity.updateMany({ where: { propertyId: { in: propertyIds } }, data: { propertyId: null } }),
          // Delete properties (PropertyAssignment cascades automatically)
          db.property.deleteMany({ where: { tenantId } }),
        ]);
        
        return `${propertyIds.length} Objekt(e) wurden gelöscht. Verknüpfte Leads wurden beibehalten.`;
      }

      case 'upload_images_to_property': {
        const { propertyId, isFloorplan = false, _uploadedFiles, imageUrls: imageUrlsArg } = args;
        
        // Accept URLs from: (1) current-message attachments, (2) URLs passed explicitly by AI from context
        const extraUrls = imageUrlsArg
          ? String(imageUrlsArg).split(',').map((u: string) => u.trim()).filter(Boolean)
          : [];
        const filesToUpload: string[] = [...(_uploadedFiles || []), ...extraUrls];
        
        if (filesToUpload.length === 0) {
          return 'Keine Bilder zum Hochladen gefunden. Bitte hänge zuerst Bilder an deine Nachricht an.';
        }
        
        // Verify property belongs to tenant
        const property = await getPrisma().property.findFirst({ 
          where: { id: propertyId, tenantId } 
        });
        
        if (!property) {
          return `Das Objekt wurde nicht gefunden.`;
        }
        
        // Add uploaded files to property
        const arrayField = isFloorplan ? 'floorplans' : 'images';
        const currentArray = isFloorplan ? property.floorplans : property.images;
        const updatedArray = [...currentArray, ...filesToUpload];
        
        await getPrisma().property.update({
          where: { id: propertyId },
          data: { [arrayField]: updatedArray }
        });
        
        const typeLabel = isFloorplan ? 'Grundriss(e)' : 'Bild(er)';
        return `${filesToUpload.length} ${typeLabel} wurden zum Objekt "${property.title}" hinzugefügt.`;
      }

      case 'upload_documents_to_lead': {
        const { leadId, _uploadedFiles, fileUrls: fileUrlsArg } = args;
        
        // Accept URLs from: (1) current-message attachments, (2) URLs passed explicitly by AI from context
        const extraUrls = fileUrlsArg
          ? String(fileUrlsArg).split(',').map((u: string) => u.trim()).filter(Boolean)
          : [];
        const filesToUpload: string[] = [...(_uploadedFiles || []), ...extraUrls];
        
        if (filesToUpload.length === 0) {
          return 'Keine Dateien zum Hochladen gefunden. Bitte hänge zuerst Dateien an deine Nachricht an.';
        }
        
        // Verify lead belongs to tenant
        const lead = await getPrisma().lead.findFirst({ 
          where: { id: leadId, tenantId } 
        });
        
        if (!lead) {
          return `Der Lead wurde nicht gefunden.`;
        }
        
        // Build document entries
        const existingDocs = (lead.documents as any[]) || [];
        const newDocs = filesToUpload.map((url: string) => ({
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: url.split('/').pop() || 'Dokument',
          url: url,
          type: url.match(/\.(pdf)$/i) ? 'application/pdf' 
              : url.match(/\.(doc|docx)$/i) ? 'application/msword'
              : url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/' + (url.match(/\.(\w+)$/)?.[1] || 'jpeg')
              : 'application/octet-stream',
          size: 0,
          uploadedAt: new Date().toISOString(),
        }));
        
        await getPrisma().lead.update({
          where: { id: leadId },
          data: { documents: [...existingDocs, ...newDocs] }
        });
        
        const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email;
        return `${newDocs.length} Dokument(e) wurden zum Lead "${leadName}" hinzugefügt.`;
      }

      case 'get_property_images': {
        const { propertyId } = args;
        
        const property = await getPrisma().property.findFirst({ 
          where: { id: propertyId, tenantId },
          select: { id: true, title: true, images: true, floorplans: true }
        });
        
        if (!property) {
          return `Das Objekt wurde nicht gefunden.`;
        }
        
        return {
          propertyId: property.id,
          title: property.title,
          images: property.images,
          imageCount: property.images.length,
          floorplans: property.floorplans,
          floorplanCount: property.floorplans.length,
        };
      }

      case 'delete_property_image': {
        const { propertyId, imageUrl, isFloorplan = false } = args;
        
        const property = await getPrisma().property.findFirst({ 
          where: { id: propertyId, tenantId } 
        });
        
        if (!property) {
          return `Das Objekt wurde nicht gefunden.`;
        }
        
        const arrayField = isFloorplan ? 'floorplans' : 'images';
        const currentArray = isFloorplan ? property.floorplans : property.images;
        
        if (!currentArray.includes(imageUrl)) {
          return `Bild "${imageUrl}" nicht im Objekt gefunden.`;
        }
        
        const updatedArray = currentArray.filter(url => url !== imageUrl);
        
        await getPrisma().property.update({
          where: { id: propertyId },
          data: { [arrayField]: updatedArray }
        });
        
        const typeLabel = isFloorplan ? 'Grundriss' : 'Bild';
        return `${typeLabel} wurde aus "${property.title}" gelöscht.`;
      }

      case 'delete_all_property_images': {
        const { propertyId, isFloorplan = false, confirmed } = args;
        
        if (!confirmed) {
          return 'Löschung abgebrochen. Bitte bestätige mit confirmed: true.';
        }
        
        const property = await getPrisma().property.findFirst({ 
          where: { id: propertyId, tenantId } 
        });
        
        if (!property) {
          return `Das Objekt wurde nicht gefunden.`;
        }
        
        const arrayField = isFloorplan ? 'floorplans' : 'images';
        const count = isFloorplan ? property.floorplans.length : property.images.length;
        
        await getPrisma().property.update({
          where: { id: propertyId },
          data: { [arrayField]: [] }
        });
        
        const typeLabel = isFloorplan ? 'Grundrisse' : 'Bilder';
        return `${count} ${typeLabel} wurden aus "${property.title}" gelöscht.`;
      }

      case 'move_image_to_floorplan': {
        const { propertyId, imageUrl, toFloorplan } = args;
        
        const property = await getPrisma().property.findFirst({ 
          where: { id: propertyId, tenantId } 
        });
        
        if (!property) {
          return `Das Objekt wurde nicht gefunden.`;
        }
        
        const sourceArray = toFloorplan ? property.images : property.floorplans;
        const targetArray = toFloorplan ? property.floorplans : property.images;
        
        if (!sourceArray.includes(imageUrl)) {
          const sourceLabel = toFloorplan ? 'Bildern' : 'Grundrissen';
          return `Bild "${imageUrl}" nicht in ${sourceLabel} gefunden.`;
        }
        
        const updatedSource = sourceArray.filter(url => url !== imageUrl);
        const updatedTarget = [...targetArray, imageUrl];
        
        await getPrisma().property.update({
          where: { id: propertyId },
          data: toFloorplan 
            ? { images: updatedSource, floorplans: updatedTarget }
            : { floorplans: updatedSource, images: updatedTarget }
        });
        
        const targetLabel = toFloorplan ? 'Grundrisse' : 'Bilder';
        return `Bild wurde zu ${targetLabel} verschoben.`;
      }

      case 'search_properties': {
        const { query, minPrice, maxPrice } = args;
        
        const where: any = { tenantId };
        if (query) {
          where.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { address: { contains: query, mode: 'insensitive' } },
            { city: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ];
        }
        if (minPrice !== undefined || maxPrice !== undefined) {
          where.price = {};
          if (minPrice !== undefined) where.price.gte = minPrice;
          if (maxPrice !== undefined) where.price.lte = maxPrice;
        }
        
        return await getPrisma().property.findMany({
          where,
          take: 50,
          orderBy: { createdAt: 'desc' }
        });
      }

      // === COMPANY INFO TOOL ===
      case 'get_company_info': {
        const tenant = await getPrisma().tenant.findUnique({
          where: { id: tenantId },
          select: {
            name: true, description: true, phone: true, email: true,
            website: true, logoUrl: true, services: true, regions: true,
            slogan: true, address: true, foundedYear: true, teamSize: true,
            _count: { select: { users: true, leads: true, properties: true } }
          }
        });
        if (!tenant) return 'Firmendaten nicht gefunden.';
        const info: any = { name: tenant.name };
        if (tenant.description) info.beschreibung = tenant.description;
        if (tenant.slogan) info.slogan = tenant.slogan;
        if (tenant.services.length > 0) info.dienstleistungen = tenant.services;
        if (tenant.regions.length > 0) info.regionen = tenant.regions;
        if (tenant.phone) info.telefon = tenant.phone;
        if (tenant.email) info.email = tenant.email;
        if (tenant.website) info.website = tenant.website;
        if (tenant.address) info.adresse = tenant.address;
        if (tenant.foundedYear) info.gruendungsjahr = tenant.foundedYear;
        if (tenant.teamSize) info.teamgroesse = tenant.teamSize;
        info.statistik = {
          mitarbeiter: tenant._count.users,
          leads: tenant._count.leads,
          objekte: tenant._count.properties,
        };
        return JSON.stringify(info);
      }

      // === TEAM & CONTACTS TOOLS ===
      case 'get_team_members': {
        const { search, includeMe } = args;
        
        const where: any = { tenantId };
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ];
        }
        
        const members = await getPrisma().user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
          orderBy: { name: 'asc' }
        });
        
        // Separate current user from other team members
        const currentUser = members.find(m => m.id === userId);
        const otherMembers = members.filter(m => m.id !== userId);
        
        return {
          currentUser: currentUser ? {
            id: currentUser.id,
            name: currentUser.name || currentUser.email.split('@')[0],
            email: currentUser.email,
            role: currentUser.role,
            isYou: true,
          } : null,
          teamMembers: otherMembers.map(m => ({
            id: m.id,
            name: m.name || m.email.split('@')[0],
            email: m.email,
            role: m.role,
          })),
          total: otherMembers.length,
          note: `Du bist ${currentUser?.name || 'der aktuelle Benutzer'} (${currentUser?.role}). Die anderen ${otherMembers.length} Teammitglieder sind oben aufgelistet.`
        };
      }

      case 'search_contacts': {
        const { query, limit = 10 } = args;
        
        const leads = await getPrisma().lead.findMany({
          where: {
            tenantId,
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
            ]
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
          },
          take: Math.min(limit, 50),
          orderBy: { createdAt: 'desc' }
        });
        
        return {
          total: leads.length,
          contacts: leads.map(l => ({
            id: l.id,
            name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Unbekannt',
            email: l.email,
            phone: l.phone,
            status: l.status,
            type: 'lead'
          }))
        };
      }

      // === EMAIL TOOLS ===
      case 'get_emails': {
        const { folder, limit = 50, unreadOnly, search } = args;
        
        const where: any = { tenantId };
        if (folder) where.folder = folder;
        if (unreadOnly) where.isRead = false;
        if (search) {
          where.OR = [
            { subject: { contains: search, mode: 'insensitive' } },
            { from: { contains: search, mode: 'insensitive' } },
            { fromName: { contains: search, mode: 'insensitive' } },
            { bodyText: { contains: search, mode: 'insensitive' } },
          ];
        }
        
        const emails = await getPrisma().email.findMany({
          where,
          orderBy: { receivedAt: 'desc' },
          take: Math.min(limit, 100),
          select: {
            id: true,
            from: true,
            fromName: true,
            to: true,
            subject: true,
            folder: true,
            isRead: true,
            hasAttachments: true,
            receivedAt: true,
            sentAt: true,
            leadId: true,
            bodyText: true,
          }
        });
        
        // Return summary for each email
        return {
          total: emails.length,
          emails: emails.map(e => ({
            id: e.id,
            from: e.fromName || e.from,
            to: e.to,
            subject: e.subject,
            folder: e.folder,
            isRead: e.isRead,
            hasAttachments: e.hasAttachments,
            date: (e.receivedAt || e.sentAt)?.toISOString(),
            preview: e.bodyText?.substring(0, 150) + (e.bodyText && e.bodyText.length > 150 ? '...' : ''),
            leadId: e.leadId,
          }))
        };
      }

      case 'get_email': {
        const { emailId } = args;
        const email = await getPrisma().email.findFirst({
          where: { id: emailId, tenantId }
        });
        if (!email) {
          return { error: "Diese Email wurde nicht gefunden." };
        }
        return {
          id: email.id,
          from: email.from,
          fromName: email.fromName,
          to: email.to,
          cc: email.cc,
          subject: email.subject,
          body: email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, ''),
          bodyHtml: email.bodyHtml,
          folder: email.folder,
          isRead: email.isRead,
          receivedAt: email.receivedAt?.toISOString(),
          sentAt: email.sentAt?.toISOString(),
          leadId: email.leadId,
        };
      }

      case 'draft_email': {
        const { to, subject, body, leadId } = args;
        
        // Get user's signature and full name
        const user = userId 
          ? await getPrisma().user.findUnique({
              where: { id: userId },
              include: { settings: true }
            })
          : await getPrisma().user.findFirst({
              where: { tenantId },
              include: { settings: true }
            });
        
        // Build full sender name from firstName + lastName
        const senderName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || '';
        
        let finalBody = body;
        if (user?.settings?.emailSignature) {
          finalBody = body + '\n\n' + user.settings.emailSignature;
        }
        
        const draft = await getPrisma().email.create({
          data: {
            tenantId,
            from: user?.email || 'noreply@immivo.ai',
            fromName: senderName || undefined,
            to: [to],
            subject,
            bodyText: finalBody,
            bodyHtml: finalBody.replace(/\n/g, '<br>'),
            folder: 'DRAFTS',
            isRead: true,
            leadId: leadId || undefined,
            providerData: { aiGenerated: true, generatedBy: 'mivo' },
          }
        });
        
        return { 
          success: true, 
          message: `Email-Entwurf erstellt an ${to} mit Betreff "${subject}".`,
          draftId: draft.id 
        };
      }

      case 'send_email': {
        const { to, subject, body, leadId } = args;
        
        // Get tenant settings for email provider
        const settings = await getPrisma().tenantSettings.findUnique({
          where: { tenantId }
        });
        
        // Get user's signature and full name
        const user = userId 
          ? await getPrisma().user.findUnique({
              where: { id: userId },
              include: { settings: true }
            })
          : await getPrisma().user.findFirst({
              where: { tenantId },
              include: { settings: true }
            });
        
        // Build full sender name from firstName + lastName
        const senderName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || '';
        const fromHeader = senderName 
          ? `"${senderName}" <${user?.email || 'noreply@immivo.ai'}>`
          : (user?.email || 'noreply@immivo.ai');
        
        let finalBody = body;
        if (user?.settings?.emailSignature) {
          finalBody = body + '\n\n' + user.settings.emailSignature;
        }
        
        if (!settings?.gmailConfig && !(settings as any)?.outlookMailConfig && !settings?.smtpConfig) {
          return { error: "Kein E-Mail-Konto verbunden. Bitte verbinde dein Postfach unter Einstellungen." };
        }
        
        const htmlBody = finalBody.replace(/\n/g, '<br>');
        let sendSuccess = false;
        let provider: 'GMAIL' | 'OUTLOOK' | 'SMTP' = 'GMAIL';
        
        // Try Gmail first
        if (settings?.gmailConfig) {
          try {
            const config = settings.gmailConfig as any;
            let accessToken = config.accessToken;
            let refreshToken = config.refreshToken;
            
            try { accessToken = encryptionService.decrypt(accessToken); } catch {}
            try { refreshToken = encryptionService.decrypt(refreshToken); } catch {}
            
            const googleConfig = getGoogleEmailConfig();
            const oauth2Client = new google.auth.OAuth2(
              googleConfig.clientId,
              googleConfig.clientSecret,
              googleConfig.redirectUri
            );
            oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
            
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            
            const emailLines = [
              `From: ${fromHeader}`,
              `To: ${to}`,
              `Subject: ${subject}`,
              'MIME-Version: 1.0',
              'Content-Type: text/html; charset=utf-8',
              '',
              htmlBody
            ];
            
            const rawMessage = Buffer.from(emailLines.join('\r\n'))
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');
            
            await gmail.users.messages.send({
              userId: 'me',
              requestBody: { raw: rawMessage }
            });
            
            sendSuccess = true;
            provider = 'GMAIL';
          } catch (gmailError: any) {
            console.error('Gmail send error, trying next provider:', gmailError.message);
          }
        }
        
        // Outlook fallback
        if (!sendSuccess && (settings as any)?.outlookMailConfig) {
          try {
            const outlookConfig = (settings as any).outlookMailConfig;
            let accessToken = outlookConfig.accessToken;
            try { accessToken = encryptionService.decrypt(accessToken); } catch {}
            
            const { EmailService } = require('./EmailService');
            await EmailService.sendOutlookEmail(
              accessToken,
              to,
              subject,
              finalBody,
              htmlBody
            );
            
            sendSuccess = true;
            provider = 'OUTLOOK';
          } catch (outlookError: any) {
            console.error('Outlook send error, trying SMTP:', outlookError.message);
          }
        }
        
        // SMTP fallback
        if (!sendSuccess && settings?.smtpConfig) {
          try {
            const smtpConfig = settings.smtpConfig as any;
            let smtpPass = smtpConfig.pass;
            try { smtpPass = encryptionService.decrypt(smtpPass); } catch {}
            
            const { EmailService } = require('./EmailService');
            await EmailService.sendSmtpEmail(
              { ...smtpConfig, pass: smtpPass },
              to,
              subject,
              finalBody,
              htmlBody
            );
            
            sendSuccess = true;
            provider = 'SMTP';
          } catch (smtpError: any) {
            console.error('SMTP send error:', smtpError.message);
            return { error: 'Die Email konnte weder über Gmail noch über SMTP gesendet werden. Prüfe die Einstellungen.' };
          }
        }
        
        if (!sendSuccess) {
          return { error: 'Die Email konnte leider nicht gesendet werden. Versuche es nochmal.' };
        }
        
        // Save to sent folder
        await getPrisma().email.create({
          data: {
            tenantId,
            from: user?.email || 'noreply@immivo.ai',
            fromName: senderName || undefined,
            to: [to],
            subject,
            bodyText: finalBody,
            bodyHtml: htmlBody,
            folder: 'SENT',
            isRead: true,
            provider: provider,
            leadId: leadId || undefined,
            sentAt: new Date(),
            providerData: { aiGenerated: true, generatedBy: 'mivo' },
          }
        });
        
        // If linked to a lead, create a message record and activity
        if (leadId) {
          await getPrisma().message.create({
            data: {
              leadId,
              role: 'ASSISTANT',
              content: `Subject: ${subject}\n\n${finalBody}`,
              status: 'SENT'
            }
          });
          
          await getPrisma().leadActivity.create({
            data: {
              leadId,
              type: 'EMAIL_SENT',
              description: `E-Mail gesendet: "${subject}"`,
              createdBy: userId
            }
          });
        }
        
        return { 
          success: true, 
          message: `Email erfolgreich gesendet an ${to} mit Betreff "${subject}".`
        };
      }

      case 'reply_to_email': {
        const { emailId, body } = args;
        
        // Get original email
        const originalEmail = await getPrisma().email.findFirst({
          where: { id: emailId, tenantId }
        });
        
        if (!originalEmail) {
          return { error: "Original-Email nicht gefunden" };
        }
        
        // Use send_email logic - call recursively
        const replySubject = originalEmail.subject.startsWith('Re:') 
          ? originalEmail.subject 
          : `Re: ${originalEmail.subject}`;
        
        return AiToolExecutor.execute('send_email', {
          to: originalEmail.from,
          subject: replySubject,
          body: body,
          leadId: originalEmail.leadId,
        }, tenantId, userId);
      }

      // === CALENDAR TOOLS ===
      case 'get_calendar_events': {
        const { start, end } = args;
        
        // Get user's tenant settings for calendar config
        const user = await getPrisma().user.findFirst({
          where: { tenantId },
          select: { tenantId: true }
        });
        
        if (!user) {
          return { error: "Benutzer nicht gefunden" };
        }
        
        const settings = await getPrisma().tenantSettings.findUnique({
          where: { tenantId },
          select: { googleCalendarConfig: true, outlookCalendarConfig: true }
        });
        
        if (!settings?.googleCalendarConfig && !settings?.outlookCalendarConfig) {
          return { error: "Kein Kalender verbunden. Bitte verbinde zuerst deinen Kalender unter Einstellungen." };
        }
        
        const events: any[] = [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        // Fetch from Google Calendar
        if (settings?.googleCalendarConfig) {
          try {
            const encryptedConfig = settings.googleCalendarConfig as any;
            const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
            const refreshToken = encryptionService.decrypt(encryptedConfig.refreshToken);
            
            const googleEvents = await CalendarService.getGoogleEvents(
              accessToken,
              refreshToken,
              startDate,
              endDate
            );
            events.push(...googleEvents);
          } catch (error: any) {
            console.error('Error fetching Google Calendar events:', error);
            return { error: "Die Termine konnten nicht geladen werden. Verbinde deinen Kalender ggf. neu unter Einstellungen." };
          }
        }
        
        // Fetch from Outlook Calendar
        if (settings?.outlookCalendarConfig) {
          try {
            const encryptedConfig = settings.outlookCalendarConfig as any;
            const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
            
            const outlookEvents = await CalendarService.getOutlookEvents(
              accessToken,
              startDate,
              endDate
            );
            events.push(...outlookEvents);
          } catch (error: any) {
            console.error('Error fetching Outlook Calendar events:', error);
            return { error: "Die Termine konnten nicht geladen werden. Verbinde deinen Kalender ggf. neu unter Einstellungen." };
          }
        }
        
        // Sort by start time
        events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        
        return {
          events,
          count: events.length,
          period: { start, end }
        };
      }

      case 'create_calendar_event': {
        const { title, description, start, end, location, attendees } = args;
        
        const settings = await getPrisma().tenantSettings.findUnique({
          where: { tenantId },
          select: { googleCalendarConfig: true, outlookCalendarConfig: true }
        });
        
        if (!settings?.googleCalendarConfig && !settings?.outlookCalendarConfig) {
          return { error: "Kein Kalender verbunden. Bitte verbinde zuerst deinen Kalender unter Einstellungen." };
        }
        
        let createdEvent = null;
        
        // Create in Google Calendar
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
              location,
              attendeeEmail: attendees?.split(',')[0]?.trim()
            });
          } catch (error: any) {
            console.error('Error creating Google Calendar event:', error);
            return { error: "Der Termin konnte leider nicht erstellt werden. Versuche es nochmal." };
          }
        }
        // Create in Outlook Calendar
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
              location,
              attendeeEmail: attendees?.split(',')[0]?.trim()
            });
          } catch (error: any) {
            console.error('Error creating Outlook Calendar event:', error);
            return { error: "Der Termin konnte leider nicht erstellt werden. Versuche es nochmal." };
          }
        }
        
        return {
          success: true,
          message: `Termin "${title}" wurde erfolgreich erstellt.`,
          eventId: createdEvent?.eventId,
          link: createdEvent?.link
        };
      }

      case 'update_calendar_event': {
        const { eventId, title, start, end, location, description } = args;
        
        if (!eventId) {
          return { error: "Bitte gib an, welchen Termin du meinst." };
        }
        
        const settings = await getPrisma().tenantSettings.findUnique({
          where: { tenantId },
          select: { googleCalendarConfig: true, outlookCalendarConfig: true }
        });
        
        if (!settings?.googleCalendarConfig && !settings?.outlookCalendarConfig) {
          return { error: "Kein Kalender verbunden." };
        }
        
        // Update in Google Calendar
        if (settings?.googleCalendarConfig) {
          try {
            const encryptedConfig = settings.googleCalendarConfig as any;
            const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
            const refreshToken = encryptionService.decrypt(encryptedConfig.refreshToken);
            
            const updatePayload: any = { accessToken, refreshToken, eventId };
            if (title !== undefined) updatePayload.title = title;
            if (start !== undefined) updatePayload.start = new Date(start);
            if (end !== undefined) updatePayload.end = new Date(end);
            if (location !== undefined) updatePayload.location = location;
            if (description !== undefined) updatePayload.description = description;
            await CalendarService.updateGoogleEvent(updatePayload);
            
            return { success: true, message: `Termin wurde erfolgreich aktualisiert.` };
          } catch (error: any) {
            console.error('Error updating Google Calendar event:', error);
            return { error: "Der Termin konnte leider nicht aktualisiert werden. Versuche es nochmal." };
          }
        }
        // Update in Outlook Calendar
        else if (settings?.outlookCalendarConfig) {
          try {
            const encryptedConfig = settings.outlookCalendarConfig as any;
            const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
            
            await CalendarService.updateOutlookEvent({
              accessToken,
              eventId,
              title: title || '',
              start: start ? new Date(start) : new Date(),
              end: end ? new Date(end) : new Date(),
              location,
              description
            });
            
            return { success: true, message: `Termin wurde erfolgreich aktualisiert.` };
          } catch (error: any) {
            console.error('Error updating Outlook Calendar event:', error);
            return { error: "Der Termin konnte leider nicht aktualisiert werden. Versuche es nochmal." };
          }
        }
        
        return { error: "Kein Kalender verbunden." };
      }

      case 'delete_calendar_event': {
        const { eventId } = args;
        
        if (!eventId) {
          return { error: "Bitte gib an, welchen Termin du meinst." };
        }
        
        const settings = await getPrisma().tenantSettings.findUnique({
          where: { tenantId },
          select: { googleCalendarConfig: true, outlookCalendarConfig: true }
        });
        
        if (!settings?.googleCalendarConfig && !settings?.outlookCalendarConfig) {
          return { error: "Kein Kalender verbunden." };
        }
        
        // Delete from Google Calendar
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
            
            return { success: true, message: `Termin wurde erfolgreich gelöscht.` };
          } catch (error: any) {
            console.error('Error deleting Google Calendar event:', error);
            return { error: "Der Termin konnte leider nicht gelöscht werden. Versuche es nochmal." };
          }
        }
        // Delete from Outlook Calendar
        else if (settings?.outlookCalendarConfig) {
          try {
            const encryptedConfig = settings.outlookCalendarConfig as any;
            const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
            
            await CalendarService.deleteOutlookEvent({
              accessToken,
              eventId
            });
            
            return { success: true, message: `Termin wurde erfolgreich gelöscht.` };
          } catch (error: any) {
            console.error('Error deleting Outlook Calendar event:', error);
            return { error: "Der Termin konnte leider nicht gelöscht werden. Versuche es nochmal." };
          }
        }
        
        return { error: "Kein Kalender verbunden." };
      }

      case 'get_calendar_availability': {
        const { start, end } = args;
        
        const settings = await getPrisma().tenantSettings.findUnique({
          where: { tenantId },
          select: { googleCalendarConfig: true, outlookCalendarConfig: true }
        });
        
        if (!settings?.googleCalendarConfig && !settings?.outlookCalendarConfig) {
          return { error: "Kein Kalender verbunden. Bitte verbinde zuerst deinen Kalender unter Einstellungen." };
        }
        
        const events: any[] = [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        // Fetch from Google Calendar
        if (settings?.googleCalendarConfig) {
          try {
            const encryptedConfig = settings.googleCalendarConfig as any;
            const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
            const refreshToken = encryptionService.decrypt(encryptedConfig.refreshToken);
            
            const googleEvents = await CalendarService.getGoogleEvents(
              accessToken,
              refreshToken,
              startDate,
              endDate
            );
            events.push(...googleEvents);
          } catch (error: any) {
            console.error('Error fetching Google Calendar events for availability:', error);
          }
        }
        
        // Fetch from Outlook Calendar
        if (settings?.outlookCalendarConfig) {
          try {
            const encryptedConfig = settings.outlookCalendarConfig as any;
            const accessToken = encryptionService.decrypt(encryptedConfig.accessToken);
            
            const outlookEvents = await CalendarService.getOutlookEvents(
              accessToken,
              startDate,
              endDate
            );
            events.push(...outlookEvents);
          } catch (error: any) {
            console.error('Error fetching Outlook Calendar events for availability:', error);
          }
        }
        
        // Calculate busy and free slots
        const busySlots = events.map(e => ({
          start: e.start,
          end: e.end,
          title: e.title
        }));
        
        return {
          period: { start, end },
          busySlots,
          totalEvents: events.length,
          summary: events.length === 0 
            ? `Du bist im Zeitraum ${new Date(start).toLocaleDateString('de-DE')} bis ${new Date(end).toLocaleDateString('de-DE')} komplett frei.`
            : `Du hast ${events.length} Termin(e) im angegebenen Zeitraum.`
        };
      }

      // === EXPOSÉ TOOLS (non-editor) ===
      case 'get_exposes': {
        const { status, propertyId, limit = 50 } = args;
        return await getPrisma().expose.findMany({
          where: {
            property: { tenantId },
            ...(status && { status }),
            ...(propertyId && { propertyId })
          },
          include: { property: true },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      case 'create_expose_from_template': {
        const { propertyId, templateId } = args;
        const template = await getPrisma().exposeTemplate.findFirst({
          where: { id: templateId, tenantId }
        });
        if (!template) return { error: "Die Vorlage wurde nicht gefunden." };

        const property = await getPrisma().property.findFirst({
          where: { id: propertyId, tenantId }
        });
        if (!property) return { error: "Das Objekt wurde nicht gefunden." };

        // Load current user so placeholders like {{user.name}} are resolved
        const currentUser = await getPrisma().user.findUnique({ where: { id: userId } });

        // Replace {{property.X}} and {{user.X}} placeholders in the template blocks
        const resolvedBlocks = currentUser
          ? replacePlaceholders(template.blocks as any[], property, currentUser)
          : template.blocks as any;

        const expose = await getPrisma().expose.create({
          data: {
            tenantId,
            propertyId,
            templateId,
            blocks: resolvedBlocks as any,
            status: 'DRAFT'
          }
        });
        return { message: `Exposé für "${(property as any).title}" wurde erfolgreich erstellt.`, exposeId: expose.id };
      }

      case 'create_expose_template': {
        // Generate creative name if not provided
        const creativeNames = [
          'Premium Residenz', 'Stadtleben Modern', 'Landhaus Charme', 'Urban Loft', 
          'Elegantes Zuhause', 'Business Edition', 'Familientraum', 'Luxus Ambiente',
          'Stilvolle Oase', 'Metropolitan', 'Klassik Deluxe', 'Zeitlos Schön'
        ];
        const randomName = creativeNames[Math.floor(Math.random() * creativeNames.length)];
        const name = args.name || randomName;
        const theme = args.theme || 'modern';
        
        // Create template with blocks based on theme
        const defaultBlocks = [
          { id: randomUUID(), type: 'hero', title: '{{property.title}}', subtitle: '{{property.address}}', style: { overlay: theme === 'elegant' ? 'dark' : 'light' } },
          { id: randomUUID(), type: 'stats', items: [
            { label: 'Zimmer', value: '{{property.rooms}}', icon: 'door' },
            { label: 'Wohnfläche', value: '{{property.area}} m²', icon: 'area' },
            { label: 'Preis', value: '{{property.price}} €', icon: 'euro' }
          ]},
          { id: randomUUID(), type: 'gallery', title: 'Impressionen', layout: theme === 'minimal' ? 'grid' : 'masonry' },
          { id: randomUUID(), type: 'text', title: 'Objektbeschreibung', content: '{{property.description}}' },
          { id: randomUUID(), type: 'features', title: 'Ausstattung & Highlights', items: [], columns: 2 },
          { id: randomUUID(), type: 'location', title: 'Lage & Umgebung', address: '{{property.address}}', showMap: true },
          { id: randomUUID(), type: 'floorplan', title: 'Grundriss' },
          { id: randomUUID(), type: 'contact', title: 'Ihr Ansprechpartner', name: '{{user.name}}', email: '{{user.email}}', phone: '{{user.phone}}' },
        ];

        const template = await getPrisma().exposeTemplate.create({
          data: {
            tenantId,
            name,
            theme,
            isDefault: false,
            blocks: defaultBlocks,
          }
        });
        
        return `Exposé-Vorlage "${name}" mit Theme "${theme}" erstellt! Die Vorlage enthält ${defaultBlocks.length} Blöcke: Hero-Bild, Statistiken, Galerie, Beschreibung, Ausstattung, Lage mit Karte, Grundriss und Kontakt. Du kannst sie jetzt im Vorlagen-Editor unter Einstellungen > Vorlagen anpassen.`;
      }

      case 'delete_expose': {
        const { exposeId } = args;
        // Verify tenant ownership
        const exposeToDelete = await getPrisma().expose.findFirst({
          where: { id: exposeId, property: { tenantId } }
        });
        if (!exposeToDelete) return 'Das Exposé wurde nicht gefunden.';
        await getPrisma().expose.delete({ where: { id: exposeId } });
        return `Das Exposé wurde gelöscht.`;
      }

      case 'delete_all_exposes': {
        const { confirmed } = args;
        if (!confirmed) {
          return 'Löschung abgebrochen. Bitte bestätige mit confirmed: true.';
        }
        const result = await getPrisma().expose.deleteMany({ where: { tenantId } });
        return `${result.count} Exposé(s) wurden gelöscht.`;
      }

      case 'generate_expose_pdf': {
        const { exposeId } = args;
        if (!exposeId) return { error: 'exposeId ist erforderlich.' };

        const expose = await getPrisma().expose.findFirst({
          where: { id: exposeId, tenantId },
          include: { property: true }
        });
        if (!expose) return { error: `Exposé mit ID "${exposeId}" nicht gefunden.` };

        // Load current user for the PDF footer
        const pdfUser = await getPrisma().user.findUnique({ where: { id: userId } });

        const { PdfService } = await import('./PdfService');
        const pdfBuffer = await PdfService.generateExposePdf({
          id: expose.id,
          blocks: expose.blocks as any[],
          theme: expose.theme,
          property: {
            title: (expose.property as any).title,
            address: (expose.property as any).address || '',
            price: Number((expose.property as any).price) || 0,
            area: Number((expose.property as any).area) || 0,
            rooms: Number((expose.property as any).rooms) || 0,
            description: (expose.property as any).description || undefined,
            images: (expose.property as any).images || [],
          },
          user: pdfUser ? {
            name: `${pdfUser.firstName || ''} ${pdfUser.lastName || ''}`.trim(),
            email: pdfUser.email,
          } : undefined,
        });

        // Upload PDF to S3
        const mediaBucket = process.env.MEDIA_BUCKET_NAME || '';
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
        const s3Key = `exposes/${tenantId}/${exposeId}-${Date.now()}.pdf`;

        if (!mediaBucket) {
          return { error: 'MEDIA_BUCKET_NAME ist nicht konfiguriert. PDF kann nicht gespeichert werden.' };
        }

        const AWS = require('aws-sdk');
        const s3 = new AWS.S3();
        await s3.putObject({
          Bucket: mediaBucket,
          Key: s3Key,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
        }).promise();

        const cdnUrl = process.env.MEDIA_CDN_URL;
        const pdfUrl = cdnUrl
          ? `${cdnUrl}/${s3Key}`
          : `https://${mediaBucket}.s3.${region}.amazonaws.com/${s3Key}`;

        return {
          message: `Das PDF für "${(expose as any).title || 'Exposé'}" wurde erfolgreich generiert.`,
          url: pdfUrl,
        };
      }

      // === TEAM CHAT TOOLS ===
      case 'get_channel_messages': {
        const { channelId, limit = 50 } = args;
        // Verify channel belongs to user's tenant
        const msgChannel = await getPrisma().channel.findFirst({ where: { id: channelId, tenantId } });
        if (!msgChannel) return 'Channel nicht gefunden.';
        return await getPrisma().channelMessage.findMany({
          where: { channelId },
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      case 'send_team_message': {
        let { channelId, content } = args;
        if (!userId) return 'Fehler: Kein Benutzer-Kontext verfügbar.';

        // If no channelId, find default channel for this tenant
        if (!channelId) {
          const defaultChannel = await getPrisma().channel.findFirst({
            where: { tenantId, isDefault: true }
          });
          if (!defaultChannel) {
            return 'Kein Standard-Channel gefunden. Bitte Channel-ID angeben.';
          }
          channelId = defaultChannel.id;
        } else {
          // Verify channel belongs to user's tenant
          const sendChannel = await getPrisma().channel.findFirst({ where: { id: channelId, tenantId } });
          if (!sendChannel) return 'Channel nicht gefunden oder kein Zugriff.';
        }

        await getPrisma().channelMessage.create({
          data: {
            channelId,
            userId,
            content,
            isMivo: true
          }
        });
        return `Nachricht als Mivo gesendet in Channel.`;
      }

      case 'get_team_channels': {
        const channels = await getPrisma().channel.findMany({
          where: { tenantId },
          include: { _count: { select: { members: true, messages: true } } },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
        });
        return channels;
      }

      // === DASHBOARD / STATS TOOLS ===
      case 'get_dashboard_stats': {
        const { period = 'month' } = args;
        const startDate = getStartDateForPeriod(period);
        
        const [leadsCount, propertiesCount, exposesCount] = await Promise.all([
          prisma.lead.count({ where: { tenantId, createdAt: { gte: startDate } } }),
          prisma.property.count({ where: { tenantId, createdAt: { gte: startDate } } }),
          prisma.expose.count({ where: { property: { tenantId }, createdAt: { gte: startDate } } })
        ]);

        return {
          period,
          leadsCount,
          propertiesCount,
          exposesCount,
          generatedAt: new Date().toISOString()
        };
      }

      case 'get_lead_statistics': {
        const { period = 'month' } = args;
        const startDate = getStartDateForPeriod(period);
        
        const leads = await getPrisma().lead.findMany({
          where: { tenantId, createdAt: { gte: startDate } }
        });

        const byStatus = leads.reduce((acc: any, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1;
          return acc;
        }, {});

        return {
          period,
          total: leads.length,
          byStatus,
          conversionRate: byStatus.BOOKED ? (byStatus.BOOKED / leads.length * 100).toFixed(1) + '%' : '0%'
        };
      }

      case 'get_property_statistics': {
        const { period = 'month' } = args;
        const startDate = getStartDateForPeriod(period);
        
        const properties = await getPrisma().property.findMany({
          where: { tenantId, createdAt: { gte: startDate } }
        });

        // Property model has no status/type yet, so we return basic stats
        return {
          period,
          total: properties.length,
          totalValue: properties.reduce((sum, p) => sum + (p.price ? Number(p.price) : 0), 0),
          avgPrice: properties.length > 0 
            ? (properties.reduce((sum, p) => sum + (p.price ? Number(p.price) : 0), 0) / properties.length).toFixed(0)
            : 0,
          withImages: properties.filter(p => p.images.length > 0).length,
          withFloorplans: properties.filter(p => p.floorplans.length > 0).length
        };
      }

      // === TEMPLATE TOOLS ===
      case 'get_email_templates': {
        const { limit = 50 } = args;
        return await getPrisma().emailTemplate.findMany({
          where: { tenantId },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      case 'get_expose_templates': {
        const { limit = 50 } = args;
        return await getPrisma().exposeTemplate.findMany({
          where: { tenantId },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      case 'update_expose_template': {
        const { templateId, ...updateData } = args;
        const template = await getPrisma().exposeTemplate.findFirst({
          where: { id: templateId, tenantId }
        });
        if (!template) throw new Error('Template nicht gefunden oder kein Zugriff');
        return await getPrisma().exposeTemplate.update({
          where: { id: templateId },
          data: updateData
        });
      }

      case 'delete_expose_template': {
        const { templateId, confirmed } = args;
        if (!confirmed) return 'Löschung abgebrochen. Bitte bestätige mit confirmed: true.';
        const tmpl = await getPrisma().exposeTemplate.findFirst({
          where: { id: templateId, tenantId }
        });
        if (!tmpl) throw new Error('Template nicht gefunden oder kein Zugriff');
        await getPrisma().exposeTemplate.delete({ where: { id: templateId } });
        return `Exposé-Vorlage "${tmpl.name}" wurde gelöscht.`;
      }

      case 'add_video_to_property': {
        const { propertyId, videoUrl } = args;
        const prop = await getPrisma().property.findFirst({
          where: { id: propertyId, tenantId }
        });
        if (!prop) throw new Error('Objekt nicht gefunden oder kein Zugriff');
        const updatedVideos = [...(prop.videos || []), videoUrl];
        return await getPrisma().property.update({
          where: { id: propertyId },
          data: { videos: updatedVideos }
        });
      }

      case 'set_virtual_tour': {
        const { propertyId, tourUrl } = args;
        // Verify tenant ownership
        const tourProp = await getPrisma().property.findFirst({ where: { id: propertyId, tenantId } });
        if (!tourProp) return 'Das Objekt wurde nicht gefunden.';
        return await getPrisma().property.update({
          where: { id: propertyId },
          data: { virtualTour: tourUrl }
        });
      }

      case 'virtual_staging': {
        const { imageUrl, propertyId, imageIndex = 0, style, roomType, prompt, saveToPropertyId, _uploadedFiles } = args;
        
        // 1. Get the source image
        let sourceImageUrl: string | null = imageUrl || null;
        let sourceProperty: any = null;
        
        // If propertyId given but no imageUrl, get image from property
        if (!sourceImageUrl && propertyId) {
          sourceProperty = await getPrisma().property.findFirst({
            where: { id: propertyId, tenantId }
          });
          if (!sourceProperty) throw new Error('Objekt nicht gefunden');
          if (!sourceProperty.images || sourceProperty.images.length === 0) throw new Error('Objekt hat keine Bilder');
          const idx = Math.min(imageIndex, sourceProperty.images.length - 1);
          sourceImageUrl = sourceProperty.images[idx];
        }
        
        // If no image yet, check uploaded files from chat
        if (!sourceImageUrl && _uploadedFiles && _uploadedFiles.length > 0) {
          sourceImageUrl = _uploadedFiles[0];
        }
        
        if (!sourceImageUrl) throw new Error('Kein Bild angegeben. Lade ein Bild hoch oder gib eine Property-ID an.');
        
        // 2. Fetch the image and convert to base64
        const https = require('https');
        const http = require('http');
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const url = sourceImageUrl!;
          const protocol = url.startsWith('https') ? https : http;
          protocol.get(url, (res: any) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
              const buffer = Buffer.concat(chunks);
              const mime = res.headers['content-type'] || 'image/jpeg';
              resolve(`data:${mime};base64,${buffer.toString('base64')}`);
            });
            res.on('error', reject);
          }).on('error', reject);
        });
        
        // 3. Call the image edit endpoint logic directly
        const { GoogleGenAI } = require('@google/genai');
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) throw new Error('Gemini API Key nicht konfiguriert');
        
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        
        // Build prompt — short and clear works better with image models
        const stylePart = style ? `${style} style ` : '';
        const roomPart = roomType ? `${roomType} ` : '';
        const userRequest = prompt && prompt.trim() ? `: ${prompt.trim()}` : '';
        const stagingPrompt = `Add ${stylePart}${roomPart}furniture into this room photo${userRequest}. The room must stay EXACTLY as-is — keep every wall, door, window, ceiling light, floor, and fixture identical. Only add freestanding furniture and decor.`;
        
        // Extract base64 data
        const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) throw new Error('Bild konnte nicht verarbeitet werden');
        const mimeType = matches[1];
        const imgData = matches[2];
        
        console.log(`🎨 Mivo virtual staging: style=${style}, room=${roomType}, prompt="${(prompt || '').substring(0, 50)}"`);
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: [
            { inlineData: { mimeType, data: imgData } },
            { text: stagingPrompt },
          ],
          config: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        });
        
        // Extract generated image
        let generatedImage: string | null = null;
        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const outMime = part.inlineData.mimeType || 'image/png';
              generatedImage = `data:${outMime};base64,${part.inlineData.data}`;
            }
          }
        }
        
        if (!generatedImage) throw new Error('KI konnte kein Bild generieren. Versuche einen anderen Prompt.');
        
        // 4. Upload result to S3 so we have a URL (use MEDIA_BUCKET_NAME, same as rest of app)
        const imageBuffer = Buffer.from(generatedImage.split(',')[1], 'base64');
        const mediaBucket = process.env.MEDIA_BUCKET_NAME || '';
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';
        const s3Key = `staging/${tenantId}/${Date.now()}-staged.png`;
        
        if (!mediaBucket) {
          throw new Error('MEDIA_BUCKET_NAME is not configured. Cannot save staged image.');
        }
        
        const AWS = require('aws-sdk');
        const s3Client = new AWS.S3();
        await s3Client.putObject({
          Bucket: mediaBucket,
          Key: s3Key,
          Body: imageBuffer,
          ContentType: 'image/png',
        }).promise();
        
        const resultUrl = `https://${mediaBucket}.s3.${region}.amazonaws.com/${s3Key}`;
        
        // 5. Optionally save to property
        let savedToProperty = false;
        const targetPropertyId = saveToPropertyId || propertyId;
        if (targetPropertyId) {
          const targetProp = await getPrisma().property.findFirst({
            where: { id: targetPropertyId, tenantId }
          });
          if (targetProp) {
            await getPrisma().property.update({
              where: { id: targetPropertyId },
              data: { images: [...targetProp.images, resultUrl] }
            });
            savedToProperty = true;
          }
        }
        
        console.log(`✅ Mivo virtual staging complete: ${resultUrl}`);
        
        return {
          success: true,
          imageUrl: resultUrl,
          style: style || 'auto',
          roomType: roomType || 'auto',
          savedToProperty,
          message: savedToProperty 
            ? `Virtual Staging fertig und zum Objekt gespeichert.`
            : `Virtual Staging fertig.`
        };
      }

      // Exposé Tools (Editor-specific)
      case 'create_expose_block': {
        const { exposeId, templateId, blockType, position, ...blockFields } = args;
        
        let blocks: any[] = [];
        let targetId: string;
        let isTemplate = false;
        
        // Determine if we're working with an expose or template
        if (templateId) {
          const template = await getPrisma().exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');
          blocks = (template.blocks as any[]) || [];
          targetId = templateId;
          isTemplate = true;
        } else if (exposeId) {
          const expose = await getPrisma().expose.findFirst({
            where: { id: exposeId, property: { tenantId } },
            include: { property: true }
          });
          if (!expose) throw new Error('Exposé not found or access denied');
          blocks = (expose.blocks as any[]) || [];
          targetId = exposeId;
        } else {
          throw new Error('Either exposeId or templateId is required');
        }

        const newBlock: any = {
          id: `${blockType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: blockType,
        };

        // Parse JSON fields if they're strings
        const parseJsonField = (field: any) => {
          if (typeof field === 'string') {
            try {
              return JSON.parse(field);
            } catch {
              return field;
            }
          }
          return field;
        };

        // Add all provided fields to the block
        const fieldMappings: Record<string, string[]> = {
          hero: ['title', 'subtitle', 'imageUrl'],
          text: ['title', 'content', 'style'],
          features: ['title', 'items'],
          highlights: ['title', 'items'],
          twoColumn: ['leftContent', 'rightContent'],
          quote: ['text', 'author'],
          gallery: ['images', 'columns'],
          floorplan: ['title', 'imageUrl'],
          video: ['title', 'videoUrl'],
          virtualTour: ['title', 'tourUrl'],
          stats: ['items'],
          priceTable: ['title', 'items'],
          energyCertificate: ['energyClass', 'consumption'],
          location: ['title', 'address', 'description'],
          contact: ['title', 'name', 'email', 'phone'],
          leadInfo: ['title', 'leadName', 'leadEmail', 'leadPhone', 'showGreeting'],
          cta: ['title', 'buttonText', 'buttonUrl'],
          pageBreak: [],
        };

        const allowedFields = fieldMappings[blockType] || [];
        for (const field of allowedFields) {
          if (blockFields[field] !== undefined) {
            newBlock[field] = ['items', 'images'].includes(field) 
              ? parseJsonField(blockFields[field])
              : blockFields[field];
          }
        }

        // Insert at position or append
        const insertPos = position !== undefined ? Math.min(position, blocks.length) : blocks.length;
        blocks.splice(insertPos, 0, newBlock);

        // Update the target
        if (isTemplate) {
          await getPrisma().exposeTemplate.update({
            where: { id: targetId },
            data: { blocks }
          });
        } else {
          await getPrisma().expose.update({
            where: { id: targetId },
            data: { blocks }
          });
        }

        return { success: true, block: newBlock, totalBlocks: blocks.length, isTemplate };
      }

      case 'update_expose_block': {
        const { exposeId, templateId, blockId, ...updates } = args;
        
        let blocks: any[] = [];
        let targetId: string;
        let isTemplate = false;
        
        // Determine if we're working with an expose or template
        if (templateId) {
          const template = await getPrisma().exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');
          blocks = (template.blocks as any[]) || [];
          targetId = templateId;
          isTemplate = true;
        } else if (exposeId) {
          const expose = await getPrisma().expose.findFirst({
            where: { id: exposeId, property: { tenantId } }
          });
          if (!expose) throw new Error('Exposé not found or access denied');
          blocks = (expose.blocks as any[]) || [];
          targetId = exposeId;
        } else {
          throw new Error('Either exposeId or templateId is required');
        }

        const blockIndex = blocks.findIndex(b => b.id === blockId);
        if (blockIndex === -1) throw new Error('Block not found');

        // Parse JSON fields if they're strings
        const parseJsonField = (field: any) => {
          if (typeof field === 'string' && (field.startsWith('[') || field.startsWith('{'))) {
            try {
              return JSON.parse(field);
            } catch {
              return field;
            }
          }
          return field;
        };

        // Update block with provided fields, parsing JSON where needed
        const cleanUpdates: any = {};
        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) {
            cleanUpdates[key] = ['items', 'images'].includes(key) ? parseJsonField(value) : value;
          }
        }
        
        blocks[blockIndex] = { ...blocks[blockIndex], ...cleanUpdates };

        // Update the target
        if (isTemplate) {
          await getPrisma().exposeTemplate.update({
            where: { id: targetId },
            data: { blocks }
          });
        } else {
          await getPrisma().expose.update({
            where: { id: targetId },
            data: { blocks }
          });
        }

        return { success: true, block: blocks[blockIndex], isTemplate };
      }

      case 'delete_expose_block': {
        const { exposeId, templateId, blockId } = args;
        
        let blocks: any[] = [];
        let targetId: string;
        let isTemplate = false;
        
        if (templateId) {
          const template = await getPrisma().exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');
          blocks = (template.blocks as any[]) || [];
          targetId = templateId;
          isTemplate = true;
        } else if (exposeId) {
          const expose = await getPrisma().expose.findFirst({
            where: { id: exposeId, property: { tenantId } }
          });
          if (!expose) throw new Error('Exposé not found or access denied');
          blocks = (expose.blocks as any[]) || [];
          targetId = exposeId;
        } else {
          throw new Error('Either exposeId or templateId is required');
        }

        const newBlocks = blocks.filter(b => b.id !== blockId);

        if (newBlocks.length === blocks.length) {
          throw new Error('Block not found');
        }

        if (isTemplate) {
          await getPrisma().exposeTemplate.update({
            where: { id: targetId },
            data: { blocks: newBlocks }
          });
        } else {
          await getPrisma().expose.update({
            where: { id: targetId },
            data: { blocks: newBlocks }
          });
        }

        return { success: true, remainingBlocks: newBlocks.length, isTemplate };
      }

      case 'reorder_expose_blocks': {
        const { exposeId, templateId, blockId, newPosition } = args;
        
        let blocks: any[] = [];
        let targetId: string;
        let isTemplate = false;
        
        if (templateId) {
          const template = await getPrisma().exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');
          blocks = (template.blocks as any[]) || [];
          targetId = templateId;
          isTemplate = true;
        } else if (exposeId) {
          const expose = await getPrisma().expose.findFirst({
            where: { id: exposeId, property: { tenantId } }
          });
          if (!expose) throw new Error('Exposé not found or access denied');
          blocks = (expose.blocks as any[]) || [];
          targetId = exposeId;
        } else {
          throw new Error('Either exposeId or templateId is required');
        }

        const currentIndex = blocks.findIndex(b => b.id === blockId);
        if (currentIndex === -1) throw new Error('Block not found');

        // Remove and reinsert at new position
        const [block] = blocks.splice(currentIndex, 1);
        const insertPos = Math.min(Math.max(0, newPosition), blocks.length);
        blocks.splice(insertPos, 0, block);

        if (isTemplate) {
          await getPrisma().exposeTemplate.update({
            where: { id: targetId },
            data: { blocks }
          });
        } else {
          await getPrisma().expose.update({
            where: { id: targetId },
            data: { blocks }
          });
        }

        return { success: true, newOrder: blocks.map(b => b.id), isTemplate };
      }

      case 'generate_expose_text': {
        const { propertyId, textType, tone = 'professional', maxLength = 500 } = args;
        
        const property = await getPrisma().property.findFirst({
          where: { id: propertyId, tenantId }
        });
        if (!property) throw new Error('Property not found or access denied');

        // Generate text based on property data
        const texts: Record<string, string> = {
          description: generatePropertyDescription(property, tone, maxLength),
          headline: generateHeadline(property, tone),
          highlights: generateHighlights(property),
          location: generateLocationText(property, tone),
        };

        return { 
          success: true, 
          text: texts[textType] || texts.description,
          textType,
          propertyTitle: property.title
        };
      }

      case 'get_expose_status': {
        const { exposeId } = args;
        
        const expose = await getPrisma().expose.findFirst({
          where: { id: exposeId, property: { tenantId } },
          include: { property: true, template: true }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        return {
          id: expose.id,
          status: expose.status,
          theme: expose.theme,
          blockCount: ((expose.blocks as any[]) || []).length,
          blocks: (expose.blocks as any[]) || [],
          property: {
            id: expose.property.id,
            title: expose.property.title,
            address: expose.property.address
          },
          template: expose.template ? {
            id: expose.template.id,
            name: expose.template.name
          } : null,
          pdfUrl: expose.pdfUrl,
          createdAt: expose.createdAt,
          updatedAt: expose.updatedAt
        };
      }

      case 'set_expose_status': {
        const { exposeId, status } = args;
        
        if (!['DRAFT', 'PUBLISHED'].includes(status)) {
          throw new Error('Invalid status. Must be DRAFT or PUBLISHED');
        }

        const expose = await getPrisma().expose.findFirst({
          where: { id: exposeId, property: { tenantId } }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        await getPrisma().expose.update({
          where: { id: exposeId },
          data: { status }
        });

        return { success: true, newStatus: status };
      }

      case 'create_full_expose': {
        const { exposeId, templateId, style = 'professional', includeBlocks, theme = 'default', customInstructions } = args;
        
        const isTemplateMode = !!templateId;
        let property: any = null;

        if (templateId) {
          // Template mode - verify template exists
          const template = await getPrisma().exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');
        } else if (exposeId) {
          // Expose mode - get real property data
          const expose = await getPrisma().expose.findFirst({
            where: { id: exposeId, property: { tenantId } },
            include: { property: true }
          });
          if (!expose) throw new Error('Exposé not found or access denied');
          property = expose.property;
        } else {
          throw new Error('Either exposeId or templateId is required');
        }

        const blocks: any[] = [];
        
        // Determine which blocks to include
        const blockList = includeBlocks 
          ? includeBlocks.split(',').map((b: string) => b.trim())
          : ['hero', 'stats', 'description', 'highlights', 'gallery', 'floorplan', 'location', 'features', 'contact', 'cta'];

        // Style-specific text generation
        const toneMap: Record<string, string> = {
          luxurious: 'luxurious',
          modern: 'modern',
          warm: 'friendly',
          professional: 'professional',
        };
        const tone = toneMap[style] || 'professional';

        // Generate blocks based on selection
        for (const blockType of blockList) {
          const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          switch (blockType) {
            case 'hero':
              blocks.push({
                id: blockId,
                type: 'hero',
                title: isTemplateMode ? '{{property.title}}' : generateHeadline(property, tone),
                subtitle: isTemplateMode ? '{{property.address}}' : (property?.address || ''),
                imageUrl: isTemplateMode ? '' : ((property as any)?.images?.[0] || ''),
              });
              break;

            case 'stats':
              blocks.push({
                id: blockId,
                type: 'stats',
                items: isTemplateMode 
                  ? [
                      { label: 'Zimmer', value: '{{property.rooms}}' },
                      { label: 'Wohnfläche', value: '{{property.area}}' },
                      { label: 'Preis', value: '{{property.priceFormatted}}' },
                    ]
                  : [
                      { label: 'Zimmer', value: property?.rooms?.toString() || '-' },
                      { label: 'Wohnfläche', value: property?.area ? `${property.area} m²` : '-' },
                      { label: 'Preis', value: property?.price ? `${Number(property.price).toLocaleString('de-DE')} €` : '-' },
                    ],
              });
              break;

            case 'description':
              blocks.push({
                id: blockId,
                type: 'text',
                title: 'Objektbeschreibung',
                content: isTemplateMode ? '{{property.description}}' : generatePropertyDescription(property, tone, 800),
                style: 'normal',
              });
              break;

            case 'highlights':
              blocks.push({
                id: blockId,
                type: 'highlights',
                title: 'Highlights',
                items: isTemplateMode 
                  ? ['Highlight 1', 'Highlight 2', 'Highlight 3', 'Highlight 4']
                  : generateHighlightsList(property),
              });
              break;

            case 'gallery':
              const images = isTemplateMode ? [] : ((property as any)?.images || []);
              blocks.push({
                id: blockId,
                type: 'gallery',
                images: images.slice(0, 6),
                columns: images.length > 4 ? 3 : 2,
              });
              break;

            case 'floorplan':
              const floorplans = isTemplateMode ? [] : ((property as any)?.floorplans || []);
              blocks.push({
                id: blockId,
                type: 'floorplan',
                title: 'Grundriss',
                imageUrl: floorplans[0] || '',
              });
              break;

            case 'location':
              blocks.push({
                id: blockId,
                type: 'location',
                title: 'Lage & Umgebung',
                address: isTemplateMode ? '{{property.address}}' : (property?.address || ''),
                description: isTemplateMode ? 'Beschreibung der Lage und Umgebung des Objekts.' : generateLocationText(property, tone),
              });
              break;

            case 'features':
              blocks.push({
                id: blockId,
                type: 'features',
                title: 'Ausstattung',
                items: isTemplateMode 
                  ? ['Einbauküche', 'Balkon', 'Fußbodenheizung', 'Aufzug']
                  : generateFeaturesList(property),
              });
              break;

            case 'energyCertificate':
              blocks.push({
                id: blockId,
                type: 'energyCertificate',
                energyClass: isTemplateMode ? '{{property.energyEfficiencyClass}}' : (property?.energyEfficiencyClass || 'B'),
                consumption: isTemplateMode ? '{{property.energyConsumption}}' : (property?.energyConsumption || '85 kWh/(m²·a)'),
              });
              break;

            case 'priceTable':
              blocks.push({
                id: blockId,
                type: 'priceTable',
                title: 'Kosten',
                items: isTemplateMode
                  ? [
                      { label: 'Kaufpreis', value: '{{property.price}}' },
                      { label: 'Provision', value: '{{property.commission}}' },
                      { label: 'Nebenkosten', value: 'Auf Anfrage' },
                    ]
                  : [
                      { label: 'Kaltmiete', value: property?.price ? `${Number(property.price).toLocaleString('de-DE')} €` : '-' },
                      { label: 'Nebenkosten', value: 'ca. 200 €' },
                      { label: 'Kaution', value: '3 Monatsmieten' },
                    ],
              });
              break;

            case 'contact':
              blocks.push({
                id: blockId,
                type: 'contact',
                title: 'Ihr Ansprechpartner',
                name: '{{user.name}}',
                email: '{{user.email}}',
                phone: '{{user.phone}}',
              });
              break;

            case 'cta':
              blocks.push({
                id: blockId,
                type: 'cta',
                title: 'Interesse geweckt?',
                buttonText: 'Besichtigungstermin vereinbaren',
                buttonUrl: '',
              });
              break;
          }
        }

        // Update expose or template with new blocks and theme
        if (isTemplateMode) {
          await getPrisma().exposeTemplate.update({
            where: { id: templateId },
            data: { 
              blocks,
              theme,
            }
          });
        } else {
          await getPrisma().expose.update({
            where: { id: exposeId },
            data: { 
              blocks,
              theme,
            }
          });
        }

        return { 
          success: true, 
          blocksCreated: blocks.length,
          blockTypes: blocks.map(b => b.type),
          theme,
          isTemplate: isTemplateMode,
          message: `${isTemplateMode ? 'Vorlage' : 'Exposé'} wurde mit ${blocks.length} Blöcken erstellt.`
        };
      }

      case 'set_expose_theme': {
        const { exposeId, theme } = args;
        
        const validThemes = ['default', 'modern', 'elegant', 'minimal', 'luxury'];
        if (!validThemes.includes(theme)) {
          throw new Error(`Invalid theme. Must be one of: ${validThemes.join(', ')}`);
        }

        const expose = await getPrisma().expose.findFirst({
          where: { id: exposeId, property: { tenantId } }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        await getPrisma().expose.update({
          where: { id: exposeId },
          data: { theme }
        });

        return { success: true, newTheme: theme };
      }

      case 'clear_expose_blocks': {
        const { exposeId, templateId } = args;
        
        if (templateId) {
          const template = await getPrisma().exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');

          await getPrisma().exposeTemplate.update({
            where: { id: templateId },
            data: { blocks: [] }
          });

          return { success: true, message: 'Alle Blöcke wurden aus dem Template entfernt.', isTemplate: true };
        } else if (exposeId) {
          const expose = await getPrisma().expose.findFirst({
            where: { id: exposeId, property: { tenantId } }
          });
          if (!expose) throw new Error('Exposé not found or access denied');

          await getPrisma().expose.update({
            where: { id: exposeId },
            data: { blocks: [] }
          });

          return { success: true, message: 'Alle Blöcke wurden entfernt.' };
        } else {
          throw new Error('Either exposeId or templateId is required');
        }
      }

      case 'get_template': {
        const { templateId } = args;
        
        const template = await getPrisma().exposeTemplate.findFirst({
          where: { id: templateId, tenantId }
        });
        if (!template) throw new Error('Template not found or access denied');

        return {
          id: template.id,
          name: template.name,
          theme: template.theme,
          isDefault: template.isDefault,
          blockCount: ((template.blocks as any[]) || []).length,
          blocks: (template.blocks as any[]) || [],
          createdAt: template.createdAt,
          updatedAt: template.updatedAt
        };
      }

      case 'update_template': {
        const { templateId, name, theme, isDefault } = args;
        
        const template = await getPrisma().exposeTemplate.findFirst({
          where: { id: templateId, tenantId }
        });
        if (!template) throw new Error('Template not found or access denied');

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (theme !== undefined) {
          const validThemes = ['default', 'modern', 'elegant', 'minimal', 'luxury'];
          if (!validThemes.includes(theme)) {
            throw new Error(`Invalid theme. Must be one of: ${validThemes.join(', ')}`);
          }
          updateData.theme = theme;
        }
        if (isDefault !== undefined) updateData.isDefault = isDefault;

        await getPrisma().exposeTemplate.update({
          where: { id: templateId },
          data: updateData
        });

        return { success: true, updated: Object.keys(updateData) };
      }

      case 'get_email_signature': {
        if (!userId) throw new Error('User ID required');
        const settings = await getPrisma().userSettings.findUnique({
          where: { userId }
        });
        return {
          emailSignature: (settings as any)?.emailSignature || null,
          emailSignatureName: (settings as any)?.emailSignatureName || null,
        };
      }

      case 'update_email_signature': {
        if (!userId) throw new Error('User ID required');
        const { emailSignature, emailSignatureName } = args;
        if (emailSignature === undefined && emailSignatureName === undefined) {
          throw new Error('At least one of emailSignature or emailSignatureName must be provided');
        }
        const updateData: any = {};
        if (emailSignature !== undefined) updateData.emailSignature = emailSignature;
        if (emailSignatureName !== undefined) updateData.emailSignatureName = emailSignatureName;

        await getPrisma().userSettings.upsert({
          where: { userId },
          update: updateData,
          create: { userId, ...updateData },
        });

        return {
          success: true,
          updated: Object.keys(updateData),
          message: 'E-Mail Signatur wurde erfolgreich gespeichert.',
        };
      }

      case 'export_data': {
        const exportType = (args.type || 'leads').toLowerCase() as 'leads' | 'properties' | 'all';
        const exportFormat = (args.format || 'xlsx').toLowerCase() as 'csv' | 'xlsx';
        const useXlsx = exportFormat === 'xlsx' || exportType === 'all';

        const mediaBucket = process.env.MEDIA_BUCKET_NAME || '';
        const cdnUrl = process.env.MEDIA_CDN_URL || '';
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-central-1';

        // ---- Build lead rows ----
        const buildLeadRows = async () => {
          const leads = await getPrisma().lead.findMany({
            where: { tenantId },
            include: { assignedTo: { select: { firstName: true, lastName: true, email: true } } },
            orderBy: { createdAt: 'desc' },
          });
          return leads.map(l => ({
            'ID': l.id,
            'Status': l.status,
            'Score': l.score ?? '',
            'Anrede': l.salutation,
            'Vorname': l.firstName ?? '',
            'Nachname': l.lastName ?? '',
            'E-Mail': l.email,
            'Telefon': l.phone ?? '',
            'Quelle': l.source,
            'Quelle Details': l.sourceDetails ?? '',
            'Budget Min (€)': l.budgetMin != null ? Number(l.budgetMin) : '',
            'Budget Max (€)': l.budgetMax != null ? Number(l.budgetMax) : '',
            'Immobilienart': l.preferredType ?? '',
            'Wunschlage': l.preferredLocation ?? '',
            'Mindest-Zimmer': l.minRooms ?? '',
            'Mindest-Fläche (m²)': l.minArea ?? '',
            'Zeitrahmen': l.timeFrame ?? '',
            'Finanzierung': l.financingStatus,
            'Eigenkapital': l.hasDownPayment ? 'Ja' : 'Nein',
            'Zugewiesen an': l.assignedTo ? `${l.assignedTo.firstName || ''} ${l.assignedTo.lastName || ''}`.trim() || l.assignedTo.email : '',
            'Notizen': l.notes ?? '',
            'Erstellt am': l.createdAt.toISOString().slice(0, 10),
            'Aktualisiert am': l.updatedAt.toISOString().slice(0, 10),
          }));
        };

        // ---- Build property rows ----
        const buildPropertyRows = async () => {
          const props = await getPrisma().property.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
          });
          return props.map(p => ({
            'ID': p.id,
            'Status': p.status,
            'Titel': p.title,
            'Typ': p.propertyType,
            'Vermarktungsart': p.marketingType,
            'Straße': p.street ?? '',
            'Hausnummer': p.houseNumber ?? '',
            'PLZ': p.zipCode ?? '',
            'Stadt': p.city ?? '',
            'Bezirk': p.district ?? '',
            'Bundesland': p.state ?? '',
            'Land': p.country,
            'Kaufpreis (€)': p.salePrice != null ? Number(p.salePrice) : '',
            'Kaltmiete (€)': p.rentCold != null ? Number(p.rentCold) : '',
            'Warmmiete (€)': p.rentWarm != null ? Number(p.rentWarm) : '',
            'Nebenkosten (€)': p.additionalCosts != null ? Number(p.additionalCosts) : '',
            'Kaution': p.deposit ?? '',
            'Provision': p.commission ?? '',
            'Wohnfläche (m²)': p.livingArea ?? '',
            'Nutzfläche (m²)': p.usableArea ?? '',
            'Grundstück (m²)': p.plotArea ?? '',
            'Zimmer': p.rooms ?? '',
            'Schlafzimmer': p.bedrooms ?? '',
            'Badezimmer': p.bathrooms ?? '',
            'Etage': p.floor ?? '',
            'Baujahr': p.yearBuilt ?? '',
            'Sanierungsjahr': p.yearRenovated ?? '',
            'Zustand': p.condition ?? '',
            'Heizung': p.heatingType ?? '',
            'Energieklasse': p.energyEfficiencyClass ?? '',
            'Energieverbrauch (kWh/m²a)': p.energyConsumption ?? '',
            'Beschreibung': p.description ?? '',
            'Erstellt am': p.createdAt.toISOString().slice(0, 10),
            'Aktualisiert am': p.updatedAt.toISOString().slice(0, 10),
          }));
        };

        // ---- Generate file buffer ----
        let fileBuffer: Buffer;
        let filename: string;
        let contentType: string;

        const timestamp = new Date().toISOString().slice(0, 10);

        if (useXlsx) {
          const XLSX = require('xlsx');
          const wb = XLSX.utils.book_new();

          if (exportType === 'leads' || exportType === 'all') {
            const rows = await buildLeadRows();
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, 'Leads');
          }
          if (exportType === 'properties' || exportType === 'all') {
            const rows = await buildPropertyRows();
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, 'Objekte');
          }

          const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
          fileBuffer = Buffer.from(xlsxBuffer);
          filename = exportType === 'all'
            ? `immivo-export-${timestamp}.xlsx`
            : exportType === 'leads'
              ? `leads-${timestamp}.xlsx`
              : `objekte-${timestamp}.xlsx`;
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
          // CSV
          const rows = exportType === 'leads' ? await buildLeadRows() : await buildPropertyRows();
          if (rows.length === 0) {
            return exportType === 'leads'
              ? 'Keine Leads gefunden.'
              : 'Keine Objekte gefunden.';
          }
          const headers = Object.keys(rows[0]);
          const csvLines = [
            headers.join(';'),
            ...rows.map(r => headers.map(h => {
              const val = String((r as any)[h] ?? '');
              return val.includes(';') || val.includes('"') || val.includes('\n')
                ? `"${val.replace(/"/g, '""')}"`
                : val;
            }).join(';'))
          ];
          fileBuffer = Buffer.from('\uFEFF' + csvLines.join('\r\n'), 'utf-8'); // BOM for Excel compatibility
          filename = exportType === 'leads'
            ? `leads-${timestamp}.csv`
            : `objekte-${timestamp}.csv`;
          contentType = 'text/csv; charset=utf-8';
        }

        // ---- Upload to S3 ----
        if (!mediaBucket) {
          return 'Export konnte nicht gespeichert werden: MEDIA_BUCKET_NAME ist nicht konfiguriert.';
        }

        const s3Key = `exports/${tenantId}/${filename}`;
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3();

        await s3.putObject({
          Bucket: mediaBucket,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: contentType,
          ContentDisposition: `attachment; filename="${filename}"`,
        }).promise();

        const fileUrl = cdnUrl
          ? `${cdnUrl}/${s3Key}`
          : `https://${mediaBucket}.s3.${region}.amazonaws.com/${s3Key}`;

        const typeLabel = exportType === 'all' ? 'Leads & Objekte' : exportType === 'leads' ? 'Leads' : 'Objekte';
        return {
          success: true,
          downloadUrl: fileUrl,
          filename,
          message: `Export fertig! ${typeLabel} als ${filename.endsWith('.xlsx') ? 'Excel' : 'CSV'} exportiert.`,
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

// Helper functions for text generation
function generatePropertyDescription(property: any, tone: string, maxLength: number): string {
  const toneStyles: Record<string, { intro: string; style: string }> = {
    professional: { 
      intro: 'Diese attraktive Immobilie', 
      style: 'überzeugt durch' 
    },
    luxurious: { 
      intro: 'Dieses exklusive Anwesen', 
      style: 'besticht durch' 
    },
    friendly: { 
      intro: 'Dieses wunderbare Zuhause', 
      style: 'bietet Ihnen' 
    },
    modern: { 
      intro: 'Dieses zeitgemäße Objekt', 
      style: 'punktet mit' 
    },
  };

  const { intro, style } = toneStyles[tone] || toneStyles.professional;
  
  let description = `${intro} in ${property.address || 'bester Lage'} ${style} `;
  
  const features: string[] = [];
  if (property.rooms) features.push(`${property.rooms} Zimmer`);
  if (property.area) features.push(`${property.area} m² Wohnfläche`);
  if (property.description) features.push(property.description);
  
  description += features.join(', ') || 'hervorragende Ausstattung';
  description += '.';

  if (property.price) {
    description += ` Der Preis beträgt ${property.price.toLocaleString('de-DE')} €.`;
  }

  return description.substring(0, maxLength);
}

function generateHeadline(property: any, tone: string): string {
  const prefixes: Record<string, string> = {
    professional: 'Attraktive',
    luxurious: 'Exklusive',
    friendly: 'Traumhafte',
    modern: 'Moderne',
  };

  const prefix = prefixes[tone] || prefixes.professional;
  const rooms = property.rooms ? `${property.rooms}-Zimmer-` : '';
  const type = 'Wohnung'; // Could be derived from property type
  const location = property.address?.split(',')[1]?.trim() || 'in Top-Lage';

  return `${prefix} ${rooms}${type} ${location}`;
}

function generateHighlights(property: any): string {
  const highlights: string[] = [];
  
  if (property.rooms) highlights.push(`• ${property.rooms} Zimmer`);
  if (property.area) highlights.push(`• ${property.area} m² Wohnfläche`);
  if (property.price) highlights.push(`• ${property.price.toLocaleString('de-DE')} €`);
  if (property.address) highlights.push(`• Lage: ${property.address}`);
  
  // Add from aiFacts if available
  if (property.aiFacts) {
    const facts = property.aiFacts.split('\n').filter((f: string) => f.trim());
    highlights.push(...facts.slice(0, 3).map((f: string) => f.startsWith('•') || f.startsWith('-') ? f : `• ${f}`));
  }

  return highlights.join('\n');
}

function generateLocationText(property: any, tone: string): string {
  if (!property.address) return 'Zentrale Lage mit guter Infrastruktur.';
  
  const parts = property.address.split(',');
  const city = parts[parts.length - 1]?.trim() || 'der Stadt';
  
  const templates: Record<string, string> = {
    professional: `Die Immobilie befindet sich in ${property.address}. Die Lage überzeugt durch gute Verkehrsanbindung und Infrastruktur.`,
    luxurious: `In exklusiver Lage in ${city} gelegen, bietet diese Adresse höchsten Wohnkomfort und Prestige.`,
    friendly: `Das Objekt liegt wunderbar zentral in ${city} - perfekt für alle, die das Stadtleben lieben.`,
    modern: `Urban und vernetzt: ${property.address} bietet beste Anbindung und moderne Infrastruktur.`,
  };

  return templates[tone] || templates.professional;
}

function generateHighlightsList(property: any): string[] {
  const highlights: string[] = [];
  
  if (property.rooms) highlights.push(`${property.rooms} großzügige Zimmer`);
  if (property.area) highlights.push(`${property.area} m² Wohnfläche`);
  highlights.push('Moderne Ausstattung');
  highlights.push('Helle Räume');
  if (property.address) {
    const city = property.address.split(',').pop()?.trim();
    if (city) highlights.push(`Zentrale Lage in ${city}`);
  }
  
  // Add from aiFacts if available
  if (property.aiFacts) {
    const facts = property.aiFacts.split('\n')
      .filter((f: string) => f.trim())
      .map((f: string) => f.replace(/^[•\-]\s*/, '').trim())
      .slice(0, 3);
    highlights.push(...facts);
  }

  return highlights.slice(0, 6);
}

function generateFeaturesList(property: any): string[] {
  const features: string[] = [
    'Einbauküche',
    'Fußbodenheizung',
    'Balkon/Terrasse',
    'Aufzug',
    'Tiefgarage',
    'Keller',
  ];

  // Could be enhanced with actual property features from database
  return features;
}

// Helper function for date periods
function getStartDateForPeriod(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return weekAgo;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return monthAgo;
    case 'year':
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      return yearAgo;
    default:
      const defaultMonthAgo = new Date(now);
      defaultMonthAgo.setMonth(now.getMonth() - 1);
      return defaultMonthAgo;
  }
}

// Tool executor for create_property
async function executeCreateProperty(args: any, tenantId: string) {
  const db = getPrisma();
  const property = await db.property.create({
    data: {
      tenantId,
      title: args.title,
      description: args.description || null,
      address: args.address || '',
      street: args.street || null,
      houseNumber: args.houseNumber || null,
      floor: args.floor != null ? parseInt(args.floor) : null,
      zipCode: args.zipCode || null,
      city: args.city || null,
      district: args.district || null,
      state: args.state || null,
      country: args.country || 'Deutschland',
      propertyType: args.propertyType || 'APARTMENT',
      marketingType: args.marketingType || 'SALE',
      salePrice: args.salePrice || null,
      rentCold: args.rentCold || null,
      rentWarm: args.rentWarm || null,
      additionalCosts: args.additionalCosts || null,
      deposit: args.deposit || null,
      commission: args.commission || null,
      livingArea: args.livingArea || args.area || null,
      usableArea: args.usableArea || null,
      plotArea: args.plotArea || null,
      rooms: args.rooms || null,
      bedrooms: args.bedrooms || null,
      bathrooms: args.bathrooms || null,
      yearBuilt: args.yearBuilt || null,
      yearRenovated: args.yearRenovated || null,
      condition: args.condition || null,
      buildingType: (['NEW_BUILDING', 'OLD_BUILDING', 'MONUMENT'].includes(args.buildingType))
        ? args.buildingType as any
        : null,
      totalFloors: args.totalFloors != null ? parseInt(args.totalFloors) : null,
      heatingType: args.heatingType || null,
      energyCertificateType: args.energyCertificateType || null,
      energyEfficiencyClass: args.energyEfficiencyClass || null,
      energyConsumption: args.energyConsumption || null,
      primaryEnergySource: args.primaryEnergySource || null,
      features: args.features || null,
      locationDescription: args.locationDescription || null,
      equipmentDescription: args.equipmentDescription || null,
      virtualTour: args.virtualTour || null,
      status: args.status || 'ACTIVE',
      priority: args.priority || 'MEDIUM',
      // Legacy fields for backward compatibility
      price: args.salePrice || args.price || null,
      area: args.livingArea || args.area || null,
      aiFacts: null,
      images: [],
      floorplans: [],
      videos: [],
    }
  });
  
  return `Objekt "${property.title}" wurde erfolgreich angelegt.`;
}

