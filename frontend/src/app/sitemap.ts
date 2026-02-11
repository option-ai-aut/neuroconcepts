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
      url: `${SITE_URL}/preise`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // Über uns
    {
      url: `${SITE_URL}/ueber-uns`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // Integrationen
    {
      url: `${SITE_URL}/integrationen`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
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
      url: `${SITE_URL}/karriere`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Kontakt
    {
      url: `${SITE_URL}/kontakt`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    // Legal Pages
    {
      url: `${SITE_URL}/datenschutz`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/agb`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/impressum`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
