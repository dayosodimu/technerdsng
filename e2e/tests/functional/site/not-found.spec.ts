import { test, expect } from '../../../fixtures/test';

test.describe('Unknown routes (404)', () => {
  const bogus = '/this-page-does-not-exist-qa';

  test('renders a branded 404 page with a way home', async ({ site, page }) => {
    await page.goto(bogus);
    await expect(page).toHaveTitle(/page not found/i);
    await expect(site.h1).toHaveText(/404/);
    await page.getByRole('link', { name: /go to technerds home/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('404 page does not leak developer copy @defect', async ({ page, site }) => {
    // Observed 2026-11-15: "Did you forget to add the page to the router?" is shown to visitors
    await page.goto(bogus);
    await expect(site.h1).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/forget to add the page to the router/i);
  });

  test('404 page is not indexable @seo', async ({ page, site }) => {
    await page.goto(bogus);
    await expect(site.h1).toBeVisible();
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots ?? '').toMatch(/noindex/i);
  });

  test('unknown route returns HTTP 404, not a soft-200 @seo @defect', async ({ request }) => {
    // SPA hosting currently answers every path with 200 + index.html
    const res = await request.get(bogus);
    expect(res.status()).toBe(404);
  });
});
