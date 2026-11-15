import AxeBuilder from '@axe-core/playwright';
import { test, expect, isMobile } from '../../fixtures/test';
import { ALL_AUDITED_PATHS } from '../../utils/site-map';

/** WCAG 2.2 AA audit with axe-core. Fails on serious/critical issues; attaches the full report. */
test.describe('Accessibility (WCAG 2.2 AA) @a11y', () => {
  for (const path of ALL_AUDITED_PATHS) {
    test(`axe scan: ${path}`, async ({ page }, testInfo) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();

      await testInfo.attach(`axe-${path.replace(/\W+/g, '_') || 'home'}.json`, {
        body: JSON.stringify(results.violations, null, 2),
        contentType: 'application/json',
      });

      const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
      const summary = blocking.map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) - ${v.help}`);
      expect(summary, `serious/critical a11y violations on ${path}`).toEqual([]);
    });
  }

  test('pinch-zoom is not disabled by the viewport meta (WCAG 1.4.4) @defect', async ({ page }) => {
    // Observed 2026-11-15: content="width=device-width, initial-scale=1.0, maximum-scale=1"
    await page.goto('/');
    const vp = (await page.locator('meta[name="viewport"]').getAttribute('content')) ?? '';
    expect(vp).not.toMatch(/user-scalable\s*=\s*(no|0)/i);
    const max = vp.match(/maximum-scale\s*=\s*([\d.]+)/i);
    if (max) expect(Number(max[1])).toBeGreaterThanOrEqual(2);
  });

  test('document language is declared', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/);
  });

  test('every image has an alt attribute', async ({ page }) => {
    for (const path of ALL_AUDITED_PATHS) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
      const missing = await page.locator('img:not([alt])').evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src));
      expect(missing, `images without alt on ${path}`).toEqual([]);
    }
  });

  test('keyboard focus is always visible on interactive elements', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit' || isMobile(test.info().project.name), 'Keyboard tabbing check on desktop Chromium/Firefox');
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const offenders: string[] = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
        return { visible, label: `${el.tagName} ${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}` };
      });
      if (info && !info.visible) offenders.push(info.label);
    }
    expect(offenders, 'elements without a visible focus indicator').toEqual([]);
  });

  test('heading levels do not skip (h1 → h2 → h3…)', async ({ page }) => {
    for (const path of ALL_AUDITED_PATHS) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
      const levels = await page.locator('main h1, main h2, main h3, main h4, main h5, main h6').evaluateAll((hs) =>
        hs.filter((h) => (h as HTMLElement).offsetParent !== null).map((h) => Number(h.tagName[1])),
      );
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] - levels[i - 1], `${path}: heading jump h${levels[i - 1]} → h${levels[i]}`).toBeLessThanOrEqual(1);
      }
    }
  });
});
