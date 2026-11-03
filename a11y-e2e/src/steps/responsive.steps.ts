import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { A11yWorld } from '../support/world';

async function horizontalOverflow(world: A11yWorld) {
  return world.page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

/**
 * Text or controls that extend past the viewport edge. Checking scrollWidth alone is not
 * enough: sites often set overflow-x: hidden/clip, which hides the scrollbar but still
 * cuts content off (a WCAG 1.4.10 failure the user cannot scroll to).
 */
async function contentOutsideViewport(world: A11yWorld) {
  return world.page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden') return false;
        if (e.closest('[aria-hidden="true"]')) return false;
        const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent || '').trim());
        const interactive = e.matches('a, button, input, select, textarea, img');
        return (hasText || interactive) && (r.right > vw + 1 || r.left < -1);
      })
      .map((e) => {
        const r = e.getBoundingClientRect();
        return `${e.tagName.toLowerCase()}${e.className ? '.' + String(e.className).split(' ')[0] : ''} "${(e.textContent || '').trim().slice(0, 35)}" spans ${Math.round(r.left)}–${Math.round(r.right)}px (viewport ${vw}px)`;
      });
  });
}

Then('the page should not scroll horizontally', async function (this: A11yWorld) {
  const { scrollWidth, clientWidth } = await horizontalOverflow(this);
  expect(scrollWidth, `scrollWidth ${scrollWidth} vs viewport ${clientWidth}`).toBeLessThanOrEqual(clientWidth + 1);
});

Then('no text or control should be cut off at the viewport edge', async function (this: A11yWorld) {
  const outside = await contentOutsideViewport(this);
  if (outside.length) this.attach(await this.page.screenshot({ fullPage: true }), 'image/png');
  expect(outside, 'content extending beyond the viewport (WCAG 1.4.10)').toEqual([]);
});

Then('content should extend beyond the viewport', async function (this: A11yWorld) {
  expect((await contentOutsideViewport(this)).length).toBeGreaterThan(0);
});

When('I resize text to {int} percent', async function (this: A11yWorld, pct: number) {
  await this.page.addStyleTag({ content: `html { font-size: ${pct}% !important; }` });
  await this.page.waitForTimeout(300);
});

Then('the level-1 heading should be visible', async function (this: A11yWorld) {
  await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
});

When('I apply the WCAG text-spacing overrides', async function (this: A11yWorld) {
  // WCAG 1.4.12 bookmarklet values.
  await this.page.addStyleTag({
    content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
              p { margin-bottom: 2em !important; }`,
  });
  await this.page.waitForTimeout(300);
});

Then('no text container should clip its content', async function (this: A11yWorld) {
  const clipped = await this.page.evaluate(() =>
    [...document.querySelectorAll('main p, main h1, main h2, main h3, main a, main button, main li, main strong')]
      .filter((el) => {
        const s = getComputedStyle(el);
        const clips = /(hidden|clip)/.test(s.overflow + s.overflowX + s.overflowY);
        return clips && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2);
      })
      .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 40)}"`));
  expect(clipped).toEqual([]);
});

const runningAnimations = (world: A11yWorld) =>
  world.page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((e) => {
        const s = getComputedStyle(e);
        const dur = Math.max(...s.animationDuration.split(',').map(parseFloat));
        return s.animationName !== 'none' && dur > 0.01;
      })
      .map((e) => `${(e as HTMLElement).className}: ${getComputedStyle(e).animationName}`));

Then('no element should be running a CSS animation', async function (this: A11yWorld) {
  expect(await runningAnimations(this)).toEqual([]);
});

Then('at least one element should be running a CSS animation', async function (this: A11yWorld) {
  expect((await runningAnimations(this)).length).toBeGreaterThan(0);
});
