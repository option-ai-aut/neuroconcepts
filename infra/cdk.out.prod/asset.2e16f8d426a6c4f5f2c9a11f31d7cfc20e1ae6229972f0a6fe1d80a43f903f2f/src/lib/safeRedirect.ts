const ALLOWED_DOMAINS = [
  '.immivo.ai',
  '.stripe.com',
  'accounts.google.com',
  'login.microsoftonline.com',
];

/**
 * Validates a redirect URL before navigating. Only allows:
 * - Relative paths (e.g. /dashboard)
 * - URLs on explicitly allowed domains
 */
export function safeRedirect(url: string, fallback = '/dashboard'): void {
  if (!url || typeof url !== 'string') {
    window.location.href = fallback;
    return;
  }

  // Relative paths are always safe
  if (url.startsWith('/') && !url.startsWith('//')) {
    window.location.href = url;
    return;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      window.location.href = fallback;
      return;
    }
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(d =>
      d.startsWith('.') ? (hostname.endsWith(d) || hostname === d.slice(1)) : hostname === d
    );
    if (isAllowed) {
      window.location.href = url;
      return;
    }
  } catch {
    // Invalid URL
  }

  window.location.href = fallback;
}
