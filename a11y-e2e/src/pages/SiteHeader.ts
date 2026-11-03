import type { Page } from '@playwright/test';

export class SiteHeader {
  constructor(readonly page: Page) {}

  get banner() { return this.page.locator('header.site-header'); }
  get homeLogo() { return this.banner.getByRole('link', { name: 'Technerds home' }); }
  get primaryNav() { return this.page.getByRole('navigation', { name: 'Primary navigation' }); }
  get footerNav() { return this.page.getByRole('navigation', { name: 'Footer navigation' }); }
  get menuToggle() { return this.page.getByTestId('button-mobile-menu'); }
  navLink(name: string) { return this.primaryNav.getByRole('link', { name: new RegExp(`^${name}`, 'i') }); }
}
