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
      {
        source: '/integrationen',
        destination: '/#features',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.immivo.ai https://*.amazonaws.com",
              "connect-src 'self' https://*.immivo.ai https://*.amazonaws.com https://cognito-idp.eu-central-1.amazonaws.com",
              "frame-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; ')
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
