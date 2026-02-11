import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Marketing pages - ONLY on immivo.ai
const LANDING_PAGES = ['/', '/preise', '/ueber-uns', '/blog', '/karriere', '/kontakt', '/integrationen'];

// Legal pages - accessible on all domains
const LEGAL_PAGES = ['/datenschutz', '/agb', '/impressum'];

const APP_DOMAIN = 'app.immivo.ai';
const ADMIN_DOMAIN = 'admin.immivo.ai';
const MARKETING_DOMAIN = 'immivo.ai';

export function middleware(request: NextRequest) {
  // CloudFront sets X-Forwarded-Host as a custom origin header with the real domain.
  // The regular 'host' header gets replaced by CloudFront with the Lambda Function URL.
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Skip API routes, static files, and Next.js internals
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
  // Marketing domain = immivo.ai but NOT app.immivo.ai or admin.immivo.ai
  const isMarketingDomain = hostname.includes(MARKETING_DOMAIN) && !isAppDomain && !isAdminDomain;
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // ========================================
  // LOCALHOST: Allow everything (development)
  // ========================================
  if (isLocalhost) {
    return NextResponse.next();
  }

  // ========================================
  // immivo.ai (Marketing Domain)
  // Only landing pages + legal pages allowed
  // Everything else redirects to app.immivo.ai
  // ========================================
  if (isMarketingDomain) {
    // Allow landing pages
    if (LANDING_PAGES.includes(pathname)) {
      return NextResponse.next();
    }
    // Allow legal pages
    if (LEGAL_PAGES.includes(pathname)) {
      return NextResponse.next();
    }
    // Everything else -> redirect to app.immivo.ai (preserving path)
    return NextResponse.redirect(new URL(`https://${APP_DOMAIN}${pathname}`));
  }

  // ========================================
  // app.immivo.ai (App Domain)
  // Login, Dashboard, Settings, etc.
  // Landing pages redirect to immivo.ai
  // ========================================
  if (isAppDomain) {
    // Redirect marketing landing pages to immivo.ai
    if (LANDING_PAGES.includes(pathname)) {
      return NextResponse.redirect(new URL(`https://${MARKETING_DOMAIN}${pathname}`));
    }
    // Allow everything else (login, dashboard, etc.)
    return NextResponse.next();
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
    return NextResponse.next();
  }

  // Unknown domain (e.g. Lambda Function URL) - allow everything
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.).*)',
  ],
};
