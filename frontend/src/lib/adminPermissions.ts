/**
 * Central RBAC configuration for the Immivo Admin Panel.
 *
 * ROLES (hierarchy, high to low):
 *   SUPER_ADMIN  – Founders only. Full access incl. destructive operations.
 *   ADMIN        – Senior team. Full access except tenant-delete & super-admin management.
 *   FINANCE      – Finance team. Dashboard + Finance only.
 *   MARKETING    – Marketing team. Dashboard + Blog/Newsletter/Careers.
 *   SUPPORT      – Customer support. Inbox, Contacts, Calendar, Bug-Reports.
 *   SALES        – Sales team. Inbox, Contacts, Calendar, Tenants.
 *   STANDARD     – Default. Dashboard, own Inbox, Calendar, Chat.
 *
 * Per-user EXTRA PAGES can be granted on top of the base role.
 */

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'MARKETING'
  | 'SUPPORT'
  | 'SALES'
  | 'STANDARD';

/** All page IDs — must match hrefs in the navigation */
export type PageId =
  | 'dashboard'
  | 'inbox'
  | 'contacts'
  | 'blog'
  | 'newsletter'
  | 'careers'
  | 'users'
  | 'chat'
  | 'calendar'
  | 'support'
  | 'tenants'
  | 'finance'
  | 'operations'
  | 'audit'
  | 'settings';

/** Map href → page ID */
export const HREF_TO_PAGE: Record<string, PageId> = {
  '/admin':             'dashboard',
  '/admin/inbox':       'inbox',
  '/admin/contacts':    'contacts',
  '/admin/blog':        'blog',
  '/admin/newsletter':  'newsletter',
  '/admin/careers':     'careers',
  '/admin/users':       'users',
  '/admin/chat':        'chat',
  '/admin/calendar':    'calendar',
  '/admin/support':     'support',
  '/admin/sales':       'tenants',
  '/admin/finance':     'finance',
  '/admin/operations':  'operations',
  '/admin/audit':       'audit',
  '/admin/settings':    'settings',
};

/** All pages in display-friendly order */
export const ALL_PAGES: { id: PageId; label: string; section: string }[] = [
  { id: 'dashboard',   label: 'Dashboard',         section: 'Übersicht' },
  { id: 'inbox',       label: 'Posteingang',        section: 'Kommunikation' },
  { id: 'contacts',    label: 'Kontaktanfragen',    section: 'Kommunikation' },
  { id: 'blog',        label: 'Blog',               section: 'Marketing' },
  { id: 'newsletter',  label: 'Newsletter',         section: 'Marketing' },
  { id: 'careers',     label: 'Karriere',           section: 'Marketing' },
  { id: 'users',       label: 'Mitarbeiter',        section: 'Team' },
  { id: 'chat',        label: 'Team Chat',          section: 'Team' },
  { id: 'calendar',    label: 'Kalender',           section: 'Team' },
  { id: 'support',     label: 'Bug Reports',        section: 'Betrieb' },
  { id: 'tenants',     label: 'Tenants',            section: 'Betrieb' },
  { id: 'finance',     label: 'Finance',            section: 'Betrieb' },
  { id: 'operations',  label: 'Operations',         section: 'System' },
  { id: 'audit',       label: 'Audit Log',          section: 'System' },
  { id: 'settings',    label: 'Einstellungen',      section: 'System' },
];

/** Base page access per role */
const ALL_PAGES_IDS = ALL_PAGES.map(p => p.id) as PageId[];

export const ROLE_PAGES: Record<AdminRole, PageId[]> = {
  SUPER_ADMIN: ALL_PAGES_IDS,

  ADMIN: [
    'dashboard', 'inbox', 'contacts',
    'blog', 'newsletter', 'careers',
    'users', 'chat', 'calendar',
    'support', 'tenants', 'finance',
    'audit', 'settings',
    // 'operations' deliberately excluded — SUPER_ADMIN only
  ],

  FINANCE: [
    'dashboard',
    'finance',
    'tenants', // read-only in UI but needs access to view
    'chat',
  ],

  MARKETING: [
    'dashboard',
    'blog', 'newsletter', 'careers',
    'chat',
  ],

  SUPPORT: [
    'dashboard',
    'inbox', 'contacts',
    'calendar',
    'support',
    'chat',
  ],

  SALES: [
    'dashboard',
    'inbox', 'contacts',
    'calendar',
    'tenants',
    'chat',
  ],

  STANDARD: [
    'dashboard',
    'inbox',
    'calendar',
    'chat',
  ],
};

