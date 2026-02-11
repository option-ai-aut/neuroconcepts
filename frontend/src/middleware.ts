import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public pages that should only be accessible on the marketing domain (immivo.ai)
const LANDING_PAGES = ['/', '/preise', '/ueber-uns', '/blog', '/karriere', '/kontakt', '/integrationen'];

// Pages that are public on all domains
const SHARED_PUBLIC_PAGES = ['/login', '/datenschutz', '/agb', '/impressum'];

// App domain prefix
const APP_DOMAIN = 'app.immivo.ai';
const ADMIN_DOMAIN = 'admin.immivo.ai';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
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

  // On app.immivo.ai: redirect landing pages to /login
  if (isAppDomain) {
    if (LANDING_PAGES.includes(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // On admin.immivo.ai: redirect to /admin/login if on root, block non-admin paths
  if (isAdminDomain) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    // Only allow /admin/* paths on admin domain
    if (!pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.).*)',
  ],
};
