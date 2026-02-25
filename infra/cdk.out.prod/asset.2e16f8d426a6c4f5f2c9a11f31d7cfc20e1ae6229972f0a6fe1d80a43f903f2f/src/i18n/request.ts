import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

const DACH_COUNTRIES = ['AT', 'DE', 'CH', 'LI'];

export default getRequestConfig(async () => {
  // 1. Check cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value as Locale | undefined;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return {
      locale: cookieLocale,
      messages: (await import(`../../messages/${cookieLocale}.json`)).default,
    };
  }

  const headerStore = await headers();

  // 2. Geo-IP: DACH countries always get German
  const country = (
    headerStore.get('cloudfront-viewer-country') ||
    headerStore.get('x-vercel-ip-country') ||
    ''
  ).toUpperCase();
  if (country && DACH_COUNTRIES.includes(country)) {
    return {
      locale: 'de' as Locale,
      messages: (await import('../../messages/de.json')).default,
    };
  }

  // 3. Fallback: Accept-Language header
  const acceptLang = headerStore.get('accept-language') || '';
  const browserLocale = acceptLang
    .split(',')
    .map(l => l.split(';')[0].trim().split('-')[0].toLowerCase())
    .find(l => locales.includes(l as Locale)) as Locale | undefined;

  const locale = browserLocale || defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