/** Special permissions beyond just page visibility */
export type SpecialPermission =
  | 'DELETE_TENANT'          // Only SUPER_ADMIN
  | 'MANAGE_SUPER_ADMINS'    // Only SUPER_ADMIN
  | 'MANAGE_TEAM'            // SUPER_ADMIN + ADMIN
  | 'MODIFY_SYSTEM_SETTINGS' // SUPER_ADMIN + ADMIN
  | 'VIEW_AUDIT'             // SUPER_ADMIN + ADMIN
  | 'IMPERSONATE_TENANT'     // SUPER_ADMIN only

export const ROLE_SPECIAL_PERMISSIONS: Record<AdminRole, SpecialPermission[]> = {
  SUPER_ADMIN: [
    'DELETE_TENANT', 'MANAGE_SUPER_ADMINS', 'MANAGE_TEAM',
    'MODIFY_SYSTEM_SETTINGS', 'VIEW_AUDIT', 'IMPERSONATE_TENANT',
  ],
  ADMIN: [
    'MANAGE_TEAM', 'MODIFY_SYSTEM_SETTINGS', 'VIEW_AUDIT',
  ],
  FINANCE:   [],
  MARKETING: [],
  SUPPORT:   [],
  SALES:     [],
  STANDARD:  [],
};

/** UI metadata per role */
export const ROLE_META: Record<AdminRole, {
  label: string;
  description: string;
  color: string;
  badgeColor: string;
}> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Gründer – vollständiger Zugriff auf alle Funktionen und kritische Operationen',
    color: 'bg-red-50 text-red-700 border-red-200',
    badgeColor: 'bg-red-600',
  },
  ADMIN: {
    label: 'Admin',
    description: 'Senior-Team – alle Seiten außer Operations; kein Tenant-Löschen',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    badgeColor: 'bg-gray-800',
  },
  FINANCE: {
    label: 'Finance',
    description: 'Finanzteam – Zugriff auf Dashboard, Finance und Tenants',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeColor: 'bg-emerald-600',
  },
  MARKETING: {
    label: 'Marketing',
    description: 'Marketingteam – Blog, Newsletter, Karriere',
    color: 'bg-pink-50 text-pink-700 border-pink-200',
    badgeColor: 'bg-pink-600',
  },
  SUPPORT: {
    label: 'Support',
    description: 'Kundensupport – Posteingang, Kontakte, Kalender, Bug Reports',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeColor: 'bg-purple-600',
  },
  SALES: {
    label: 'Sales',
    description: 'Vertrieb – Posteingang, Kontakte, Kalender, Tenants',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeColor: 'bg-blue-600',
  },
  STANDARD: {
    label: 'Standard',
    description: 'Mitarbeiter – Dashboard, eigenes Postfach, Kalender, Chat',
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    badgeColor: 'bg-slate-500',
  },
};

/**
 * Returns the effective set of page IDs a user can access.
 * Merges base role pages with any individually granted extra pages.
 */
export function getEffectivePages(role: AdminRole, extraPages: string[] = []): Set<PageId> {
  const base = ROLE_PAGES[role] || ROLE_PAGES.STANDARD;
  return new Set([...base, ...extraPages] as PageId[]);
}

/**
 * Returns true if the page at the given href should be visible for a user.
 */
export function canAccessHref(
  href: string,
  role: AdminRole,
  extraPages: string[] = [],
): boolean {
  const pageId = HREF_TO_PAGE[href];
  if (!pageId) return true; // unknown pages: allow (e.g. sub-pages)
  return getEffectivePages(role, extraPages).has(pageId);
}

/**
 * Returns true if the user has a specific special permission.
 */
export function hasSpecialPermission(
  role: AdminRole,
  permission: SpecialPermission,
): boolean {
  return (ROLE_SPECIAL_PERMISSIONS[role] || []).includes(permission);
}

/** Ordered list of all roles for dropdowns */
export const ROLE_ORDER: AdminRole[] = [
  'SUPER_ADMIN', 'ADMIN', 'FINANCE', 'MARKETING', 'SUPPORT', 'SALES', 'STANDARD',
];
