import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { A11yWorld } from '../support/world';
import { config } from '../support/config';
import { runAxe, atOrAbove, formatViolations } from '../support/axe';
import { COOKIE_BANNER } from '../pages/CookieBanner';

When('I run an axe-core scan against WCAG 2.2 AA', async function (this: A11yWorld) {
  this.axeResults = await runAxe(this.page, { tags: config.wcagTags });
});

When('I run the axe-core rules {string}', async function (this: A11yWorld, list: string) {
  this.axeResults = await runAxe(this.page, { rules: list.split(',').map((r) => r.trim()) });
});

When('I scan only the cookie banner against WCAG 2.2 AA', async function (this: A11yWorld) {
  await expect(this.cookies.region).toBeVisible();
  this.axeResults = await runAxe(this.page, { tags: config.wcagTags, include: COOKIE_BANNER });
});

Then(
  'there should be no {string} or worse violations except tracked rule {string}',
  async function (this: A11yWorld, impact: string, tracked: string) {
    const found = atOrAbove(this.axeResults!, impact as any).filter((v) => v.id !== tracked);
    this.attach(`All violations:\n${formatViolations(this.axeResults!.violations)}`, 'text/plain');
    expect(found, formatViolations(found)).toHaveLength(0);
  },
);

Then('there should be no violations', async function (this: A11yWorld) {
  const v = this.axeResults!.violations;
  expect(v, formatViolations(v)).toHaveLength(0);
});

Then('axe-core should report the rule {string}', async function (this: A11yWorld, rule: string) {
  const ids = this.axeResults!.violations.map((v) => v.id);
  expect(ids, `violations reported: ${ids.join(', ') || 'none'}`).toContain(rule);
});

Then(
  'no page should restrict zoom with {string} below {int} or {string}',
  async function (this: A11yWorld, _attr: string, minScale: number, _noScale: string) {
    const visited = this.bag.visited as { path: string; viewport: string }[];
    const offenders = visited.filter(({ viewport }) => {
      const max = /maximum-scale\s*=\s*([\d.]+)/i.exec(viewport);
      return (max && parseFloat(max[1]) < minScale) || /user-scalable\s*=\s*(no|0)/i.test(viewport);
    });
    expect(
      offenders,
      `Zoom is blocked (WCAG 1.4.4) on:\n${offenders.map((o) => `  ${o.path}  →  content="${o.viewport}"`).join('\n')}`,
    ).toHaveLength(0);
  },
);
