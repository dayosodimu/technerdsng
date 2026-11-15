import type { Locator, Page } from '@playwright/test';
import { CONSENT_STORAGE_KEY } from '../utils/site-map';

export class CookieConsent {
  readonly panel: Locator;
  readonly acceptAll: Locator;
  readonly rejectOptional: Locator;
  readonly customize: Locator;
  readonly save: Locator;
  readonly close: Locator;
  readonly privacyOptions: Locator;
  readonly functional: Locator;
  readonly analytical: Locator;
  readonly advertisement: Locator;

  constructor(readonly page: Page) {
    this.panel = page.locator('section.cookie-consent');
    this.acceptAll = this.panel.getByRole('button', { name: 'Accept all cookies' });
    this.rejectOptional = this.panel.getByRole('button', { name: 'Reject optional cookies' });
    this.customize = this.panel.getByRole('button', { name: 'Customize choices' });
    this.save = this.panel.getByRole('button', { name: 'Save my choices' });
    this.close = this.panel.getByRole('button', { name: 'Close settings' });
    this.privacyOptions = page.locator('footer').getByRole('button', { name: /privacy options/i });
    this.functional = page.locator('#cookie-category-functional-cookies');
    this.analytical = page.locator('#cookie-category-analytical-cookies');
    this.advertisement = page.locator('#cookie-category-advertisement-cookies');
  }

  async storedPreferences(): Promise<Record<string, boolean> | null> {
    const raw = await this.page.evaluate((k) => window.localStorage.getItem(k), CONSENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw).preferences as Record<string, boolean>) : null;
  }
}
