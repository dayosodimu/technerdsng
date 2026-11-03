import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  get heroHeading() { return this.page.getByRole('heading', { level: 1 }); }
  get servicesSection() { return this.page.locator('section#services'); }
  get serviceCards() { return this.page.locator('[data-testid^="service-"]'); }
  get contactEmails() { return this.page.locator('a[href^="mailto:"]'); }
}
