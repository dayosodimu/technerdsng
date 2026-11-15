import { test, expect } from '../../../fixtures/test';
import { FAQ_QUESTIONS } from '../../../utils/site-map';

test.describe('Quick answers (FAQ assistant) widget', () => {
  test.beforeEach(async ({ site }) => {
    await site.goto('/');
  });

  test('is collapsed by default and wired with aria-controls', async ({ faq }) => {
    await expect(faq.toggle).toBeVisible();
    await expect(faq.toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(faq.toggle).toHaveAttribute('aria-controls', 'faq-assistant-panel');
    await expect(faq.panel).toBeHidden();
  });

  test('opens, lists all questions and closes again', async ({ faq }) => {
    await faq.toggle.click();
    await expect(faq.toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(faq.panel).toBeVisible();
    await expect(faq.panel).toContainText(/quick answers/i);
    for (const q of FAQ_QUESTIONS) await expect(faq.question(q)).toBeVisible();

    await faq.closeButton.click();
    await expect(faq.panel).toBeHidden();
    await expect(faq.toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('"How can I start a project?" answers with the contact route and inbox', async ({ faq }) => {
    await faq.toggle.click();
    await faq.question('How can I start a project?').click();
    await expect(faq.panel).toContainText(/contact page|info@technerdsng\.com/i);
  });

  for (const q of FAQ_QUESTIONS) {
    test(`answers "${q}" with non-empty content`, async ({ faq }) => {
      await faq.toggle.click();
      const before = (await faq.panel.innerText()).length;
      await faq.question(q).click();
      await expect.poll(async () => (await faq.panel.innerText()).length).toBeGreaterThan(before);
    });
  }

  test('Escape key closes the panel', async ({ faq, page }) => {
    await faq.toggle.click();
    await expect(faq.panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(faq.panel).toBeHidden();
  });

  test('widget is available on every public page', async ({ site, faq }) => {
    for (const path of ['/about', '/services', '/news', '/process', '/contact']) {
      await site.goto(path);
      await expect(faq.toggle, path).toBeVisible();
    }
  });
});
