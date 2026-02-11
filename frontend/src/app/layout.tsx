import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { GlobalStateProvider } from "@/context/GlobalStateContext";
import { RuntimeConfigProvider } from "@/components/RuntimeConfigProvider";
import CookieConsent from "@/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const SITE_URL = 'https://immivo.ai';
const SITE_NAME = 'Immivo AI';
const DEFAULT_DESCRIPTION = 'Das erste KI-gesteuerte Betriebssystem für Immobilienmakler. Jarvis übernimmt E-Mails, Termine, Exposés und Lead-Qualifizierung — vollautomatisch, 24/7.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Immivo AI — KI-Assistent für Immobilienmakler',
    template: '%s | Immivo AI',
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'Immobilienmakler Software',
    'KI Immobilien',
    'Immobilien CRM',
    'Makler Software',
    'Exposé erstellen',
    'Lead Management Immobilien',
    'Virtual Staging',
    'Immobilien Automatisierung',
    'Jarvis KI Assistent',
    'Immivo',
    'Real Estate AI',
    'Immobilien KI',
    'Makler CRM',
    'Immobilien Marketing',
    'ImmoScout Integration',
    'Willhaben Integration',
    'Immowelt Integration',
  ],
  authors: [{ name: 'Immivo AI', url: SITE_URL }],
  creator: 'Immivo AI',
  publisher: 'Immivo AI',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'de_AT',
    alternateLocale: ['de_DE', 'de_CH'],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Immivo AI — Dein KI-Assistent für Immobilien',
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Immivo AI — KI-gesteuertes Betriebssystem für Immobilienmakler',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Immivo AI — KI-Assistent für Immobilienmakler',
    description: DEFAULT_DESCRIPTION,
    images: ['/og-image.png'],
    creator: '@immivo_ai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    // Add these when you have them:
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
  category: 'technology',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
};

export const dynamic = 'force-dynamic';

// JSON-LD Structured Data for the entire site
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Immivo AI',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.svg`,
      },
      description: DEFAULT_DESCRIPTION,
      sameAs: [
        // Add social media URLs when available
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'hello@immivo.ai',
        contactType: 'customer service',
        availableLanguage: ['German', 'English'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'de',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Immivo AI',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'KI-gesteuertes CRM und Betriebssystem für Immobilienmakler mit automatisierter Lead-Qualifizierung, Exposé-Erstellung und Terminbuchung.',
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: '49',
        highPrice: '149',
        priceCurrency: 'EUR',
        offerCount: 3,
      },
      featureList: [
        'KI-Assistent Jarvis',
        'Automatische Lead-Qualifizierung',
        'Exposé-Editor mit KI',
        'Virtual Staging',
        'Kalender-Integration',
        'E-Mail-Automatisierung',
        'Portal-Anbindung (ImmoScout, Willhaben, Immowelt)',
        'CRM für Immobilienmakler',
      ],
      screenshot: `${SITE_URL}/og-image.png`,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfairDisplay.variable} ${cormorantGaramond.variable} antialiased`}
      >
        <RuntimeConfigProvider>
          <AuthProvider>
            <GlobalStateProvider>
              {children}
              <CookieConsent />
            </GlobalStateProvider>
          </AuthProvider>
        </RuntimeConfigProvider>
      </body>
    </html>
  );
}
