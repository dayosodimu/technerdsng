import { Before, After, BeforeAll, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, firefox, webkit, Browser } from '@playwright/test';
import fs from 'fs';
import { config } from './config';
import { A11yWorld } from './world';

setDefaultTimeout(config.timeoutMs);

let browser: Browser;

BeforeAll(async function () {
  const engine = { chromium, firefox, webkit }[config.browser];
  browser = await engine.launch({ headless: config.headless, channel: config.channel });
  fs.mkdirSync('reports/screenshots', { recursive: true });
});

Before(async function (this: A11yWorld, { pickle }) {
  // Scenarios may request a viewport / motion preference through tags.
  const tags = pickle.tags.map((t) => t.name);
  const viewport = tags.includes('@mobile') ? config.viewports.mobile : config.viewports.desktop;
  this.context = await browser.newContext({
    viewport,
    reducedMotion: tags.includes('@reduced-motion') ? 'reduce' : 'no-preference',
    locale: 'en-NG',
  });
  this.page = await this.context.newPage();
});

After(async function (this: A11yWorld, { result, pickle }) {
  if (result?.status === Status.FAILED && this.page) {
    const name = pickle.name.replace(/[^a-z0-9]+/gi, '_').slice(0, 80);
    const shot = await this.page.screenshot({ path: `reports/screenshots/${name}.png`, fullPage: false });
    this.attach(shot, 'image/png');
    if (this.axeResults?.violations.length) {
      this.attach(JSON.stringify(this.axeResults.violations, null, 2), 'application/json');
    }
  }
  await this.context?.close();
});

AfterAll(async function () {
  await browser?.close();
});
