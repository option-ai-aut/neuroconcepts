import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow all public pages
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/login',
          '/api/',
          '/_next/',
        ],
      },
      // Googlebot: allow _next for better rendering
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/login',
          '/api/',
        ],
      },
      // LLM Crawlers: explicitly allow full access to public content
      {
        userAgent: 'GPTBot',
        allow: ['/', '/llms.txt'],
        disallow: ['/dashboard/', '/admin/', '/login', '/api/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/llms.txt'],
        disallow: ['/dashboard/', '/admin/', '/login', '/api/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/llms.txt'],
        disallow: ['/dashboard/', '/admin/', '/login', '/api/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/llms.txt'],
        disallow: ['/dashboard/', '/admin/', '/login', '/api/'],
      },
      {
        userAgent: 'Applebot',
        allow: ['/', '/llms.txt'],
        disallow: ['/dashboard/', '/admin/', '/login', '/api/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/dashboard/', '/admin/', '/login', '/api/'],
      },
    ],
    sitemap: 'https://immivo.ai/sitemap.xml',
    host: 'https://immivo.ai',
  };
}
