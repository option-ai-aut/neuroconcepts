import { MetadataRoute } from 'next';

const SITE_URL = 'https://immivo.ai';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  return [
    // Hauptseite
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // Preise
    {
      url: `/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // Über uns
    {
      url: `/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // Blog
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Karriere
    {
      url: `/careers`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Kontakt
    {
      url: `/contact`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    // Legal Pages
    {
      url: `/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `/imprint`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
