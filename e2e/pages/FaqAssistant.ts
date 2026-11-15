import type { Locator, Page } from '@playwright/test';

/** The floating "Ask a question" quick-answers widget present on every public page. */
export class FaqAssistant {
  readonly toggle: Locator;
  readonly panel: Locator;
  readonly closeButton: Locator;

  constructor(readonly page: Page) {
    this.toggle = page.getByRole('button', { name: 'Ask a question' });
    this.panel = page.locator('#faq-assistant-panel');
    this.closeButton = page.getByRole('button', { name: 'Close quick answers' });
  }

  question(text: string) {
    return this.panel.getByRole('button', { name: text });
  }
}
