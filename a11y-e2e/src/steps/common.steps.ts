import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { A11yWorld } from '../support/world';
import { routes } from '../support/config';

type Focus = NonNullable<Awaited<ReturnType<A11yWorld['home']['focused']>>>;

Given('I open the {string} page', async function (this: A11yWorld, name: string) {
  const path = routes[name];
  if (!path) throw new Error(`Unknown page "${name}". Known: ${Object.keys(routes).join(', ')}`);
  const res = await this.home.open(path);
  expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400);
});

Given('I open the URL {string}', async function (this: A11yWorld, path: string) {
  await this.home.open(path);
});

When('I visit every public page', async function (this: A11yWorld) {
  const visited: { name: string; path: string; title: string; viewport: string }[] = [];
  for (const [name, path] of Object.entries(routes)) {
    await this.home.open(path);
    visited.push({
      name, path,
      title: await this.page.title(),
      viewport: (await this.page.locator('meta[name="viewport"]').getAttribute('content')) || '',
    });
  }
  this.bag.visited = visited;
});

Given('the cookie banner is dismissed', async function (this: A11yWorld) {
  await this.cookies.dismiss();
  await expect(this.cookies.region).toBeHidden();
});

Given('the viewport is {int} by {int} pixels', async function (this: A11yWorld, width: number, height: number) {
  await this.page.setViewportSize({ width, height });
});

When('I reload the page', async function (this: A11yWorld) {
  await this.page.reload({ waitUntil: 'networkidle' });
  await this.page.locator('h1').first().waitFor();
});

async function press(world: A11yWorld, key: string, times = 1) {
  const order = (world.bag.focusOrder as Focus[]) || [];
  for (let i = 0; i < times; i++) {
    await world.page.keyboard.press(key);
    const f = await world.home.focused();
    if (f) order.push(f);
  }
  world.bag.focusOrder = order;
}

When('I press {string}', async function (this: A11yWorld, key: string) {
  await press(this, key);
});

When('I press {string} {int} times', async function (this: A11yWorld, key: string, times: number) {
  await press(this, key, times);
});

Then('the focused element should be the link {string}', async function (this: A11yWorld, name: string) {
  const f = await this.home.focused();
  expect(f?.tag, `focused element: ${JSON.stringify(f)}`).toBe('a');
  expect(f?.name).toBe(name);
});

Then('the focused element should be fully visible in the viewport', async function (this: A11yWorld) {
  // Allow the skip link's slide-in transition to settle before measuring.
  await this.page.waitForTimeout(400);
  const f = await this.home.focused();
  expect(f?.fullyInViewport, `focused element rect: ${JSON.stringify(f?.rect)}`).toBe(true);
});
