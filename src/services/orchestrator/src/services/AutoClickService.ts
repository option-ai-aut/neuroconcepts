/**
 * AutoClickService — Automatically clicks portal email links using Puppeteer
 * to extract lead data that's hidden behind "Click here" links.
 *
 * Common portals: ImmobilienScout24, Immowelt, Kleinanzeigen, Willhaben, etc.
 */

import puppeteer from 'puppeteer';

export interface ClickResult {
  success: boolean;
  extractedData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    message?: string;
  };
  pageTitle?: string;
  pageContent?: string;
  screenshotBase64?: string;
  error?: string;
}

export class AutoClickService {
  /**
   * Click a portal link and extract lead data from the resulting page
   */
  static async clickAndExtract(url: string, portal?: string): Promise<ClickResult> {
    let browser;
    try {
      console.log(`🔗 AutoClick: Opening ${url} (portal: ${portal || 'unknown'})`);

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
      });

      const page = await browser.newPage();

      // Set realistic user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to the link
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait a bit for dynamic content
      await new Promise((r) => setTimeout(r, 2000));

      const pageTitle = await page.title();

      // Extract page content
      const pageContent = await page.evaluate(() => {
        return document.body?.innerText || '';
      });

      // Try to extract lead data from the page
      const extractedData = await page.evaluate(() => {
        const text = document.body?.innerText || '';
        const html = document.body?.innerHTML || '';

        // Helper to find text near a label
        const findValue = (labels: string[]): string | undefined => {
          for (const label of labels) {
            // Try common patterns: "Label: Value", "Label\nValue", table rows
            const patterns = [
              new RegExp(label + '\\s*[:=]\\s*([^\\n]+)', 'i'),
              new RegExp(label + '\\s*\\n\\s*([^\\n]+)', 'i'),
            ];
            for (const pattern of patterns) {
              const match = text.match(pattern);
              if (match && match[1]?.trim()) return match[1].trim();
            }
          }
          return undefined;
        };

        // Extract email
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);

        // Extract phone
        const phoneMatch = text.match(
          /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,}[\s.-]?\d{2,}/
        );

        return {
          firstName: findValue(['Vorname', 'First name', 'First Name']),
          lastName: findValue(['Nachname', 'Familienname', 'Last name', 'Last Name', 'Name']),
          email: emailMatch?.[0] || findValue(['E-Mail', 'Email', 'Mail']),
          phone: phoneMatch?.[0] || findValue(['Telefon', 'Tel', 'Phone', 'Handy', 'Mobil']),
          message: findValue([
            'Nachricht',
            'Mitteilung',
            'Anmerkung',
            'Kommentar',
            'Message',
            'Anfrage',
          ]),
        };
      });

      console.log(`🔗 AutoClick: Extracted data from ${pageTitle}`);

      return {
        success: true,
        extractedData,
        pageTitle,
        pageContent: pageContent.substring(0, 5000), // Limit content size
      };
    } catch (error: any) {
      console.error('🔗 AutoClick error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }
}

export default AutoClickService;
