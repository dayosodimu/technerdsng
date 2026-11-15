import { test, expect } from '../../../fixtures/test';
import { PUBLIC_ROUTES } from '../../../utils/site-map';

test.describe('Public pages render @smoke', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} renders with correct title, H1 and layout`, async ({ site, page, pageErrors }) => {
      const response = await site.goto(route.path);

      expect(response?.status(), 'HTTP status').toBe(200);
      await expect(page).toHaveTitle(route.title);
      await expect(site.h1).toHaveCount(1);
      await expect(site.h1).toHaveText(route.h1);
      await expect(site.header).toBeVisible();
      await expect(site.main).toBeVisible();
      await expect(site.footer).toBeVisible();
      await expect(site.main).not.toBeEmpty();

      expect(pageErrors, 'no JS errors on page').toEqual([]);
    });
  }

  test('home hero CTA "Explore what we do" scrolls to the services section', async ({ site, page }) => {
    await site.goto('/');
    await page.getByRole('link', { name: /explore what we do/i }).click();
    await expect(page).toHaveURL(/#services$/);
    await expect(page.locator('#services')).toBeInViewport();
  });

  test('home page contains every key section', async ({ site, page }) => {
    await site.goto('/');
    for (const id of ['intro', 'services', 'about', 'process', 'contact']) {
      await expect(page.locator(`section#${id}`), `section #${id}`).toBeAttached();
    }
  });

  test('services page lists service cards', async ({ site, page }) => {
    await site.goto('/services');
    expect(await page.locator('main article').count()).toBeGreaterThanOrEqual(3);
  });

  test('process page lists process steps', async ({ site, page }) => {
    await site.goto('/process');
    expect(await page.locator('main article').count()).toBeGreaterThanOrEqual(3);
  });

  test('news page shows posts or a friendly empty state', async ({ site, page }) => {
    await site.goto('/news');
    const posts = page.locator('main article');
    const emptyState = page.getByText(/no news to share just yet/i);
    await expect(posts.first().or(emptyState)).toBeVisible();
  });

  test('privacy policy explains data handling and analytics', async ({ site, page }) => {
    await site.goto('/privacy-policy');
    await expect(site.main).toContainText(/personal information/i);
    await expect(site.main).toContainText(/cookie|analytics/i);
  });
});
