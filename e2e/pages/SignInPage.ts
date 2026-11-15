import { expect, type Locator, type Page } from '@playwright/test';

/** /sign-in - Clerk-hosted sign-in component embedded in the Technerds layout. */
export class SignInPage {
  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly continueButton: Locator;
  readonly googleButton: Locator;
  readonly showPassword: Locator;
  readonly signUpLink: Locator;
  readonly backLink: Locator;
  readonly formError: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /welcome back/i });
    this.email = page.locator('#identifier-field');
    this.password = page.locator('#password-field');
    this.continueButton = page.locator('button.cl-formButtonPrimary');
    this.googleButton = page.getByRole('button', { name: /continue with google/i });
    this.showPassword = page.getByRole('button', { name: /show password/i });
    this.signUpLink = page.getByRole('link', { name: /sign up/i });
    this.backLink = page.getByRole('link', { name: /back to technerds/i });
    // Clerk renders field/global errors with these class prefixes
    this.formError = page.locator('.cl-formFieldErrorText, .cl-alert, [id$="-error-feedback"]');
  }

  async goto() {
    await this.page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    await expect(this.email).toBeVisible({ timeout: 20_000 }); // Clerk JS loads async
  }

  async signIn(email: string, password: string) {
    await this.email.fill(email);
    await this.continueButton.click();
    await expect(this.password).toBeVisible();
    await this.password.fill(password);
    await this.continueButton.click();
  }
}
