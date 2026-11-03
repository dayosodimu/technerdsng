import { When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { A11yWorld } from '../support/world';
import { COOKIE_BANNER } from '../pages/CookieBanner';

type Focus = NonNullable<Awaited<ReturnType<A11yWorld['home']['focused']>>>;
const MAX_TABS = 200;

/** Tabs forward until focus wraps back to the start or leaves the document. */
async function tabThroughPage(world: A11yWorld, onEach?: (f: Focus) => Promise<void>) {
  const seen: Focus[] = [];
  for (let i = 0; i < MAX_TABS; i++) {
    await world.page.keyboard.press('Tab');
    const f = await world.home.focused();
    if (!f) break; // focus moved to the browser chrome / body: end of the tab cycle
    if (seen.length > 2 && f.key === seen[0].key) break; // wrapped around
    seen.push(f);
    if (onEach) await onEach(f);
  }
  return seen;
}

When('I tab through the whole page', async function (this: A11yWorld) {
  this.bag.tabbed = await tabThroughPage(this);
});

Then('focus should move to the main content region', async function (this: A11yWorld) {
  await expect(this.home.main).toBeFocused();
});

Then('the focus order should have been:', async function (this: A11yWorld, table: DataTable) {
  const expected = table.raw().map((r) => r[0]);
  const actual = (this.bag.focusOrder as Focus[]).map((f) => f.name);
  expect(actual.map((a) => a.toLowerCase())).toEqual(expected.map((e) => e.toLowerCase()));
});

Then('every focused element should have a visible focus indicator', async function (this: A11yWorld) {
  const tabbed = this.bag.tabbed as Focus[];
  expect(tabbed.length, 'number of focusable elements').toBeGreaterThan(10);
  const missing = tabbed.filter((f) => !f.outline && !f.boxShadow);
  expect(missing.map((m) => `${m.tag} "${m.name}"`), 'elements without a focus indicator').toEqual([]);
});

When('I move focus to the primary navigation link {string}', async function (this: A11yWorld, name: string) {
  await this.header.navLink(name).focus();
  await expect(this.header.navLink(name)).toBeFocused();
});

Then('the {string} page should load with a descriptive title', async function (this: A11yWorld, name: string) {
  await expect(this.page).toHaveURL(new RegExp(`/${name.toLowerCase()}$`));
  await expect(this.page).toHaveTitle(new RegExp(name, 'i'));
});

Then('focus should have reached the footer {string} button', async function (this: A11yWorld, name: string) {
  const names = (this.bag.tabbed as Focus[]).map((f) => f.name);
  expect(names).toContain(name);
});

Then('focus should never have stayed on the same element for consecutive Tab presses', async function (this: A11yWorld) {
  const t = this.bag.tabbed as Focus[];
  const stuck = t.filter((f, i) => i > 0 && f.key === t[i - 1].key);
  expect(stuck.map((s) => s.name), 'elements that kept focus after Tab').toEqual([]);
});

When('I tab through the page while the cookie banner is open', async function (this: A11yWorld) {
  await expect(this.cookies.region).toBeVisible();
  const hidden: { name: string; coverage: number }[] = [];
  await tabThroughPage(this, async (f) => {
    const coverage = await this.home.focusedCoverageBy(COOKIE_BANNER);
    if (coverage >= 0.99) hidden.push({ name: `${f.tag} "${f.name}"`, coverage });
  });
  this.bag.hiddenByBanner = hidden;
});

Then('no focused element should be fully covered by the cookie banner', async function (this: A11yWorld) {
  const hidden = this.bag.hiddenByBanner as { name: string }[];
  if (hidden.length) {
    this.attach(await this.page.screenshot(), 'image/png');
  }
  expect(hidden.map((h) => h.name), 'focused elements fully hidden behind the cookie banner (WCAG 2.4.11)').toEqual([]);
});

When('I remove all focus styles from the page', async function (this: A11yWorld) {
  await this.page.addStyleTag({
    content: '*, *:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }',
  });
});

Then('the focus-visible check should report at least one element without an indicator', async function (this: A11yWorld) {
  const missing = (this.bag.tabbed as Focus[]).filter((f) => !f.outline && !f.boxShadow);
  expect(missing.length).toBeGreaterThan(0);
});
