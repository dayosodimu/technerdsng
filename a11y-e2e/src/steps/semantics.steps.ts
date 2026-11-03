import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { A11yWorld } from '../support/world';

Then('the document language should be {string}', async function (this: A11yWorld, lang: string) {
  await expect(this.page.locator('html')).toHaveAttribute('lang', new RegExp(`^${lang}`, 'i'));
});

Then('the page title should be descriptive and mention {string}', async function (this: A11yWorld, brand: string) {
  const title = await this.page.title();
  expect(title.length, `title "${title}"`).toBeGreaterThan(10);
  expect(title).toContain(brand);
});

Then('the page title should contain {string}', async function (this: A11yWorld, text: string) {
  await expect(this.page).toHaveTitle(new RegExp(text, 'i'));
});

Then('the page should have exactly one level-1 heading', async function (this: A11yWorld) {
  await expect(this.page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

Then('heading levels should not skip', async function (this: A11yWorld) {
  const levels = await this.page.evaluate(() =>
    [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter((h) => (h as HTMLElement).offsetParent !== null || getComputedStyle(h).position === 'fixed')
      .map((h) => ({ level: Number(h.tagName[1]), text: (h.textContent || '').trim().slice(0, 40) })),
  );
  const skips = levels.filter((h, i) => i > 0 && h.level > levels[i - 1].level + 1);
  expect(skips, `heading outline: ${levels.map((l) => 'h' + l.level).join(' ')}`).toEqual([]);
});

Then('the page should expose banner, navigation, main and contentinfo landmarks', async function (this: A11yWorld) {
  for (const role of ['banner', 'navigation', 'main', 'contentinfo'] as const) {
    expect(await this.page.getByRole(role).count(), `"${role}" landmark count`).toBeGreaterThan(0);
  }
});

Then('every page title should be unique', async function (this: A11yWorld) {
  const visited = this.bag.visited as { path: string; title: string }[];
  const dupes = visited.filter((v, i) => visited.findIndex((w) => w.title === v.title) !== i);
  expect(dupes.map((d) => `${d.path}: ${d.title}`)).toEqual([]);
});

Then('every image should have an alt attribute or be hidden from assistive technology', async function (this: A11yWorld) {
  const bad = await this.page.$$eval('img', (imgs) =>
    imgs.filter((i) => !i.hasAttribute('alt') && i.getAttribute('aria-hidden') !== 'true' && i.getAttribute('role') !== 'presentation')
      .map((i) => i.outerHTML.slice(0, 120)));
  expect(bad).toEqual([]);
});

Then('every link should have a discernible accessible name', async function (this: A11yWorld) {
  for (const link of await this.page.getByRole('link').all()) await expect(link).toHaveAccessibleName(/\S/);
});

Then('every button should have a discernible accessible name', async function (this: A11yWorld) {
  for (const btn of await this.page.getByRole('button').all()) await expect(btn).toHaveAccessibleName(/\S/);
});

Then('every email link text should state the email address', async function (this: A11yWorld) {
  const links = await this.home.contactEmails.all();
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    const href = (await link.getAttribute('href'))!;
    const address = href.replace(/^mailto:/, '').split('?')[0];
    const name = (await link.innerText()).trim();
    // Either the visible text is the address, or it is a clear "Email …" call to action.
    expect(name.toLowerCase().includes(address.toLowerCase()) || /^email\b/i.test(name), `${href} → "${name}"`).toBe(true);
  }
});

Then('the services section should contain {int} service cards each with a level-3 heading', async function (this: A11yWorld, n: number) {
  await expect(this.home.serviceCards).toHaveCount(n);
  for (const card of await this.home.serviceCards.all()) {
    await expect(card.getByRole('heading', { level: 3 })).toHaveCount(1);
  }
});

Then('the page should offer a link back to the Home page', async function (this: A11yWorld) {
  const homeLinks = await this.page.$$eval('a[href]', (as) =>
    as.filter((a) => new URL((a as HTMLAnchorElement).href).pathname === '/').length);
  expect(homeLinks, 'links pointing to "/"').toBeGreaterThan(0);
});
