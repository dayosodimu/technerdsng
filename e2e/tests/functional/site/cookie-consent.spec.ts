import { test, expect } from '../../../fixtures/test';

/**
 * Cookie consent (NDPA / GDPR-style). These tests start with NO stored choice.
 * Key requirement: Google Analytics must not load until analytics consent is given.
 */
test.describe('Cookie consent banner', () => {
  test.use({ consent: 'none' });

  const gaRequest = (url: string) => /googletagmanager\.com|google-analytics\.com/.test(url);

  test('banner is shown on first visit with accept / reject / customize', async ({ site, cookieConsent }) => {
    await site.goto('/');
    await expect(cookieConsent.panel).toBeVisible();
    await expect(cookieConsent.panel).toContainText(/your cookie choices/i);
    await expect(cookieConsent.acceptAll).toBeVisible();
    await expect(cookieConsent.rejectOptional).toBeVisible();
    await expect(cookieConsent.customize).toBeVisible();
  });

  test('no Google Analytics requests before consent', async ({ page, site }) => {
    const gaHits: string[] = [];
    page.on('request', (r) => gaRequest(r.url()) && gaHits.push(r.url()));
    await site.goto('/');
    await page.waitForLoadState('networkidle');
    expect(gaHits, 'GA must not load before consent').toEqual([]);
  });

  test('"Reject optional" stores necessary-only and keeps GA off', async ({ page, site, cookieConsent }) => {
    const gaHits: string[] = [];
    page.on('request', (r) => gaRequest(r.url()) && gaHits.push(r.url()));
    await site.goto('/');
    await cookieConsent.rejectOptional.click();
    await expect(cookieConsent.panel).toBeHidden();
    expect(await cookieConsent.storedPreferences()).toMatchObject({
      necessary: true,
      functional: false,
      analytical: false,
      advertisement: false,
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(cookieConsent.panel).toBeHidden();
    expect(gaHits).toEqual([]);
  });

  test('"Accept all" stores every category and loads GA', async ({ page, site, cookieConsent }) => {
    await site.goto('/');
    const gaLoaded = page.waitForRequest((r) => gaRequest(r.url()), { timeout: 15_000 });
    await cookieConsent.acceptAll.click();
    await expect(cookieConsent.panel).toBeHidden();
    expect(await cookieConsent.storedPreferences()).toMatchObject({
      necessary: true,
      functional: true,
      analytical: true,
      advertisement: true,
    });
    await gaLoaded;
  });

  test('"Customize" defaults optional categories to OFF (opt-in)', async ({ site, cookieConsent }) => {
    await site.goto('/');
    await cookieConsent.customize.click();
    await expect(cookieConsent.functional).not.toBeChecked();
    await expect(cookieConsent.analytical).not.toBeChecked();
    await expect(cookieConsent.advertisement).not.toBeChecked();
  });

  test('custom choice (analytics only) is saved exactly', async ({ site, cookieConsent }) => {
    await site.goto('/');
    await cookieConsent.customize.click();
    await cookieConsent.analytical.check();
    await cookieConsent.save.click();
    await expect(cookieConsent.panel).toBeHidden();
    expect(await cookieConsent.storedPreferences()).toMatchObject({ analytical: true, functional: false, advertisement: false });
  });

  test('footer "Privacy options" re-opens settings and closing keeps the saved choice @defect', async ({ site, cookieConsent }) => {
    await site.goto('/');
    await cookieConsent.rejectOptional.click();
    await cookieConsent.privacyOptions.click();
    await expect(cookieConsent.panel).toBeVisible();
    await expect(cookieConsent.analytical).not.toBeChecked();
    await cookieConsent.close.click();
    // Observed 2026-11-15: panel falls back to the first-visit banner (Accept / Reject / Customize)
    await expect(cookieConsent.acceptAll, 'banner must not re-prompt after a saved choice').toBeHidden();
    await expect(cookieConsent.panel).toBeHidden();
    expect(await cookieConsent.storedPreferences()).toMatchObject({ analytical: false });
  });

  test('consent panel is exposed as an accessible dialog @a11y @defect', async ({ site, cookieConsent }) => {
    // Observed 2026-11-15: <section class="cookie-consent"> has no role="dialog"/aria-modal/label
    await site.goto('/');
    await expect(cookieConsent.panel).toBeVisible();
    const role = await cookieConsent.panel.getAttribute('role');
    expect(['dialog', 'alertdialog', 'region']).toContain(role);
    expect(
      (await cookieConsent.panel.getAttribute('aria-label')) ?? (await cookieConsent.panel.getAttribute('aria-labelledby')),
    ).toBeTruthy();
  });
});
