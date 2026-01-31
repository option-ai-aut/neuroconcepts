import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

interface ExposeBlock {
  id: string;
  type: string;
  [key: string]: any;
}

interface ExposeData {
  id: string;
  blocks: ExposeBlock[];
  theme: string;
  property: {
    title: string;
    address: string;
    price: number;
    area: number;
    rooms: number;
    description?: string;
    images?: string[];
  };
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  lead?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

// Theme colors
const THEMES: Record<string, { primary: string; secondary: string; accent: string }> = {
  default: { primary: '#4F46E5', secondary: '#1F2937', accent: '#6366F1' },
  modern: { primary: '#0F172A', secondary: '#334155', accent: '#3B82F6' },
  elegant: { primary: '#78350F', secondary: '#451A03', accent: '#D97706' },
  minimal: { primary: '#18181B', secondary: '#3F3F46', accent: '#71717A' },
};

export class PdfService {
  
  // Generate QR code as data URL
  private static async generateQrCode(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, {
        width: 120,
        margin: 1,
        color: { dark: '#1F2937', light: '#FFFFFF' }
      });
    } catch (error) {
      console.error('QR code generation failed:', error);
      return '';
    }
  }
  
  static async generateExposePdf(expose: ExposeData): Promise<Buffer> {
    // Pre-generate QR codes for video/tour blocks
    const qrCodes: Record<string, string> = {};
    for (const block of expose.blocks) {
      if (block.type === 'video' && block.videoUrl) {
        qrCodes[block.id] = await this.generateQrCode(block.videoUrl);
      }
      if (block.type === 'virtualTour' && block.tourUrl) {
        qrCodes[block.id] = await this.generateQrCode(block.tourUrl);
      }
    }
    
    const html = this.generateHtml(expose, qrCodes);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
      
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private static generateHtml(expose: ExposeData, qrCodes: Record<string, string> = {}): string {
    const theme = THEMES[expose.theme] || THEMES.default;
    const blocks = expose.blocks || [];
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: ${theme.secondary};
      line-height: 1.6;
      font-size: 11pt;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      background: white;
    }
    
    .hero {
      position: relative;
      height: 140mm;
      margin: -15mm -15mm 20mm -15mm;
      overflow: hidden;
    }
    
    .hero img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .hero-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 30mm 15mm 15mm;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      color: white;
    }
    
    .hero-title {
      font-size: 28pt;
      font-weight: 700;
      margin-bottom: 5mm;
      line-height: 1.2;
    }
    
    .hero-subtitle {
      font-size: 14pt;
      opacity: 0.9;
    }
    
    .stats {
      display: flex;
      gap: 10mm;
      padding: 8mm 0;
      border-bottom: 1px solid #E5E7EB;
      margin-bottom: 8mm;
    }
    
    .stat {
      text-align: center;
      flex: 1;
    }
    
    .stat-value {
      font-size: 20pt;
      font-weight: 700;
      color: ${theme.primary};
    }
    
    .stat-label {
      font-size: 9pt;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .text-block {
      margin-bottom: 8mm;
    }
    
    .text-block.highlight {
      background: #F3F4F6;
      padding: 6mm;
      border-radius: 3mm;
      border-left: 3px solid ${theme.primary};
    }
    
    .text-block.quote {
      font-style: italic;
      padding-left: 6mm;
      border-left: 3px solid ${theme.accent};
      color: #4B5563;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: 600;
      color: ${theme.secondary};
      margin-bottom: 4mm;
      padding-bottom: 2mm;
      border-bottom: 2px solid ${theme.primary};
      display: inline-block;
    }
    
    .gallery {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4mm;
      margin-bottom: 8mm;
    }
    
    .gallery img {
      width: 100%;
      height: 50mm;
      object-fit: cover;
      border-radius: 2mm;
    }
    
    .features {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 3mm;
      margin-bottom: 8mm;
    }
    
    .feature {
      display: flex;
      align-items: center;
      gap: 2mm;
      font-size: 10pt;
    }
    
    .feature-icon {
      width: 5mm;
      height: 5mm;
      background: ${theme.primary};
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .location {
      background: #F9FAFB;
      padding: 6mm;
      border-radius: 3mm;
      margin-bottom: 8mm;
    }
    
    .location-title {
      font-weight: 600;
      margin-bottom: 2mm;
    }
    
    .contact {
      background: ${theme.primary};
      color: white;
      padding: 8mm;
      border-radius: 3mm;
      margin-top: 10mm;
    }
    
    .contact-title {
      font-size: 12pt;
      font-weight: 600;
      margin-bottom: 4mm;
    }
    
    .contact-info {
      font-size: 10pt;
      opacity: 0.9;
    }
    
    .divider {
      height: 1px;
      background: #E5E7EB;
      margin: 8mm 0;
    }
    
    .divider.thick {
      height: 3px;
      background: ${theme.primary};
    }
    
    .media-qr {
      display: flex;
      align-items: center;
      gap: 6mm;
      background: #F9FAFB;
      padding: 6mm;
      border-radius: 3mm;
      margin-bottom: 8mm;
    }
    
    .media-qr-code {
      width: 25mm;
      height: 25mm;
      flex-shrink: 0;
    }
    
    .media-qr-code img {
      width: 100%;
      height: 100%;
    }
    
    .media-qr-content {
      flex: 1;
    }
    
    .media-qr-title {
      font-size: 12pt;
      font-weight: 600;
      color: ${theme.secondary};
      margin-bottom: 2mm;
    }
    
    .media-qr-desc {
      font-size: 9pt;
      color: #6B7280;
    }
    
    .media-qr-icon {
      font-size: 20pt;
      margin-bottom: 1mm;
    }
    
    .footer {
      position: fixed;
      bottom: 10mm;
      left: 15mm;
      right: 15mm;
      text-align: center;
      font-size: 8pt;
      color: #9CA3AF;
      border-top: 1px solid #E5E7EB;
      padding-top: 3mm;
    }
  </style>
</head>
<body>
  <div class="page">
    ${blocks.map(block => this.renderBlock(block, expose, qrCodes, theme)).join('')}
    
    <div class="footer">
      Exposé erstellt mit NeuroConcepts.ai • ${new Date().toLocaleDateString('de-DE')}
    </div>
  </div>
</body>
</html>
    `;
  }

  private static renderBlock(block: ExposeBlock, expose: ExposeData, qrCodes: Record<string, string> = {}, theme: { primary: string; secondary: string; accent: string } = THEMES.default): string {
    switch (block.type) {
      case 'hero':
        return `
          <div class="hero">
            ${block.imageUrl ? `<img src="${block.imageUrl}" alt="">` : 
              (expose.property.images?.[0] ? `<img src="${expose.property.images[0]}" alt="">` : '')}
            <div class="hero-overlay">
              <div class="hero-title">${block.title || expose.property.title}</div>
              <div class="hero-subtitle">${block.subtitle || expose.property.address}</div>
            </div>
          </div>
        `;

      case 'stats':
        const stats = block.items || [
          { label: 'Zimmer', value: expose.property.rooms?.toString() || '-' },
          { label: 'Wohnfläche', value: expose.property.area ? `${expose.property.area} m²` : '-' },
          { label: 'Preis', value: expose.property.price ? `${new Intl.NumberFormat('de-DE').format(expose.property.price)} €` : '-' },
        ];
        return `
          <div class="stats">
            ${stats.map((s: any) => `
              <div class="stat">
                <div class="stat-value">${s.value}</div>
                <div class="stat-label">${s.label}</div>
              </div>
            `).join('')}
          </div>
        `;

      case 'text':
        const styleClass = block.style === 'highlight' ? 'highlight' : 
                          block.style === 'quote' ? 'quote' : '';
        return `
          <div class="text-block ${styleClass}">
            ${block.title ? `<div class="section-title">${block.title}</div>` : ''}
            <p>${(block.content || '').replace(/\n/g, '<br>')}</p>
          </div>
        `;

      case 'gallery':
        const images = block.images || expose.property.images || [];
        if (images.length === 0) return '';
        return `
          <div class="gallery">
            ${images.slice(0, 4).map((img: string) => `<img src="${img}" alt="">`).join('')}
          </div>
        `;

      case 'features':
        const features = block.items || [];
        if (features.length === 0) return '';
        return `
          ${block.title ? `<div class="section-title">${block.title}</div>` : ''}
          <div class="features">
            ${features.map((f: any) => `
              <div class="feature">
                <div class="feature-icon"></div>
                <span>${f.text || f}</span>
              </div>
            `).join('')}
          </div>
        `;

      case 'location':
        return `
          <div class="location">
            <div class="location-title">${block.title || 'Lage'}</div>
            <p>${block.address || expose.property.address}</p>
            ${block.description ? `<p style="margin-top: 2mm; color: #6B7280;">${block.description}</p>` : ''}
          </div>
        `;

      case 'contact':
        return `
          <div class="contact">
            <div class="contact-title">${block.title || 'Ihr Ansprechpartner'}</div>
            <div class="contact-info">
              ${block.name || expose.user?.name || ''}<br>
              ${block.email || expose.user?.email || ''}<br>
              ${block.phone || expose.user?.phone || ''}
            </div>
          </div>
        `;

      case 'leadInfo':
        return `
          <div style="padding: 6mm; background: linear-gradient(to right, #EEF2FF, #F5F3FF); border-left: 3px solid ${theme.accent}; margin-bottom: 6mm;">
            ${block.showGreeting !== false ? `<p style="font-size: 10pt; color: #6B7280; margin-bottom: 2mm;">Erstellt für</p>` : ''}
            <p style="font-size: 14pt; font-weight: 600; color: ${theme.secondary}; margin-bottom: 2mm;">
              ${block.leadName || expose.lead?.firstName + ' ' + expose.lead?.lastName || ''}
            </p>
            <p style="font-size: 10pt; color: #4B5563;">
              ${block.leadEmail || expose.lead?.email || ''}<br>
              ${block.leadPhone || expose.lead?.phone || ''}
            </p>
          </div>
        `;

      case 'divider':
        return `<div class="divider ${block.style === 'thick' ? 'thick' : ''}"></div>`;

      case 'floorplan':
        if (!block.imageUrl) return '';
        return `
          ${block.title ? `<div class="section-title">${block.title}</div>` : ''}
          <img src="${block.imageUrl}" alt="Grundriss" style="width: 100%; margin-bottom: 8mm;">
        `;

      case 'video':
        if (!block.videoUrl || !qrCodes[block.id]) return '';
        return `
          <div class="media-qr">
            <div class="media-qr-code">
              <img src="${qrCodes[block.id]}" alt="QR Code">
            </div>
            <div class="media-qr-content">
              <div class="media-qr-icon">🎬</div>
              <div class="media-qr-title">${block.title || 'Objektvideo'}</div>
              <div class="media-qr-desc">Scannen Sie den QR-Code, um das Video anzusehen</div>
            </div>
          </div>
        `;

      case 'virtualTour':
        if (!block.tourUrl || !qrCodes[block.id]) return '';
        return `
          <div class="media-qr">
            <div class="media-qr-code">
              <img src="${qrCodes[block.id]}" alt="QR Code">
            </div>
            <div class="media-qr-content">
              <div class="media-qr-icon">🔮</div>
              <div class="media-qr-title">${block.title || 'Virtuelle Besichtigung'}</div>
              <div class="media-qr-desc">Scannen Sie den QR-Code für eine 360° Tour</div>
            </div>
          </div>
        `;

      case 'highlights':
        const highlights = block.items || [];
        if (highlights.length === 0) return '';
        return `
          ${block.title ? `<div class="section-title">${block.title}</div>` : ''}
          <div class="features">
            ${highlights.map((h: any) => `
              <div class="feature">
                <div class="feature-icon"></div>
                <span>${typeof h === 'string' ? h : h.text || h}</span>
              </div>
            `).join('')}
          </div>
        `;

      case 'priceTable':
        const priceItems = block.items || [];
        if (priceItems.length === 0) return '';
        return `
          ${block.title ? `<div class="section-title">${block.title}</div>` : ''}
          <div style="margin-bottom: 8mm;">
            ${priceItems.map((item: any) => `
              <div style="display: flex; justify-content: space-between; padding: 3mm 0; border-bottom: 1px solid #E5E7EB;">
                <span style="color: #6B7280;">${item.label}</span>
                <span style="font-weight: 600;">${item.value}</span>
              </div>
            `).join('')}
          </div>
        `;

      case 'energyCertificate':
        if (!block.energyClass) return '';
        return `
          <div class="location">
            <div class="section-title">Energieausweis</div>
            <div style="display: flex; align-items: center; gap: 4mm; margin-top: 4mm;">
              <div style="width: 15mm; height: 15mm; border-radius: 50%; background: ${theme.primary}; color: white; display: flex; align-items: center; justify-content: center; font-size: 14pt; font-weight: 700;">
                ${block.energyClass}
              </div>
              <div>
                <div style="font-size: 9pt; color: #6B7280;">Energieeffizienzklasse</div>
                <div style="font-weight: 500;">${block.consumption || ''}</div>
              </div>
            </div>
          </div>
        `;

      case 'cta':
        return `
          <div style="background: #F3F4F6; padding: 8mm; border-radius: 3mm; text-align: center; margin-bottom: 8mm;">
            <div style="font-size: 14pt; font-weight: 600; color: ${theme.secondary}; margin-bottom: 4mm;">${block.title || 'Interesse geweckt?'}</div>
            <div style="display: inline-block; background: ${theme.primary}; color: white; padding: 3mm 8mm; border-radius: 2mm; font-weight: 500;">
              ${block.buttonText || 'Jetzt Termin vereinbaren'}
            </div>
          </div>
        `;

      case 'quote':
        return `
          <div class="text-block quote">
            <p>"${block.text || ''}"</p>
            ${block.author ? `<p style="margin-top: 2mm; font-size: 9pt; font-style: normal;">— ${block.author}</p>` : ''}
          </div>
        `;

      case 'twoColumn':
        return `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-bottom: 8mm;">
            <div>${(block.leftContent || '').replace(/\n/g, '<br>')}</div>
            <div>${(block.rightContent || '').replace(/\n/g, '<br>')}</div>
          </div>
        `;

      default:
        return '';
    }
  }
}
