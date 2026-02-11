import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
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
    ],
    sitemap: 'https://immivo.ai/sitemap.xml',
    host: 'https://immivo.ai',
  };
}
