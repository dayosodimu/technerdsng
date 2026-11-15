import { test as base, expect, type ConsoleMessage, type Page } from '@playwright/test';
import { CONSENT_STORAGE_KEY } from '../utils/site-map';
import { SitePage } from '../pages/SitePage';
import { CookieConsent } from '../pages/CookieConsent';
import { FaqAssistant } from '../pages/FaqAssistant';
import { AdminPage } from '../pages/AdminPage';
import { SignInPage } from '../pages/SignInPage';

type ConsentChoice = 'reject' | 'accept' | 'none';

interface Fixtures {
  /** Pre-seed the consent choice so the banner doesn't cover the page. Default "reject" (no analytics noise). */
  consent: ConsentChoice;
  /** Console errors + uncaught page errors collected during the test */
  pageErrors: string[];
  site: SitePage;
  cookieConsent: CookieConsent;
  faq: FaqAssistant;
  adminPage: AdminPage;
  signInPage: SignInPage;
}

export async function seedConsent(page: Page, choice: Exclude<ConsentChoice, 'none'>) {
  const optional = choice === 'accept';
  const value = JSON.stringify({
    preferences: { necessary: true, functional: optional, analytical: optional, advertisement: optional },
    savedAt: new Date().toISOString(),
  });
  await page.addInitScript(
    ([key, v]) => {
      try {
        window.localStorage.setItem(key, v);
      } catch {
        /* storage blocked - ignore */
      }
    },
    [CONSENT_STORAGE_KEY, value] as const,
  );
}

// Third-party noise that is not the site's fault (extensions, blocked trackers, Clerk dev warnings)
const IGNORED_CONSOLE = [/favicon/i, /Clerk has been loaded with development keys/i, /net::ERR_BLOCKED_BY_CLIENT/i];

export const test = base.extend<Fixtures>({
  consent: ['reject', { option: true }],

  page: async ({ page, consent }, use) => {
    if (consent !== 'none') await seedConsent(page, consent);
    await use(page);
  },

  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE.some((r) => r.test(msg.text()))) errors.push(`console: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    await use(errors);
  },

  site: async ({ page }, use) => use(new SitePage(page)),
  cookieConsent: async ({ page }, use) => use(new CookieConsent(page)),
  faq: async ({ page }, use) => use(new FaqAssistant(page)),
  adminPage: async ({ page }, use) => use(new AdminPage(page)),
  signInPage: async ({ page }, use) => use(new SignInPage(page)),
});

export { expect };

export const isMobile = (projectName: string) => projectName.startsWith('mobile');

/** Non-functional specs that hit the network/server only need one browser. */
export function onlyOnChromiumDesktop(projectName: string) {
  test.skip(projectName !== 'chromium-desktop', 'Server-side/network check - runs once on chromium-desktop');
}
