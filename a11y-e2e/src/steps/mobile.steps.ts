import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { A11yWorld } from '../support/world';

type Focus = NonNullable<Awaited<ReturnType<A11yWorld['home']['focused']>>>;

Then('the menu toggle should have accessible name {string}', async function (this: A11yWorld, name: string) {
  await expect(this.header.menuToggle).toHaveAccessibleName(name);
});

Then('the menu toggle should have {string} set to {string}', async function (this: A11yWorld, attr: string, value: string) {
  await expect(this.header.menuToggle).toHaveAttribute(attr, value);
});

Then('the menu toggle should control the element {string}', async function (this: A11yWorld, id: string) {
  await expect(this.header.menuToggle).toHaveAttribute('aria-controls', id);
  await expect(this.page.locator(`#${id}`)).toHaveCount(1);
});

Then('the primary navigation should be hidden', async function (this: A11yWorld) {
  await expect(this.page.locator('#primary-navigation')).toBeHidden();
});

Then('the primary navigation should be visible', async function (this: A11yWorld) {
  await expect(this.page.locator('#primary-navigation')).toBeVisible();
});

When('I focus the menu toggle and press {string}', async function (this: A11yWorld, key: string) {
  await this.header.menuToggle.focus();
  await this.page.keyboard.press(key);
});

Then('the menu toggle should have keyboard focus', async function (this: A11yWorld) {
  await expect(this.header.menuToggle).toBeFocused();
});

Then('no hidden primary navigation link should have received focus', async function (this: A11yWorld) {
  const order = this.bag.focusOrder as Focus[];
  const leaked = order.filter((f) => f.inPrimaryNav && !f.primaryNavVisible);
  expect(leaked.map((l) => l.name), 'hidden menu links that received focus').toEqual([]);
});
