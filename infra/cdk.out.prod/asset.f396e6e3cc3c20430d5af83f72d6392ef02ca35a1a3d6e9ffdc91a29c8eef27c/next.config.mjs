import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker

  // Fix: Tell Turbopack that the frontend folder is the root (not the monorepo root)
  turbopack: {
    root: import.meta.dirname,
  },

  // Tree-shake heavy packages (only import what's actually used)
  experimental: {
    optimizePackageImports: [
      'aws-amplify',
      '@aws-amplify/ui-react',
      'lucide-react',
      'recharts',
    ],
  },

  // Production optimizations
  compiler: {
    // Remove console.log in production (keep error/warn)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  async redirects() {
    return [
      // Legacy German URLs → new English URLs (permanent 308 for SEO)
      { source: '/integrationen', destination: '/integrations', permanent: true },
      { source: '/preise',        destination: '/pricing',      permanent: true },
      { source: '/ueber-uns',     destination: '/about',        permanent: true },
      { source: '/kontakt',       destination: '/contact',      permanent: true },
      { source: '/karriere',      destination: '/careers',      permanent: true },
      { source: '/impressum',     destination: '/imprint',      permanent: true },
      { source: '/datenschutz',   destination: '/privacy',      permanent: true },
      { source: '/agb',           destination: '/terms',        permanent: true },
      // New English /integrations → features section
      { source: '/integrations',  destination: '/#features',    permanent: true },
    ];
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    // In development, allow localhost:3001 (local backend) and localhost:3000 (Next.js dev server)
    const devConnectSrc = isDev
      ? ' http://localhost:3001 ws://localhost:3001 http://localhost:3000 ws://localhost:3000'
      : '';

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS nur in production senden (in dev kein HTTPS)
          ...(!isDev ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: https://*.immivo.ai https://*.amazonaws.com https://*.wikimedia.org https://*.googleapis.com",
              "media-src 'self' https://*.immivo.ai",
              `connect-src 'self' https://*.immivo.ai https://*.amazonaws.com https://*.on.aws https://cognito-idp.eu-central-1.amazonaws.com${devConnectSrc}`,
              "frame-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              ...(!isDev ? ["upgrade-insecure-requests"] : []),
            ].join('; ')
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
