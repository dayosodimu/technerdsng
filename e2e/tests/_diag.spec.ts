import { test } from '../fixtures/test';

test('diag markup @diag', async ({ page, context }) => {
  test.skip(!['chromium-desktop', 'mobile-chrome'].includes(test.info().project.name));
  const out: Record<string, unknown> = {};
  await page.goto('/');
  await page.locator('h1').waitFor();
  out.intro = await page.locator('#intro').evaluate((e) => e.tagName).catch(() => 'missing');
  out.sections = await page.locator('main > *').evaluateAll((els) => els.map((e) => `${e.tagName}#${e.id}`));
  const mb = page.locator('header button[aria-expanded]');
  out.menuBtn = await mb.evaluateAll((b) => b.map((x) => [x.getAttribute('aria-label'), (x as HTMLElement).offsetParent !== null]));
  if (test.info().project.name === 'mobile-chrome') {
    await mb.first().click();
    await page.waitForTimeout(500);
    out.menuAfter = await mb.evaluateAll((b) => b.map((x) => [x.getAttribute('aria-label'), x.getAttribute('aria-expanded')]));
  }
  const fb = page.locator('button[aria-controls="faq-assistant-panel"]');
  await fb.click();
  out.faqAfter = await fb.evaluate((x) => [x.getAttribute('aria-label'), x.textContent?.trim(), x.getAttribute('aria-expanded')]);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  out.faqAfterEsc = await fb.getAttribute('aria-expanded');
  // cookie privacy options
  await page.locator('footer button', { hasText: /privacy options/i }).click();
  await page.waitForTimeout(500);
  out.cookieOpen = await page.locator('section.cookie-consent').evaluate((e) => [(e as HTMLElement).innerText.slice(0, 200), [...e.querySelectorAll('button')].map((b) => b.textContent?.trim())]);
  await page.locator('section.cookie-consent button', { hasText: /close settings/i }).click();
  await page.waitForTimeout(700);
  out.cookieAfterClose = await page.locator('section.cookie-consent').evaluate((e) => [getComputedStyle(e).display, (e as HTMLElement).innerText.slice(0, 200), [...e.querySelectorAll('button')].map((b) => b.textContent?.trim())]).catch(() => 'gone');
  out.cookies = (await context.cookies()).map((c) => [c.name, c.domain, c.secure, c.httpOnly, c.sameSite]);
  // sign-in
  await page.goto('/sign-in');
  await page.locator('#identifier-field').waitFor({ timeout: 20000 });
  out.signinHeads = await page.locator('h1,h2,h3,p').evaluateAll((e) => e.slice(0, 8).map((x) => `${x.tagName}:${x.textContent?.trim().slice(0, 40)}`));
  out.pw = await page.locator('#password-field').evaluate((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e.closest('.cl-formField') ?? e); return [r.width, r.height, s.opacity, s.position, s.clipPath, (e.closest('[aria-hidden]') as HTMLElement)?.getAttribute('aria-hidden')]; });
  await page.locator('#identifier-field').fill('not-an-email');
  await page.locator('button.cl-formButtonPrimary').click();
  await page.waitForTimeout(3000);
  out.afterBad = [page.url(), await page.locator('#identifier-field').getAttribute('aria-invalid'), await page.locator('.cl-card, .cl-cardBox').first().innerText().catch(() => '')];
  out.errEls = await page.locator('[class*="rror"], [role=alert], [aria-live]').evaluateAll((e) => e.map((x) => `${x.className.toString().slice(0, 60)}|${x.textContent?.trim().slice(0, 60)}`));
  console.log('DIAG ' + JSON.stringify(out));
});
