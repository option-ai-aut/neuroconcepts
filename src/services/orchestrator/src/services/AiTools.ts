import { PrismaClient } from '@prisma/client';
import { SchemaType, FunctionDeclarationSchema } from '@google/generative-ai';

const prisma = new PrismaClient();

export const CRM_TOOLS = {
  create_lead: {
    name: "create_lead",
    description: "Creates a new lead in the CRM with contact info and buyer preferences.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        salutation: { type: SchemaType.STRING, description: "Salutation: NONE, MR (Herr), MS (Frau), DIVERSE (Divers)" } as FunctionDeclarationSchema,
        formalAddress: { type: SchemaType.BOOLEAN, description: "Use formal address (Sie) if true, informal (Du) if false. Default: true" } as FunctionDeclarationSchema,
        firstName: { type: SchemaType.STRING, description: "First name of the lead" } as FunctionDeclarationSchema,
        lastName: { type: SchemaType.STRING, description: "Last name of the lead" } as FunctionDeclarationSchema,
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
      required: ["email"]
    }
  },
  create_property: {
    name: "create_property",
    description: "Creates a new property/real estate object in the CRM with all details.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Property title (e.g., 'Moderne Wohnung in Berlin-Mitte')" } as FunctionDeclarationSchema,
        description: { type: SchemaType.STRING, description: "Detailed description of the property" } as FunctionDeclarationSchema,
        address: { type: SchemaType.STRING, description: "Street address" } as FunctionDeclarationSchema,
        zipCode: { type: SchemaType.STRING, description: "Postal code" } as FunctionDeclarationSchema,
        city: { type: SchemaType.STRING, description: "City" } as FunctionDeclarationSchema,
        propertyType: { type: SchemaType.STRING, description: "Type: APARTMENT, HOUSE, COMMERCIAL, LAND, GARAGE, OTHER" } as FunctionDeclarationSchema,
        marketingType: { type: SchemaType.STRING, description: "Marketing type: SALE, RENT, LEASE" } as FunctionDeclarationSchema,
        salePrice: { type: SchemaType.NUMBER, description: "Sale price in EUR (for SALE)" } as FunctionDeclarationSchema,
        rentCold: { type: SchemaType.NUMBER, description: "Cold rent in EUR/month (for RENT)" } as FunctionDeclarationSchema,
        additionalCosts: { type: SchemaType.NUMBER, description: "Additional costs in EUR/month" } as FunctionDeclarationSchema,
        livingArea: { type: SchemaType.NUMBER, description: "Living area in m²" } as FunctionDeclarationSchema,
        rooms: { type: SchemaType.NUMBER, description: "Number of rooms" } as FunctionDeclarationSchema,
        bedrooms: { type: SchemaType.NUMBER, description: "Number of bedrooms" } as FunctionDeclarationSchema,
        bathrooms: { type: SchemaType.NUMBER, description: "Number of bathrooms" } as FunctionDeclarationSchema,
        yearBuilt: { type: SchemaType.NUMBER, description: "Year built (YYYY)" } as FunctionDeclarationSchema,
        condition: { type: SchemaType.STRING, description: "Condition: FIRST_OCCUPANCY, NEW, RENOVATED, REFURBISHED, WELL_MAINTAINED, MODERNIZED, NEEDS_RENOVATION" } as FunctionDeclarationSchema,
        energyEfficiencyClass: { type: SchemaType.STRING, description: "Energy efficiency class: A_PLUS, A, B, C, D, E, F, G, H" } as FunctionDeclarationSchema,
        primaryEnergySource: { type: SchemaType.STRING, description: "Primary energy source (e.g., Gas, Fernwärme)" } as FunctionDeclarationSchema,
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
    description: "Retrieves all leads from the CRM. Can filter by status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING, description: "Filter by status: NEW, CONTACTED, QUALIFIED, LOST" } as FunctionDeclarationSchema,
        limit: { type: SchemaType.NUMBER, description: "Maximum number of leads to return (default: 50)" } as FunctionDeclarationSchema,
      }
    }
  },
  get_lead: {
    name: "get_lead",
    description: "Retrieves a specific lead by ID.",
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
      },
      required: ["leadId"]
    }
  },
  delete_lead: {
    name: "delete_lead",
    description: "Deletes a lead from the CRM. Use with caution!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leadId: { type: SchemaType.STRING, description: "ID of the lead to delete" } as FunctionDeclarationSchema,
      },
      required: ["leadId"]
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
    description: "Updates an existing property's information including all new fields.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property to update" } as FunctionDeclarationSchema,
        title: { type: SchemaType.STRING, description: "Property title" } as FunctionDeclarationSchema,
        description: { type: SchemaType.STRING, description: "Description" } as FunctionDeclarationSchema,
        address: { type: SchemaType.STRING, description: "Street address" } as FunctionDeclarationSchema,
        zipCode: { type: SchemaType.STRING, description: "Postal code" } as FunctionDeclarationSchema,
        city: { type: SchemaType.STRING, description: "City" } as FunctionDeclarationSchema,
        propertyType: { type: SchemaType.STRING, description: "Type: APARTMENT, HOUSE, COMMERCIAL, LAND, GARAGE, OTHER" } as FunctionDeclarationSchema,
        marketingType: { type: SchemaType.STRING, description: "Marketing type: SALE, RENT, LEASE" } as FunctionDeclarationSchema,
        salePrice: { type: SchemaType.NUMBER, description: "Sale price in EUR" } as FunctionDeclarationSchema,
        rentCold: { type: SchemaType.NUMBER, description: "Cold rent in EUR/month" } as FunctionDeclarationSchema,
        additionalCosts: { type: SchemaType.NUMBER, description: "Additional costs in EUR/month" } as FunctionDeclarationSchema,
        livingArea: { type: SchemaType.NUMBER, description: "Living area in m²" } as FunctionDeclarationSchema,
        rooms: { type: SchemaType.NUMBER, description: "Number of rooms" } as FunctionDeclarationSchema,
        bedrooms: { type: SchemaType.NUMBER, description: "Number of bedrooms" } as FunctionDeclarationSchema,
        bathrooms: { type: SchemaType.NUMBER, description: "Number of bathrooms" } as FunctionDeclarationSchema,
        yearBuilt: { type: SchemaType.NUMBER, description: "Year built (YYYY)" } as FunctionDeclarationSchema,
        condition: { type: SchemaType.STRING, description: "Condition: FIRST_OCCUPANCY, NEW, RENOVATED, REFURBISHED, WELL_MAINTAINED, MODERNIZED, NEEDS_RENOVATION" } as FunctionDeclarationSchema,
        energyEfficiencyClass: { type: SchemaType.STRING, description: "Energy efficiency class: A_PLUS, A, B, C, D, E, F, G, H" } as FunctionDeclarationSchema,
        primaryEnergySource: { type: SchemaType.STRING, description: "Primary energy source" } as FunctionDeclarationSchema,
        status: { type: SchemaType.STRING, description: "Status: ACTIVE, RESERVED, SOLD, RENTED, ARCHIVED" } as FunctionDeclarationSchema,
      },
      required: ["propertyId"]
    }
  },
  delete_property: {
    name: "delete_property",
    description: "Deletes a property from the CRM. Use with caution!",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        propertyId: { type: SchemaType.STRING, description: "ID of the property to delete" } as FunctionDeclarationSchema,
      },
      required: ["propertyId"]
    }
  },
  // === EMAIL TOOLS ===
  get_emails: {
    name: "get_emails",
    description: "Retrieves emails from the inbox. Can filter by status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: { type: SchemaType.STRING, description: "Filter by status: UNREAD, READ, ARCHIVED" } as FunctionDeclarationSchema,
        limit: { type: SchemaType.NUMBER, description: "Maximum number of emails (default: 50)" } as FunctionDeclarationSchema,
      }
    }
  },
  get_email: {
    name: "get_email",
    description: "Retrieves a specific email by ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        emailId: { type: SchemaType.STRING, description: "ID of the email" } as FunctionDeclarationSchema,
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
    description: "Retrieves calendar events for a date range.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        start: { type: SchemaType.STRING, description: "Start date (ISO string)" } as FunctionDeclarationSchema,
        end: { type: SchemaType.STRING, description: "End date (ISO string)" } as FunctionDeclarationSchema,
      },
      required: ["start", "end"]
    }
  },
  create_calendar_event: {
    name: "create_calendar_event",
    description: "Creates a new calendar event/appointment.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Event title" } as FunctionDeclarationSchema,
        description: { type: SchemaType.STRING, description: "Event description" } as FunctionDeclarationSchema,
        start: { type: SchemaType.STRING, description: "Start date/time (ISO string)" } as FunctionDeclarationSchema,
        end: { type: SchemaType.STRING, description: "End date/time (ISO string)" } as FunctionDeclarationSchema,
        location: { type: SchemaType.STRING, description: "Event location" } as FunctionDeclarationSchema,
        attendees: { type: SchemaType.STRING, description: "Comma-separated email addresses" } as FunctionDeclarationSchema,
      },
      required: ["title", "start", "end"]
    }
  },
  update_calendar_event: {
    name: "update_calendar_event",
    description: "Updates an existing calendar event.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        eventId: { type: SchemaType.STRING, description: "ID of the event" } as FunctionDeclarationSchema,
        title: { type: SchemaType.STRING, description: "New title" } as FunctionDeclarationSchema,
        start: { type: SchemaType.STRING, description: "New start time" } as FunctionDeclarationSchema,
        end: { type: SchemaType.STRING, description: "New end time" } as FunctionDeclarationSchema,
      },
      required: ["eventId"]
    }
  },
  delete_calendar_event: {
    name: "delete_calendar_event",
    description: "Deletes a calendar event.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        eventId: { type: SchemaType.STRING, description: "ID of the event to delete" } as FunctionDeclarationSchema,
      },
      required: ["eventId"]
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
  },
  
  // === EXPOSÉ TOOLS (non-editor) ===
  get_exposes: {
    name: "get_exposes",
    description: "Retrieves all Exposés. Can filter by status.",
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
  delete_expose: {
    name: "delete_expose",
    description: "Deletes an Exposé.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé to delete" } as FunctionDeclarationSchema,
      },
      required: ["exposeId"]
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
  
  // === TEAM CHAT TOOLS ===
  get_channels: {
    name: "get_channels",
    description: "Retrieves all team chat channels.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: "Maximum number (default: 50)" } as FunctionDeclarationSchema,
      }
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
  send_channel_message: {
    name: "send_channel_message",
    description: "Sends a message to a team chat channel.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        channelId: { type: SchemaType.STRING, description: "ID of the channel" } as FunctionDeclarationSchema,
        content: { type: SchemaType.STRING, description: "Message content" } as FunctionDeclarationSchema,
      },
      required: ["channelId", "content"]
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
    description: "Retrieves all Exposé templates.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: "Maximum number (default: 50)" } as FunctionDeclarationSchema,
      }
    }
  },
};

