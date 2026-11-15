import { test, expect } from '../../../fixtures/test';

/**
 * Authenticated content-studio journey. Runs only when ADMIN_EMAIL and ADMIN_PASSWORD
 * (a dedicated *test* editor account with email+password, not Google SSO) are provided.
 * Tests are read-only by default; the publish/delete round-trip only runs with ADMIN_ALLOW_WRITES=true.
 */
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

test.describe('Admin content studio (authenticated)', () => {
  test.skip(!email || !password, 'Set ADMIN_EMAIL and ADMIN_PASSWORD to run authenticated admin tests');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ signInPage, page }) => {
    await signInPage.goto();
    await signInPage.signIn(email!, password!);
    await page.waitForURL((u) => !u.pathname.startsWith('/sign-in'), { timeout: 30_000 });
    await page.goto('/admin');
  });

  test('editor sees the studio instead of the gate', async ({ adminPage, page }) => {
    await expect(adminPage.gateHeading).toBeHidden();
    await expect(page.locator('main')).not.toContainText(/reserved for signed-in editors/i);
  });

  test('session persists across reload', async ({ adminPage, page }) => {
    await page.reload();
    await expect(adminPage.gateHeading).toBeHidden();
  });

  test('editor can see a way to manage news/content', async ({ page }) => {
    await expect(page.getByRole('main')).toContainText(/news|post|content|copy/i);
  });

  test('sign-out returns the studio to the gate', async ({ page, adminPage }) => {
    const signOut = page.getByRole('button', { name: /sign out|log out/i }).or(page.getByRole('menuitem', { name: /sign out/i }));
    test.skip((await signOut.count()) === 0, 'No visible sign-out control found - update selector');
    await signOut.first().click();
    await page.goto('/admin');
    await expect(adminPage.gateHeading).toBeVisible();
  });

  test('draft news post round-trip (create → verify → delete)', async ({ page }) => {
    test.skip(process.env.ADMIN_ALLOW_WRITES !== 'true', 'Writes disabled - set ADMIN_ALLOW_WRITES=true against a test environment');
    const title = `QA automation draft ${Date.now()}`;
    await page.getByRole('button', { name: /new (post|article|news)/i }).click();
    await page.getByLabel(/title/i).fill(title);
    await page.getByRole('button', { name: /save( draft)?/i }).click();
    await expect(page.getByText(title)).toBeVisible();
    // Draft must not appear publicly
    const pub = await page.context().newPage();
    await pub.goto('/news');
    await expect(pub.getByText(title)).toHaveCount(0);
    await pub.close();
    // Clean up
    await page.getByText(title).click();
    await page.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm|delete/i }).last().click();
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
