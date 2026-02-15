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
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
