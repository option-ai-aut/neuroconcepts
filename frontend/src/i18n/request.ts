import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

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

  // 2. Check Accept-Language header
  const headerStore = await headers();
  const acceptLang = headerStore.get('accept-language') || '';
  const browserLocale = acceptLang
    .split(',')
    .map(l => l.split(';')[0].trim().split('-')[0])
    .find(l => locales.includes(l as Locale)) as Locale | undefined;

  const locale = browserLocale || defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
