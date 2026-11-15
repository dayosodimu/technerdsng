import { test, expect } from '../../../fixtures/test';
import { CONTACT_EMAILS } from '../../../utils/site-map';

test.describe('Contact page @smoke', () => {
  test.beforeEach(async ({ site }) => {
    await site.goto('/contact');
  });

  test('lists general, sales and support mailboxes as mailto links', async ({ site }) => {
    for (const [, email] of Object.entries(CONTACT_EMAILS)) {
      await expect(site.main.getByRole('link', { name: email })).toHaveAttribute('href', `mailto:${email}`);
    }
  });

  test('labels each mailbox with its purpose', async ({ site }) => {
    await expect(site.main).toContainText(/general enquiries/i);
    await expect(site.main).toContainText(/new projects/i);
    await expect(site.main).toContainText(/support/i);
  });

  test('"Email the team" CTA targets the general inbox', async ({ site }) => {
    await expect(site.main.getByRole('link', { name: /email the team/i })).toHaveAttribute('href', new RegExp(`^mailto:${CONTACT_EMAILS.general}(\\?subject=.+)?$`));
  });

  test('mail links are well-formed addresses on the company domain', async ({ page }) => {
    const hrefs = await page.locator('main a[href^="mailto:"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^mailto:[a-z0-9._%+-]+@technerdsng\.com(\?subject=[^&]+)?$/i);
  });
});
