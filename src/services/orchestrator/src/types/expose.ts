// Exposé Block Types
// These define the structure of blocks in both templates and instances

export type ExposeBlockType = 
  | 'hero'
  | 'stats'
  | 'text'
  | 'gallery'
  | 'floorplan'
  | 'location'
  | 'contact'
  | 'divider'
  | 'features';

// Base block interface
interface BaseBlock {
  id: string;
  type: ExposeBlockType;
}

// Hero Block - Main image with title
export interface HeroBlock extends BaseBlock {
  type: 'hero';
  imageUrl: string; // or "{{property.images[0]}}" in templates
  title: string;    // or "{{property.title}}"
  subtitle?: string;
}

// Stats Block - Key figures grid
export interface StatsBlock extends BaseBlock {
  type: 'stats';
  items: {
    label: string;
    value: string;  // or "{{property.price}}"
    icon?: string;  // Lucide icon name
  }[];
}

// Text Block - Description or any text content
export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;  // or "{{property.description}}"
  style?: 'normal' | 'highlight' | 'quote';
}

// Gallery Block - Multiple images
export interface GalleryBlock extends BaseBlock {
  type: 'gallery';
  images: {
    url: string;
    caption?: string;
  }[];
  layout?: 'grid' | 'carousel' | 'masonry';
}

// Floorplan Block - Floor plan image
export interface FloorplanBlock extends BaseBlock {
  type: 'floorplan';
  imageUrl: string;
  rooms?: string;
  area?: string;
}

// Location Block - Address and map
export interface LocationBlock extends BaseBlock {
  type: 'location';
  address: string;
  description?: string;
  showMap?: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Contact Block - Agent contact info
export interface ContactBlock extends BaseBlock {
  type: 'contact';
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
}

// Divider Block - Visual separator
export interface DividerBlock extends BaseBlock {
  type: 'divider';
  style?: 'line' | 'space' | 'dots';
}

// Features Block - List of features/amenities
export interface FeaturesBlock extends BaseBlock {
  type: 'features';
  title?: string;
  items: {
    icon?: string;
    text: string;
  }[];
  columns?: 1 | 2 | 3;
}

// Union type for all blocks
export type ExposeBlock = 
  | HeroBlock
  | StatsBlock
  | TextBlock
  | GalleryBlock
  | FloorplanBlock
  | LocationBlock
  | ContactBlock
  | DividerBlock
  | FeaturesBlock;

// Template with placeholders
export interface ExposeTemplateData {
  blocks: ExposeBlock[];
  theme: 'default' | 'modern' | 'classic' | 'luxury';
}

// Available themes
export const EXPOSE_THEMES = {
  default: {
    name: 'Standard',
    primaryColor: '#4F46E5', // Indigo
    fontFamily: 'Geist Sans',
  },
  modern: {
    name: 'Modern',
    primaryColor: '#0F172A', // Slate
    fontFamily: 'Inter',
  },
  classic: {
    name: 'Klassisch',
    primaryColor: '#78350F', // Amber
    fontFamily: 'Georgia',
  },
  luxury: {
    name: 'Luxus',
    primaryColor: '#1E1E1E', // Black
    fontFamily: 'Playfair Display',
  },
} as const;

// Default template blocks (used when creating new template)
export const DEFAULT_TEMPLATE_BLOCKS: ExposeBlock[] = [
  {
    id: 'hero-1',
    type: 'hero',
    imageUrl: '{{property.images[0]}}',
    title: '{{property.title}}',
    subtitle: '{{property.address}}',
  },
  {
    id: 'stats-1',
    type: 'stats',
    items: [
      { label: 'Kaltmiete', value: '{{property.price}} €', icon: 'Euro' },
      { label: 'Zimmer', value: '{{property.rooms}}', icon: 'BedDouble' },
      { label: 'Fläche', value: '{{property.area}} m²', icon: 'Maximize' },
    ],
  },
  {
    id: 'text-1',
    type: 'text',
    content: '{{property.description}}',
    style: 'normal',
  },
  {
    id: 'gallery-1',
    type: 'gallery',
    images: [], // Will be filled with {{property.images}}
    layout: 'grid',
  },
  {
    id: 'features-1',
    type: 'features',
    title: 'Ausstattung',
    items: [], // Will be filled from aiFacts
    columns: 2,
  },
  {
    id: 'location-1',
    type: 'location',
    address: '{{property.address}}',
    showMap: true,
  },
  {
    id: 'contact-1',
    type: 'contact',
    name: '{{user.name}}',
    role: 'Ihr Ansprechpartner',
    phone: '{{user.phone}}',
    email: '{{user.email}}',
  },
];
