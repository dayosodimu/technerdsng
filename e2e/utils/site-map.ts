/**
 * Single source of truth for the public routes and their expected content.
 * Captured from the live site on 2026-11-15. Update here when content changes.
 */
export interface RouteSpec {
  path: string;
  title: RegExp;
  h1: RegExp;
  /** Main-nav label that should route here (if any) */
  navLabel?: string;
}

export const PUBLIC_ROUTES: RouteSpec[] = [
  { path: '/', title: /Web Development & Digital Marketing in Nigeria \| Technerds/i, h1: /Think business\.\s*Go digital\./i },
  { path: '/about', title: /About Technerds/i, h1: /People first\.\s*Possibility always\./i, navLabel: 'About us' },
  { path: '/services', title: /Services \| Technerds/i, h1: /Good technology\.\s*Clear business purpose\./i, navLabel: 'Services' },
  { path: '/news', title: /News & Insights \| Technerds/i, h1: /News & ideas\./i, navLabel: 'News' },
  { path: '/process', title: /Process & Strategy \| Technerds/i, h1: /A clear path from\s*challenge to change\./i, navLabel: 'Process' },
  { path: '/contact', title: /Contact Technerds/i, h1: /Let.s make\s*something matter\./i, navLabel: 'Contact' },
  { path: '/privacy-policy', title: /Privacy Policy \| Technerds/i, h1: /Privacy policy\./i },
];

export const ADMIN_ROUTES = {
  admin: '/admin',
  signIn: '/sign-in',
  signUp: '/sign-up',
};

export const CONTACT_EMAILS = {
  general: 'info@technerdsng.com',
  sales: 'sales@technerdsng.com',
  support: 'support@technerdsng.com',
};

export const SOCIAL_LINKS = [
  { name: 'Instagram', href: 'https://www.instagram.com/technerdsng/' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/technerd-digital-solutions' },
  { name: 'X', href: 'https://x.com/technerdsng17' },
];

export const FAQ_QUESTIONS = [
  'What services does Technerds offer?',
  'How can I start a project?',
  'How does the process work?',
  'Where can I read Technerds news?',
];

export const CONSENT_STORAGE_KEY = 'technerds-cookie-consent-v1';

/** Every route that should be checked by crawl-style non-functional specs */
export const ALL_AUDITED_PATHS = [...PUBLIC_ROUTES.map((r) => r.path), ADMIN_ROUTES.admin, ADMIN_ROUTES.signIn];
