import { test, expect, isMobile } from '../../../fixtures/test';
import { PUBLIC_ROUTES, SOCIAL_LINKS } from '../../../utils/site-map';

test.describe('Header & primary navigation @smoke', () => {
  for (const route of PUBLIC_ROUTES.filter((r) => r.navLabel)) {
    test(`nav "${route.navLabel}" routes to ${route.path}`, async ({ site, page }) => {
      await site.goto('/');
      await site.clickNav(route.navLabel!);
      await expect(page).toHaveURL(new RegExp(`${route.path}$`));
      await expect(site.h1).toHaveText(route.h1);
      await expect(page).toHaveTitle(route.title);
    });
  }

  test('logo returns to home from an inner page', async ({ site, page }) => {
    await site.goto('/about');
    await site.homeLogo.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(site.h1).toHaveText(PUBLIC_ROUTES[0].h1);
  });

  test('browser back/forward keeps SPA routes in sync', async ({ site, page }) => {
    await site.goto('/');
    await site.clickNav('Services');
    await expect(page).toHaveURL(/\/services$/);
    await site.clickNav('Contact');
    await expect(page).toHaveURL(/\/contact$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/services$/);
    await expect(site.h1).toHaveText(/good technology/i);
    await page.goForward();
    await expect(site.h1).toHaveText(/something matter/i);
  });

  test('deep link reload works on every route (no SPA fallback errors)', async ({ site, page }) => {
    for (const route of PUBLIC_ROUTES) {
      await site.goto(route.path);
      await page.reload();
      await expect(site.h1).toHaveText(route.h1);
    }
  });

  test('skip link moves focus to main content', async ({ site, page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not Tab to links by default');
    test.skip(isMobile(test.info().project.name), 'Keyboard-only check');
    await site.goto('/');
    await page.keyboard.press('Tab');
    await expect(site.skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
});

test.describe('Mobile navigation menu', () => {
  test.beforeEach(() => {
    test.skip(!isMobile(test.info().project.name), 'Mobile-only behaviour');
  });

  test('menu button toggles aria-expanded and reveals links', async ({ site }) => {
    await site.goto('/');
    await expect(site.menuButton).toBeVisible();
    await expect(site.menuButton).toHaveAttribute('aria-expanded', 'false');
    await site.menuButton.click();
    await expect(site.menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(site.primaryNav.getByRole('link', { name: /services/i })).toBeVisible();
  });

  test('menu closes after choosing a destination', async ({ site, page }) => {
    await site.goto('/');
    await site.clickNav('Process');
    await expect(page).toHaveURL(/\/process$/);
    await expect(site.menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape closes the open menu', async ({ site, page }) => {
    await site.goto('/');
    await site.menuButton.click();
    await page.keyboard.press('Escape');
    await expect(site.menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('Footer', () => {
  const footerRoutes: [string, RegExp][] = [
    ['About us', /\/about$/],
    ['Services', /\/services$/],
    ['Process', /\/process$/],
    ['News', /\/news$/],
    ['Contact', /\/contact$/],
    ['Privacy policy', /\/privacy-policy$/],
  ];

  for (const [label, url] of footerRoutes) {
    test(`footer link "${label}" navigates correctly`, async ({ site, page }) => {
      await site.goto('/');
      await site.footerLink(label).click();
      await expect(page).toHaveURL(url);
      await expect(site.h1).toBeVisible();
    });
  }

  for (const social of SOCIAL_LINKS) {
    test(`${social.name} link opens safely in a new tab`, async ({ site }) => {
      await site.goto('/');
      const link = site.footer.getByRole('link', { name: new RegExp(`^${social.name} \\(opens in a new tab\\)$`, 'i') });
      await expect(link).toHaveAttribute('href', social.href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener|noreferrer/);
    });
  }

  test('footer shows a current copyright line', async ({ site }) => {
    await site.goto('/');
    await expect(site.footer).toContainText(/©\s*\d{4}\s*Technerd Digital Solutions/i);
  });
});
