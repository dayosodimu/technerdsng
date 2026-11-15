import { test, expect, isMobile } from '../../../fixtures/test';

/** /sign-in - Clerk sign-in for the content studio. No real credentials are used here. */
test.describe('Admin sign-in page', () => {
  test.beforeEach(async ({ signInPage }) => {
    await signInPage.goto();
  });

  test('renders the sign-in form @smoke', async ({ signInPage, page }) => {
    await expect(page).toHaveTitle(/sign in \| technerds/i);
    await expect(signInPage.heading).toBeVisible();
    await expect(page.getByText('Email address', { exact: true })).toBeVisible();
    await expect(signInPage.email).toHaveAttribute('autocomplete', /email|username/);
    await expect(signInPage.continueButton).toBeEnabled();
    await expect(signInPage.googleButton).toBeVisible();
  });

  test('empty submission is blocked', async ({ signInPage, page }) => {
    await signInPage.continueButton.click();
    await expect(page).toHaveURL(/\/sign-in/);
    // Either native required-validation or a Clerk error must stop progress
    const nativeInvalid = await signInPage.email.evaluate((el: HTMLInputElement) => !el.checkValidity());
    if (!nativeInvalid) await expect(signInPage.formError.first()).toBeVisible();
    await expect(signInPage.password).toBeHidden();
  });

  test('malformed email shows a validation error', async ({ signInPage, page }) => {
    await signInPage.email.fill('not-an-email');
    await signInPage.continueButton.click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(signInPage.formError.first()).toBeVisible();
  });

  test('unknown account is rejected without revealing details', async ({ signInPage }) => {
    await signInPage.email.fill(`qa-nonexistent-${Date.now()}@example.com`);
    await signInPage.continueButton.click();
    await expect(signInPage.formError.first()).toBeVisible({ timeout: 15_000 });
    await expect(signInPage.formError.first()).not.toContainText(/stack|exception|sql|undefined/i);
  });

  test('password field masks input and can be revealed', async ({ signInPage }) => {
    test.skip(!(await signInPage.password.isVisible()), 'Password step not shown on first screen for this Clerk config');
    await expect(signInPage.password).toHaveAttribute('type', 'password');
    await signInPage.showPassword.click();
    await expect(signInPage.password).toHaveAttribute('type', 'text');
  });

  test('"Back to Technerds" returns to the public site', async ({ signInPage, page }) => {
    await signInPage.backLink.click();
    await expect(page).toHaveURL(/technerdsng\.com\/?$/);
  });

  test('sign-up link is present (confirm public sign-up is intended for the studio)', async ({ signInPage }) => {
    // Review item: a public "Sign up" on an editor-only studio may let anyone create an account.
    // Ensure new accounts get NO editor rights without an explicit role (covered in admin-authenticated spec).
    await expect(signInPage.signUpLink).toHaveAttribute('href', /\/sign-up/);
  });

  test('Google SSO button starts an OAuth redirect to accounts.google.com', async ({ signInPage, page }) => {
    const [popupOrNav] = await Promise.all([
      Promise.race([
        page.waitForEvent('popup').then((p) => p.url()),
        page.waitForURL(/accounts\.google\.com|clerk\./, { timeout: 15_000 }).then(() => page.url()),
      ]),
      signInPage.googleButton.click(),
    ]);
    expect(popupOrNav).toMatch(/google\.com|clerk/);
  });

  test('heading and subtitle do not overlap (visual layout) @defect', async ({ page }) => {
    // Observed 2026-11-15 on desktop: "place to grow." overlaps the "Sign in to manage…" line
    test.skip(isMobile(test.info().project.name), 'Desktop layout check');
    const title = page.getByRole('heading', { name: /good work deserves/i });
    const subtitle = page.getByText(/sign in to manage company copy/i);
    const [a, b] = [await title.boundingBox(), await subtitle.boundingBox()];
    expect(a && b).toBeTruthy();
    expect(a!.y + a!.height, 'heading bottom must be above subtitle top').toBeLessThanOrEqual(b!.y + 1);
  });
});
