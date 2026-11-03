import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import type { BrowserContext, Page } from '@playwright/test';
import type { AxeResults } from './axe';
import { HomePage } from '../pages/HomePage';
import { SiteHeader } from '../pages/SiteHeader';
import { CookieBanner } from '../pages/CookieBanner';

export class A11yWorld extends World {
  context!: BrowserContext;
  page!: Page;
  axeResults?: AxeResults;
  /** Scratch space for values shared between steps of one scenario. */
  bag: Record<string, unknown> = {};

  constructor(options: IWorldOptions) {
    super(options);
  }

  get home() { return new HomePage(this.page); }
  get header() { return new SiteHeader(this.page); }
  get cookies() { return new CookieBanner(this.page); }
}

setWorldConstructor(A11yWorld);
