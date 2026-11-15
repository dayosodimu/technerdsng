import { test, expect } from '../../fixtures/test';
import { ALL_AUDITED_PATHS } from '../../utils/site-map';

const VIEWPORTS = [
  { name: 'small-phone', width: 320, height: 640 },
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
];

test.describe('Responsive layout', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'chromium-desktop', 'Viewport sweep runs once on Chromium');
  });

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow or clipped headings at ${vp.width}px (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of ALL_AUDITED_PATHS) {
        await page.goto(path);
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 20_000 });
        const { scrollW, clientW, offenders } = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const offenders = [...document.querySelectorAll('body *')]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              const s = getComputedStyle(el);
              return r.width > 0 && r.right > vw + 2 && s.position !== 'fixed' && !el.closest('[aria-hidden="true"]');
            })
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className?.toString().split(' ')[0] ?? ''}`);
          return { scrollW: document.documentElement.scrollWidth, clientW: vw, offenders };
        });
        expect.soft(scrollW, `${path} @${vp.width}px horizontal scroll; offenders: ${offenders.join(', ')}`).toBeLessThanOrEqual(clientW + 1);
      }
    });
  }

  test('tap targets are at least 24x24 CSS px on mobile (WCAG 2.5.8)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const small = await page.locator('a:visible, button:visible').evaluateAll((els) =>
      els
        .map((e) => ({ r: e.getBoundingClientRect(), t: ((e as HTMLElement).innerText || e.getAttribute('aria-label') || '').trim().slice(0, 25) }))
        .filter(({ r }) => r.width > 0 && (r.width < 24 || r.height < 24))
        .map(({ r, t }) => `${t} (${Math.round(r.width)}x${Math.round(r.height)})`),
    );
    expect.soft(small).toEqual([]);
  });

  test('text remains readable when zoomed to 200% (reflow)', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 }); // 1280px @ 200%
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
