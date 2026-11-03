import { When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { A11yWorld } from '../support/world';

Then('the cookie banner should be a region labelled {string}', async function (this: A11yWorld, label: string) {
  await expect(this.page.getByRole('region', { name: label })).toBeVisible();
  await expect(this.cookies.heading).toBeVisible();
});

Then('the cookie banner should offer the buttons:', async function (this: A11yWorld, table: DataTable) {
  for (const [name] of table.raw()) {
    await expect(this.cookies.button(name)).toBeVisible();
    await expect(this.cookies.button(name)).toHaveAccessibleName(name);
  }
});

When('I activate the cookie button {string} with the keyboard', async function (this: A11yWorld, name: string) {
  await this.cookies.button(name).focus();
  await this.page.keyboard.press('Enter');
});

Then('the cookie banner should not be visible', async function (this: A11yWorld) {
  await expect(this.cookies.region).toBeHidden();
});

Then('the cookie banner should be visible', async function (this: A11yWorld) {
  await expect(this.cookies.region).toBeVisible();
});

Then('focus should move into the cookie category settings', async function (this: A11yWorld) {
  await expect(this.cookies.settingsPanel).toBeVisible();
  const inside = await this.cookies.settingsPanel.evaluate((el) => el.contains(document.activeElement));
  expect(inside, 'focus is inside the cookie settings panel').toBe(true);
});

Then('every cookie category checkbox should have a programmatic label', async function (this: A11yWorld) {
  const boxes = await this.cookies.toggles.all();
  expect(boxes.length, 'number of optional cookie toggles').toBeGreaterThan(0);
  for (const box of boxes) await expect(box).toHaveAccessibleName(/\S/);
});

When('I move focus to the footer {string} button and press {string}', async function (this: A11yWorld, name: string, key: string) {
  const btn = this.header.footerNav.getByRole('button', { name });
  await btn.focus();
  await this.page.keyboard.press(key);
});
