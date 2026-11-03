import type { Locator, Page } from '@playwright/test';
import { config } from '../support/config';

export class BasePage {
  constructor(readonly page: Page) {}

  async open(path = '/') {
    const response = await this.page.goto(config.baseUrl + path, { waitUntil: 'networkidle' });
    // The site is a React SPA: wait for the app shell rather than a fixed delay.
    await this.page.locator('h1').first().waitFor({ state: 'visible' });
    return response;
  }

  get main(): Locator { return this.page.locator('main'); }
  get skipLink(): Locator { return this.page.getByRole('link', { name: /skip to main content/i }); }

  /** Describes the element that currently has keyboard focus. */
  focused() {
    return this.page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        name: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim(),
        outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0,
        boxShadow: s.boxShadow !== 'none',
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        inViewport: r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth,
        fullyInViewport: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth,
        inPrimaryNav: !!el.closest('#primary-navigation'),
        primaryNavVisible: (() => {
          const nav = document.getElementById('primary-navigation');
          return !!nav && getComputedStyle(nav).display !== 'none' && getComputedStyle(nav).visibility !== 'hidden';
        })(),
        // A stable fingerprint so we can detect focus getting stuck.
        key: `${el.tagName}|${el.id}|${(el.textContent || '').trim().slice(0, 40)}|${Math.round(r.x)},${Math.round(r.y + scrollY)}`,
      };
    });
  }

  /** Fraction (0–1) of the focused element covered by the element matching `overlay`. */
  focusedCoverageBy(overlaySelector: string) {
    return this.page.evaluate((sel) => {
      const el = document.activeElement as HTMLElement | null;
      const overlay = document.querySelector(sel);
      if (!el || !overlay || overlay.contains(el)) return 0;
      const a = el.getBoundingClientRect();
      const b = overlay.getBoundingClientRect();
      const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return a.width * a.height ? (w * h) / (a.width * a.height) : 0;
    }, overlaySelector);
  }
}
