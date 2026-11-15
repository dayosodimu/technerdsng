import { test, expect } from '../../../fixtures/test';

/**
 * /admin - Technerds Content Studio, anonymous visitor.
 * The studio must never expose editing tools without a signed-in editor.
 */
test.describe('Admin gate (unauthenticated) @smoke', () => {
  test('/admin shows the sign-in gate', async ({ adminPage, page }) => {
    await adminPage.goto();
    await expect(page).toHaveTitle(/content editor \| technerds/i);
    await expect(adminPage.gateEyebrow).toBeVisible();
    await expect(adminPage.gateHeading).toBeVisible();
    await expect(page.getByText(/reserved for signed-in editors/i)).toBeVisible();
  });

  test('no editor controls are rendered for anonymous users', async ({ adminPage }) => {
    await adminPage.goto();
    await expect(adminPage.gateHeading).toBeVisible();
    await expect(adminPage.editorControls).toHaveCount(0);
  });

  test('"Sign in to continue" leads to /sign-in', async ({ adminPage, signInPage, page }) => {
    await adminPage.goto();
    await adminPage.signInLink.click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(signInPage.email).toBeVisible({ timeout: 20_000 });
  });

  test('admin sub-paths do not bypass the gate', async ({ page, adminPage }) => {
    for (const path of ['/admin/', '/admin/news', '/admin/posts/new', '/admin/settings']) {
      await page.goto(path);
      await expect(page.locator('h1').first(), path).toBeVisible();
      await expect(adminPage.editorControls, `${path} must not expose editor controls`).toHaveCount(0);
    }
  });

  test('anonymous admin API calls are rejected', async ({ page, adminPage }) => {
    const apiResponses: { url: string; status: number }[] = [];
    page.on('response', (r) => {
      const u = new URL(r.url());
      const method = r.request().method();
      if (!u.hostname.endsWith('technerdsng.com') || !u.pathname.startsWith('/api/') || u.pathname.startsWith('/api/__clerk')) return;
      // Public GETs (e.g. /api/site-content feeding the marketing pages) are expected to succeed.
      if (method !== 'GET' || /\/api\/admin/i.test(u.pathname)) apiResponses.push({ url: `${method} ${u.pathname}`, status: r.status() });
    });
    await adminPage.goto();
    await expect(adminPage.gateHeading).toBeVisible();
    await page.waitForLoadState('networkidle');
    // Any write/admin API hit without a session must not succeed with data
    // NOTE: write endpoints (PUT/POST /api/site-content etc.) are not probed against production on purpose.
    for (const r of apiResponses) {
      expect([401, 403, 404], `${r.url} returned ${r.status}`).toContain(r.status);
    }
  });

  test('/admin is excluded from search indexing @seo @defect', async ({ adminPage, page }) => {
    // Observed 2026-11-15: <meta name="robots" content="index, follow"> on /admin and /sign-in
    await adminPage.goto();
    await expect(adminPage.gateHeading).toBeVisible();
    const robotsMeta = (await page.locator('meta[name="robots"]').getAttribute('content')) ?? '';
    const robotsHeader = (await page.request.get('/admin')).headers()['x-robots-tag'] ?? '';
    expect(`${robotsMeta} ${robotsHeader}`).toMatch(/noindex/i);
  });
});
