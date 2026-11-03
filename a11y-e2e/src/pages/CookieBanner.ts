import type { Page } from '@playwright/test';

export const COOKIE_BANNER = '.cookie-consent';

export class CookieBanner {
  constructor(readonly page: Page) {}

  get region() { return this.page.locator(COOKIE_BANNER); }
  get heading() { return this.region.getByRole('heading', { name: 'Your cookie choices' }); }
  button(name: string) { return this.region.getByRole('button', { name }); }
  get settingsPanel() { return this.region.locator('.cookie-settings'); }
  get toggles() { return this.region.locator('input[type="checkbox"], [role="switch"]'); }
  get privacyOptions() { return this.page.getByRole('button', { name: 'Privacy options' }); }

  async dismiss() {
    if (await this.region.isVisible()) await this.button('Reject optional cookies').click();
  }
}
