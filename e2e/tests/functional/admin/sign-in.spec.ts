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
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(signInPage.heading).toBeVisible();
    await expect(signInPage.email).toBeVisible();
  });

  test('malformed email cannot sign in and surfaces an error', async ({ signInPage, page }) => {
    // Clerk does not validate the identifier format up front; it reveals the password step.
    await signInPage.email.fill('not-an-email');
    await signInPage.continueButton.click();
    await page.waitForTimeout(1500);
    if (await signInPage.passwordStepActive()) {
      await signInPage.password.fill('Wrong-Password-123!');
      await signInPage.continueButton.click();
    }
    await expect(signInPage.formError.first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('unknown account is rejected without revealing details', async ({ signInPage }) => {
    await signInPage.email.fill(`qa-nonexistent-${Date.now()}@example.com`);
    await signInPage.continueButton.click();
    if (await signInPage.passwordStepActive()) {
      await signInPage.password.fill('Wrong-Password-123!');
      await signInPage.continueButton.click();
    }
    await expect(signInPage.formError.first()).toBeVisible({ timeout: 15_000 });
    await expect(signInPage.formError.first()).not.toContainText(/stack|exception|sql|undefined/i);
  });

  test('password input is masked', async ({ signInPage }) => {
    await expect(signInPage.password).toHaveAttribute('type', 'password');
    await expect(signInPage.password).toHaveAttribute('name', 'password');
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
    // Hero copy is rendered as <p> elements, not headings
    const title = page.getByText(/good work deserves a clear place to grow/i);
    const subtitle = page.getByText(/sign in to manage company copy/i);
    const [a, b] = [await title.boundingBox(), await subtitle.boundingBox()];
    expect(a && b).toBeTruthy();
    expect(a!.y + a!.height, 'heading bottom must be above subtitle top').toBeLessThanOrEqual(b!.y + 1);
  });
});