// Exposé Tools for Jarvis - Full palette of block types
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
    description: "Creates a complete professional Exposé with all necessary blocks based on property data and user preferences. This is the main tool for generating a full Exposé.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé to populate" } as FunctionDeclarationSchema,
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
      required: ["exposeId"]
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
  }
};

export class AiToolExecutor {
  static async execute(toolName: string, args: any, tenantId: string) {
    console.log(`Executing tool ${toolName} for tenant ${tenantId} with args:`, args);

    switch (toolName) {
      // CRM Tools
      case 'create_lead': {
        const { 
          salutation, formalAddress, firstName, lastName, email, phone, message,
          budgetMin, budgetMax, preferredType, preferredLocation,
          minRooms, minArea, timeFrame, financingStatus, source
        } = args;
        
        return await prisma.lead.create({
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
            } : undefined
          }
        });
      }

      case 'get_leads': {
        const { status, limit = 50 } = args;
        return await prisma.lead.findMany({
          where: { 
            tenantId,
            ...(status && { status })
          },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      case 'get_lead': {
        const { leadId } = args;
        return await prisma.lead.findFirst({
          where: { id: leadId, tenantId },
          include: { messages: true }
        });
      }

      case 'update_lead': {
        const { leadId, ...updateData } = args;
        return await prisma.lead.update({
          where: { id: leadId },
          data: updateData
        });
      }

      case 'delete_lead': {
        const { leadId } = args;
        await prisma.lead.delete({ where: { id: leadId } });
        return `Lead ${leadId} wurde gelöscht.`;
      }

      case 'create_property':
        return await executeCreateProperty(args, tenantId);

      case 'get_properties': {
        const { limit = 50 } = args;
        return await prisma.property.findMany({
          where: { tenantId },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      case 'get_property': {
        const { propertyId } = args;
        return await prisma.property.findFirst({
          where: { id: propertyId, tenantId }
        });
      }

      case 'update_property': {
        const { propertyId, ...updateData } = args;
        return await prisma.property.update({
          where: { id: propertyId },
          data: updateData
        });
      }

      case 'delete_property': {
        const { propertyId } = args;
        await prisma.property.delete({ where: { id: propertyId } });
        return `Property ${propertyId} wurde gelöscht.`;
      }

      case 'search_properties': {
        const { query, minPrice, maxPrice } = args;
        
        return await prisma.property.findMany({
          where: {
            tenantId,
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
      }

      // === EMAIL TOOLS ===
      case 'get_emails': {
        const { status, limit = 50 } = args;
        // TODO: Implement actual email fetching when email system is ready
        return { message: "Email-System noch nicht implementiert. Coming soon!" };
      }

      case 'get_email': {
        const { emailId } = args;
        return { message: "Email-System noch nicht implementiert. Coming soon!" };
      }

      case 'draft_email': {
        const { to, subject, body, leadId } = args;
        return { message: `Email-Entwurf erstellt an ${to} mit Betreff "${subject}". Noch nicht implementiert.` };
      }

      case 'send_email': {
        const { to, subject, body, leadId } = args;
        return { message: `Email würde gesendet an ${to}. Email-System noch nicht implementiert.` };
      }

      case 'reply_to_email': {
        const { emailId, body } = args;
        return { message: "Email-Antwort noch nicht implementiert. Coming soon!" };
      }

      // === CALENDAR TOOLS ===
      case 'get_calendar_events': {
        const { start, end } = args;
        // TODO: Implement Google/Outlook Calendar integration
        return { message: "Kalender-Integration noch nicht implementiert. Coming soon!" };
      }

      case 'create_calendar_event': {
        const { title, description, start, end, location, attendees } = args;
        return { message: `Termin "${title}" würde erstellt für ${start}. Kalender-Integration noch nicht implementiert.` };
      }

      case 'update_calendar_event': {
        const { eventId, title, start, end } = args;
        return { message: "Termin-Aktualisierung noch nicht implementiert. Coming soon!" };
      }

      case 'delete_calendar_event': {
        const { eventId } = args;
        return { message: "Termin-Löschung noch nicht implementiert. Coming soon!" };
      }

      case 'get_calendar_availability':
        return [
          { start: args.start, end: args.end, status: 'available' }
        ];

      // === EXPOSÉ TOOLS (non-editor) ===
      case 'get_exposes': {
        const { status, propertyId, limit = 50 } = args;
        return await prisma.expose.findMany({
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
        const template = await prisma.exposeTemplate.findFirst({
          where: { id: templateId, tenantId }
        });
        if (!template) return { error: "Template nicht gefunden" };

        const property = await prisma.property.findFirst({
          where: { id: propertyId, tenantId }
        });
        if (!property) return { error: "Property nicht gefunden" };

        const expose = await prisma.expose.create({
          data: {
            tenantId,
            propertyId,
            templateId,
            blocks: template.blocks as any,
            status: 'DRAFT'
          }
        });
        return `Exposé erstellt (ID: ${expose.id}) für Property "${property.title}".`;
      }

      case 'delete_expose': {
        const { exposeId } = args;
        await prisma.expose.delete({ where: { id: exposeId } });
        return `Exposé ${exposeId} wurde gelöscht.`;
      }

      case 'generate_expose_pdf': {
        const { exposeId } = args;
        return { message: `PDF-Generierung für Exposé ${exposeId} würde gestartet. Nutze /exposes/${exposeId}/pdf Endpoint.` };
      }

      // === TEAM CHAT TOOLS ===
      case 'get_channels': {
        const { limit = 50 } = args;
        return await prisma.channel.findMany({
          where: { tenantId },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      case 'get_channel_messages': {
        const { channelId, limit = 50 } = args;
        return await prisma.channelMessage.findMany({
          where: { channelId },
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      case 'send_channel_message': {
        const { channelId, content } = args;
        // TODO: Get actual userId from context
        const userId = 'jarvis-bot-id'; // Placeholder
        const message = await prisma.channelMessage.create({
          data: {
            channelId,
            userId,
            content
          }
        });
        return `Nachricht gesendet in Channel ${channelId}.`;
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
        
        const leads = await prisma.lead.findMany({
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
          conversionRate: byStatus.QUALIFIED ? (byStatus.QUALIFIED / leads.length * 100).toFixed(1) + '%' : '0%'
        };
      }

      case 'get_property_statistics': {
        const { period = 'month' } = args;
        const startDate = getStartDateForPeriod(period);
        
        const properties = await prisma.property.findMany({
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
        return await prisma.emailTemplate.findMany({
          where: { tenantId },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      case 'get_expose_templates': {
        const { limit = 50 } = args;
        return await prisma.exposeTemplate.findMany({
          where: { tenantId },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }

      // Exposé Tools (Editor-specific)
      case 'create_expose_block': {
        const { exposeId, templateId, blockType, position, ...blockFields } = args;
        
        let blocks: any[] = [];
        let targetId: string;
        let isTemplate = false;
        
        // Determine if we're working with an expose or template
        if (templateId) {
          const template = await prisma.exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');
          blocks = (template.blocks as any[]) || [];
          targetId = templateId;
          isTemplate = true;
        } else if (exposeId) {
          const expose = await prisma.expose.findFirst({
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
          await prisma.exposeTemplate.update({
            where: { id: targetId },
            data: { blocks }
          });
        } else {
          await prisma.expose.update({
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
          const template = await prisma.exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');
          blocks = (template.blocks as any[]) || [];
          targetId = templateId;
          isTemplate = true;
        } else if (exposeId) {
          const expose = await prisma.expose.findFirst({
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
          await prisma.exposeTemplate.update({
            where: { id: targetId },
            data: { blocks }
          });
        } else {
          await prisma.expose.update({
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
          const template = await prisma.exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');
          blocks = (template.blocks as any[]) || [];
          targetId = templateId;
          isTemplate = true;
        } else if (exposeId) {
          const expose = await prisma.expose.findFirst({
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
          await prisma.exposeTemplate.update({
            where: { id: targetId },
            data: { blocks: newBlocks }
          });
        } else {
          await prisma.expose.update({
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
          const template = await prisma.exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');
          blocks = (template.blocks as any[]) || [];
          targetId = templateId;
          isTemplate = true;
        } else if (exposeId) {
          const expose = await prisma.expose.findFirst({
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
          await prisma.exposeTemplate.update({
            where: { id: targetId },
            data: { blocks }
          });
        } else {
          await prisma.expose.update({
            where: { id: targetId },
            data: { blocks }
          });
        }

        return { success: true, newOrder: blocks.map(b => b.id), isTemplate };
      }

      case 'generate_expose_text': {
        const { propertyId, textType, tone = 'professional', maxLength = 500 } = args;
        
        const property = await prisma.property.findFirst({
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
        
        const expose = await prisma.expose.findFirst({
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

        const expose = await prisma.expose.findFirst({
          where: { id: exposeId, property: { tenantId } }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        await prisma.expose.update({
          where: { id: exposeId },
          data: { status }
        });

        return { success: true, newStatus: status };
      }

      case 'create_full_expose': {
        const { exposeId, style = 'professional', includeBlocks, theme = 'default', customInstructions } = args;
        
        const expose = await prisma.expose.findFirst({
          where: { id: exposeId, property: { tenantId } },
          include: { property: true }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        const property = expose.property;
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
                title: generateHeadline(property, tone),
                subtitle: property.address || '',
                imageUrl: (property as any).images?.[0] || '',
              });
              break;

            case 'stats':
              blocks.push({
                id: blockId,
                type: 'stats',
                items: [
                  { label: 'Zimmer', value: property.rooms?.toString() || '-' },
                  { label: 'Wohnfläche', value: property.area ? `${property.area} m²` : '-' },
                  { label: 'Preis', value: property.price ? `${Number(property.price).toLocaleString('de-DE')} €` : '-' },
                ],
              });
              break;

            case 'description':
              blocks.push({
                id: blockId,
                type: 'text',
                title: 'Objektbeschreibung',
                content: generatePropertyDescription(property, tone, 800),
                style: 'normal',
              });
              break;

            case 'highlights':
              const highlightItems = generateHighlightsList(property);
              blocks.push({
                id: blockId,
                type: 'highlights',
                title: 'Highlights',
                items: highlightItems,
              });
              break;

            case 'gallery':
              const images = (property as any).images || [];
              // Always add gallery block, even if empty (will be filled from property)
              blocks.push({
                id: blockId,
                type: 'gallery',
                images: images.slice(0, 6),
                columns: images.length > 4 ? 3 : 2,
              });
              break;

            case 'floorplan':
              const floorplans = (property as any).floorplans || [];
              blocks.push({
                id: blockId,
                type: 'floorplan',
                title: 'Grundriss',
                imageUrl: floorplans[0] || '', // First floorplan
              });
              break;

            case 'location':
              blocks.push({
                id: blockId,
                type: 'location',
                title: 'Lage & Umgebung',
                address: property.address || '',
                description: generateLocationText(property, tone),
              });
              break;

            case 'features':
              blocks.push({
                id: blockId,
                type: 'features',
                title: 'Ausstattung',
                items: generateFeaturesList(property),
              });
              break;

            case 'energyCertificate':
              blocks.push({
                id: blockId,
                type: 'energyCertificate',
                energyClass: 'B', // Placeholder
                consumption: '85 kWh/(m²·a)',
              });
              break;

            case 'priceTable':
              blocks.push({
                id: blockId,
                type: 'priceTable',
                title: 'Kosten',
                items: [
                  { label: 'Kaltmiete', value: property.price ? `${Number(property.price).toLocaleString('de-DE')} €` : '-' },
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

        // Update expose with new blocks and theme
        await prisma.expose.update({
          where: { id: exposeId },
          data: { 
            blocks,
            theme,
          }
        });

        return { 
          success: true, 
          blocksCreated: blocks.length,
          blockTypes: blocks.map(b => b.type),
          theme,
          message: `Exposé wurde mit ${blocks.length} Blöcken erstellt.`
        };
      }

      case 'set_expose_theme': {
        const { exposeId, theme } = args;
        
        const validThemes = ['default', 'modern', 'elegant', 'minimal', 'luxury'];
        if (!validThemes.includes(theme)) {
          throw new Error(`Invalid theme. Must be one of: ${validThemes.join(', ')}`);
        }

        const expose = await prisma.expose.findFirst({
          where: { id: exposeId, property: { tenantId } }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        await prisma.expose.update({
          where: { id: exposeId },
          data: { theme }
        });

        return { success: true, newTheme: theme };
      }

      case 'clear_expose_blocks': {
        const { exposeId, templateId } = args;
        
        if (templateId) {
          const template = await prisma.exposeTemplate.findFirst({
            where: { id: templateId, tenantId }
          });
          if (!template) throw new Error('Template not found or access denied');

          await prisma.exposeTemplate.update({
            where: { id: templateId },
            data: { blocks: [] }
          });

          return { success: true, message: 'Alle Blöcke wurden aus dem Template entfernt.', isTemplate: true };
        } else if (exposeId) {
          const expose = await prisma.expose.findFirst({
            where: { id: exposeId, property: { tenantId } }
          });
          if (!expose) throw new Error('Exposé not found or access denied');

          await prisma.expose.update({
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
        
        const template = await prisma.exposeTemplate.findFirst({
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
        
        const template = await prisma.exposeTemplate.findFirst({
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

        await prisma.exposeTemplate.update({
          where: { id: templateId },
          data: updateData
        });

        return { success: true, updated: Object.keys(updateData) };
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
  const property = await prisma.property.create({
    data: {
      tenantId,
      title: args.title,
      description: args.description || null,
      address: args.address || '',
      zipCode: args.zipCode || null,
      city: args.city || null,
      propertyType: args.propertyType || 'APARTMENT',
      marketingType: args.marketingType || 'SALE',
      salePrice: args.salePrice || null,
      rentCold: args.rentCold || null,
      additionalCosts: args.additionalCosts || null,
      livingArea: args.livingArea || args.area || null,
      rooms: args.rooms || null,
      bedrooms: args.bedrooms || null,
      bathrooms: args.bathrooms || null,
      yearBuilt: args.yearBuilt || null,
      condition: args.condition || null,
      energyEfficiencyClass: args.energyEfficiencyClass || null,
      primaryEnergySource: args.primaryEnergySource || null,
      // Legacy fields for backward compatibility
      price: args.salePrice || args.price || null,
      area: args.livingArea || args.area || null,
      aiFacts: null,
      images: [],
      floorplans: [],
      videos: [],
    }
  });
  
  return `Objekt "${property.title}" wurde erfolgreich angelegt (ID: ${property.id}).`;
}

