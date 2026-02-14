/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker

  // Fix: Tell Turbopack that the frontend folder is the root (not the monorepo root)
  // Without this, Turbopack picks up the root package-lock.json and looks for
  // tailwindcss in /NeuroConcepts.ai/node_modules instead of /frontend/node_modules
  turbopack: {
    root: import.meta.dirname,
  },

  async redirects() {
    return [
      {
        source: '/integrationen',
        destination: '/#features',
        permanent: true, // 301 redirect
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
