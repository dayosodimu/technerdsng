import { expect, type Locator, type Page } from '@playwright/test';

/** Case-insensitive exact match - labels are rendered uppercase via CSS. */
export const exactI = (label: string) => new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');

/** Shared chrome of every public page: header, primary nav, mobile menu, footer. */
export class SitePage {
  readonly header: Locator;
  readonly primaryNav: Locator;
  readonly footerNav: Locator;
  readonly footer: Locator;
  readonly main: Locator;
  readonly homeLogo: Locator;
  readonly skipLink: Locator;
  readonly menuButton: Locator;
  readonly h1: Locator;

  constructor(readonly page: Page) {
    this.header = page.locator('header.site-header');
    this.primaryNav = page.getByRole('navigation', { name: 'Primary navigation' });
    this.footerNav = page.getByRole('navigation', { name: 'Footer navigation' });
    this.footer = page.locator('footer');
    this.main = page.locator('main#main');
    this.homeLogo = this.header.getByRole('link', { name: 'Technerds home' });
    this.skipLink = page.getByRole('link', { name: 'Skip to main content' });
    // Label flips between "Open navigation menu" / "Close navigation menu", so locate by state attribute
    this.menuButton = page.locator('header button[aria-expanded]');
    this.h1 = page.getByRole('heading', { level: 1 });
  }

  async goto(path = '/') {
    const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    // SPA: wait until React has rendered real content into #root
    await expect(this.h1.first()).toBeVisible();
    return response;
  }

  /** Clicks a primary-nav item, opening the mobile menu first when needed. */
  async clickNav(label: string) {
    if (await this.menuButton.isVisible()) {
      await this.menuButton.click();
      await expect(this.menuButton).toHaveAttribute('aria-expanded', 'true');
    }
    await this.primaryNav.getByRole('link', { name: exactI(label) }).click();
  }

  footerLink(name: string) {
    return this.footer.getByRole('link', { name: exactI(name) });
  }
}
