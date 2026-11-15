import type { Locator, Page } from '@playwright/test';

/** The floating "Ask a question" quick-answers widget present on every public page. */
export class FaqAssistant {
  readonly toggle: Locator;
  readonly panel: Locator;
  readonly closeButton: Locator;

  constructor(readonly page: Page) {
    // Label flips between "Ask a question" and "Close help", so locate by aria-controls
    this.toggle = page.locator('button[aria-controls="faq-assistant-panel"]');
    this.panel = page.locator('#faq-assistant-panel');
    this.closeButton = page.getByRole('button', { name: 'Close quick answers' });
  }

  question(text: string) {
    return this.panel.getByRole('button', { name: text });
  }
}
