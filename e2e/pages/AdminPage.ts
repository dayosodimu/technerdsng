import type { Locator, Page } from '@playwright/test';

/** /admin - the Technerds Content Studio. Unauthenticated users see a sign-in gate. */
export class AdminPage {
  readonly gateHeading: Locator;
  readonly gateEyebrow: Locator;
  readonly signInLink: Locator;
  /** Anything that would indicate editing tools leaked to an anonymous user */
  readonly editorControls: Locator;

  constructor(readonly page: Page) {
    this.gateHeading = page.getByRole('heading', { level: 1, name: /sign in to edit/i });
    this.gateEyebrow = page.getByText(/technerds content studio/i).first();
    this.signInLink = page.getByRole('link', { name: /sign in to continue/i });
    this.editorControls = page.locator(
      'main textarea, main [contenteditable="true"], main input[type="file"], main button:has-text("Publish"), main button:has-text("Save"), main button:has-text("Delete")',
    );
  }

  async goto() {
    await this.page.goto('/admin', { waitUntil: 'domcontentloaded' });
  }
}
