import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Marketing pages - ONLY on immivo.ai
const LANDING_PAGES = ['/', '/preise', '/ueber-uns', '/blog', '/karriere', '/kontakt', '/integrationen'];

// Legal pages - accessible on all domains
const LEGAL_PAGES = ['/datenschutz', '/agb', '/impressum'];

const APP_DOMAIN = 'app.immivo.ai';
const ADMIN_DOMAIN = 'admin.immivo.ai';
const MARKETING_DOMAIN = 'immivo.ai';

const SUPPORTED_LOCALES = ['de', 'en'];
const DEFAULT_LOCALE = 'de';

function detectLocale(request: NextRequest): string | null {
  const existingCookie = request.cookies.get('locale')?.value;
  if (existingCookie && SUPPORTED_LOCALES.includes(existingCookie)) return null;

  const acceptLang = request.headers.get('accept-language') || '';
  const browserLocale = acceptLang
    .split(',')
    .map(l => l.split(';')[0].trim().split('-')[0].toLowerCase())
    .find(l => SUPPORTED_LOCALES.includes(l));

  return browserLocale || DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isAppDomain = hostname.includes(APP_DOMAIN);
  const isAdminDomain = hostname.includes(ADMIN_DOMAIN);
  const isMarketingDomain = hostname.includes(MARKETING_DOMAIN) && !isAppDomain && !isAdminDomain;
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // ========================================
  // LOCALE DETECTION (all domains)
  // Sets locale cookie on first visit based on Accept-Language header
  // ========================================
  const detectedLocale = detectLocale(request);

  // ========================================
  // LOCALHOST: Allow everything (development)
  // ========================================
  if (isLocalhost) {
    if (detectedLocale) {
      const response = NextResponse.next();
      response.cookies.set('locale', detectedLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
      return response;
    }
    return NextResponse.next();
  }

  // ========================================
  // immivo.ai (Marketing Domain)
  // Only landing pages + legal pages allowed
  // Everything else redirects to app.immivo.ai
  // ========================================
  if (isMarketingDomain) {
    if (LANDING_PAGES.includes(pathname) || LEGAL_PAGES.includes(pathname)) {
      const response = NextResponse.next();
      if (detectedLocale) response.cookies.set('locale', detectedLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
      return response;
    }
    return NextResponse.redirect(new URL(`https://${APP_DOMAIN}${pathname}`));
  }

  // ========================================
  // app.immivo.ai (App Domain)
  // Login, Dashboard, Settings, etc.
  // Root -> /login, other landing pages -> immivo.ai
  // ========================================
  if (isAppDomain) {
    // Root path -> redirect to login page
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Redirect other marketing landing pages to immivo.ai
    if (LANDING_PAGES.includes(pathname)) {
      return NextResponse.redirect(new URL(`https://${MARKETING_DOMAIN}${pathname}`));
    }
    const response = NextResponse.next();
    if (detectedLocale) response.cookies.set('locale', detectedLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  // ========================================
  // admin.immivo.ai (Admin Domain)
  // Only /admin/* paths allowed
  // ========================================
  if (isAdminDomain) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (!pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    const adminResponse = NextResponse.next();
    if (detectedLocale) adminResponse.cookies.set('locale', detectedLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return adminResponse;
  }

  // Unknown domain (e.g. Lambda Function URL) - allow everything
  const response = NextResponse.next();
  if (detectedLocale) response.cookies.set('locale', detectedLocale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.png|apple-touch-icon.png|site.webmanifest|logo-.*|icon-.*|.*\\.).*)',
  ],
};
