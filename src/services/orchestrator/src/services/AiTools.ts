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

// Exposé Tools for Jarvis
export const EXPOSE_TOOLS = {
  create_expose_block: {
    name: "create_expose_block",
    description: "Creates a new block in an Exposé. Use this to add content sections like hero images, text, stats, galleries, etc.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé to modify" } as FunctionDeclarationSchema,
        blockType: { 
          type: SchemaType.STRING, 
          description: "Type of block: hero, text, stats, gallery, location, contact, divider, features" 
        } as FunctionDeclarationSchema,
        position: { type: SchemaType.NUMBER, description: "Position index where to insert the block (0-based)" } as FunctionDeclarationSchema,
        content: { type: SchemaType.STRING, description: "Text content for text blocks" } as FunctionDeclarationSchema,
        title: { type: SchemaType.STRING, description: "Title for hero or section blocks" } as FunctionDeclarationSchema,
        subtitle: { type: SchemaType.STRING, description: "Subtitle for hero blocks" } as FunctionDeclarationSchema,
        imageUrl: { type: SchemaType.STRING, description: "Image URL for hero or gallery blocks" } as FunctionDeclarationSchema,
      },
      required: ["exposeId", "blockType"]
    }
  },
  update_expose_block: {
    name: "update_expose_block",
    description: "Updates an existing block in an Exposé. Use this to modify content, images, or styling of a block.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé" } as FunctionDeclarationSchema,
        blockId: { type: SchemaType.STRING, description: "ID of the block to update" } as FunctionDeclarationSchema,
        content: { type: SchemaType.STRING, description: "New text content" } as FunctionDeclarationSchema,
        title: { type: SchemaType.STRING, description: "New title" } as FunctionDeclarationSchema,
        subtitle: { type: SchemaType.STRING, description: "New subtitle" } as FunctionDeclarationSchema,
        imageUrl: { type: SchemaType.STRING, description: "New image URL" } as FunctionDeclarationSchema,
        style: { type: SchemaType.STRING, description: "Style variant (normal, highlight, quote)" } as FunctionDeclarationSchema,
      },
      required: ["exposeId", "blockId"]
    }
  },
  delete_expose_block: {
    name: "delete_expose_block",
    description: "Removes a block from an Exposé.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé" } as FunctionDeclarationSchema,
        blockId: { type: SchemaType.STRING, description: "ID of the block to delete" } as FunctionDeclarationSchema,
      },
      required: ["exposeId", "blockId"]
    }
  },
  reorder_expose_blocks: {
    name: "reorder_expose_blocks",
    description: "Reorders blocks in an Exposé by moving a block to a new position.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé" } as FunctionDeclarationSchema,
        blockId: { type: SchemaType.STRING, description: "ID of the block to move" } as FunctionDeclarationSchema,
        newPosition: { type: SchemaType.NUMBER, description: "New position index (0-based)" } as FunctionDeclarationSchema,
      },
      required: ["exposeId", "blockId", "newPosition"]
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
    description: "Removes all blocks from an Exposé to start fresh.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        exposeId: { type: SchemaType.STRING, description: "ID of the Exposé" } as FunctionDeclarationSchema,
      },
      required: ["exposeId"]
    }
  }
};

export class AiToolExecutor {
  static async execute(toolName: string, args: any, tenantId: string) {
    console.log(`Executing tool ${toolName} for tenant ${tenantId} with args:`, args);

    switch (toolName) {
      // CRM Tools
      case 'create_lead': {
        const { firstName, lastName, email, phone, message } = args;
        
        return await prisma.lead.create({
          data: {
            firstName,
            lastName,
            email,
            phone,
            tenantId,
            messages: message ? {
              create: { role: 'USER', content: message }
            } : undefined
          }
        });
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

      case 'get_calendar_availability':
        return [
          { start: args.start, end: args.end, status: 'available' }
        ];

      // Exposé Tools
      case 'create_expose_block': {
        const { exposeId, blockType, position, content, title, subtitle, imageUrl, items } = args;
        
        // Verify expose belongs to tenant
        const expose = await prisma.expose.findFirst({
          where: { id: exposeId, property: { tenantId } },
          include: { property: true }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        const blocks = (expose.blocks as any[]) || [];
        const newBlock: any = {
          id: `${blockType}-${Date.now()}`,
          type: blockType,
        };

        // Add type-specific fields
        if (content) newBlock.content = content;
        if (title) newBlock.title = title;
        if (subtitle) newBlock.subtitle = subtitle;
        if (imageUrl) newBlock.imageUrl = imageUrl;
        if (items) newBlock.items = items;

        // Insert at position or append
        const insertPos = position !== undefined ? Math.min(position, blocks.length) : blocks.length;
        blocks.splice(insertPos, 0, newBlock);

        await prisma.expose.update({
          where: { id: exposeId },
          data: { blocks }
        });

        return { success: true, block: newBlock, totalBlocks: blocks.length };
      }

      case 'update_expose_block': {
        const { exposeId, blockId, ...updates } = args;
        
        const expose = await prisma.expose.findFirst({
          where: { id: exposeId, property: { tenantId } }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        const blocks = (expose.blocks as any[]) || [];
        const blockIndex = blocks.findIndex(b => b.id === blockId);
        if (blockIndex === -1) throw new Error('Block not found');

        // Update block with provided fields
        blocks[blockIndex] = { ...blocks[blockIndex], ...updates };

        await prisma.expose.update({
          where: { id: exposeId },
          data: { blocks }
        });

        return { success: true, block: blocks[blockIndex] };
      }

      case 'delete_expose_block': {
        const { exposeId, blockId } = args;
        
        const expose = await prisma.expose.findFirst({
          where: { id: exposeId, property: { tenantId } }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        const blocks = (expose.blocks as any[]) || [];
        const newBlocks = blocks.filter(b => b.id !== blockId);

        if (newBlocks.length === blocks.length) {
          throw new Error('Block not found');
        }

        await prisma.expose.update({
          where: { id: exposeId },
          data: { blocks: newBlocks }
        });

        return { success: true, remainingBlocks: newBlocks.length };
      }

      case 'reorder_expose_blocks': {
        const { exposeId, blockId, newPosition } = args;
        
        const expose = await prisma.expose.findFirst({
          where: { id: exposeId, property: { tenantId } }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        const blocks = (expose.blocks as any[]) || [];
        const currentIndex = blocks.findIndex(b => b.id === blockId);
        if (currentIndex === -1) throw new Error('Block not found');

        // Remove and reinsert at new position
        const [block] = blocks.splice(currentIndex, 1);
        const insertPos = Math.min(Math.max(0, newPosition), blocks.length);
        blocks.splice(insertPos, 0, block);

        await prisma.expose.update({
          where: { id: exposeId },
          data: { blocks }
        });

        return { success: true, newOrder: blocks.map(b => b.id) };
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
        const { exposeId } = args;
        
        const expose = await prisma.expose.findFirst({
          where: { id: exposeId, property: { tenantId } }
        });
        if (!expose) throw new Error('Exposé not found or access denied');

        await prisma.expose.update({
          where: { id: exposeId },
          data: { blocks: [] }
        });

        return { success: true, message: 'Alle Blöcke wurden entfernt.' };
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
