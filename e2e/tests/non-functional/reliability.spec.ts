import { test, expect, onlyOnChromiumDesktop } from '../../fixtures/test';
import { ALL_AUDITED_PATHS, PUBLIC_ROUTES } from '../../utils/site-map';

test.describe('Reliability, availability & light load', () => {
  test.beforeEach(() => onlyOnChromiumDesktop(test.info().project.name));

  test('apex domain technerdsng.com resolves and redirects to www @defect', async ({ request }) => {
    // Observed 2026-11-15: DNS_PROBE_FINISHED_NXDOMAIN for technerdsng.com (only www resolves)
    const apex = process.env.APEX_URL ?? 'https://technerdsng.com';
    const res = await request.get(apex, { maxRedirects: 5 }).catch((e: Error) => e);
    expect(res instanceof Error ? res.message : '', 'apex domain reachable').toBe('');
    if (!(res instanceof Error)) {
      expect(res.status()).toBe(200);
      expect(res.url()).toMatch(/^https:\/\/www\.technerdsng\.com\/?/);
    }
  });

  test('no console errors or failed first-party requests on any page', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && problems.push(`console ${m.text().slice(0, 150)}`));
    page.on('response', (r) => {
      if (r.url().includes('technerdsng.com') && r.status() >= 400) problems.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });
    page.on('requestfailed', (r) => r.url().includes('technerdsng.com') && problems.push(`failed ${r.url()}`));
    for (const path of ALL_AUDITED_PATHS) {
      await page.goto(path, { waitUntil: 'networkidle' });
    }
    expect(problems).toEqual([]);
  });

  test('every internal link on the site resolves to a real page', async ({ page }) => {
    const seen = new Set<string>();
    for (const r of PUBLIC_ROUTES) {
      await page.goto(r.path);
      await expect(page.locator('h1').first()).toBeVisible();
      const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!.split('#')[0]));
      hrefs.filter(Boolean).forEach((h) => seen.add(h));
    }
    const broken: string[] = [];
    for (const href of seen) {
      await page.goto(href);
      const notFound = await page.getByRole('heading', { name: /404|page not found/i }).count();
      if (notFound) broken.push(href);
    }
    expect(broken, 'internal links rendering the 404 page').toEqual([]);
  });

  test(`light concurrent load: ${process.env.LOAD_CONCURRENCY ?? 10} parallel requests per route stay fast`, async ({ request }) => {
    const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 10);
    const p95Budget = Number(process.env.LOAD_P95_MS ?? 2000);
    const durations: number[] = [];
    const failures: string[] = [];
    for (const path of ['/', '/services', '/contact', '/admin']) {
      await Promise.all(
        Array.from({ length: concurrency }, async () => {
          const t0 = Date.now();
          const res = await request.get(path);
          durations.push(Date.now() - t0);
          if (res.status() !== 200) failures.push(`${path} -> ${res.status()}`);
        }),
      );
    }
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95) - 1];
    console.log(`[load] n=${durations.length} p50=${durations[Math.floor(durations.length / 2)]}ms p95=${p95}ms max=${durations.at(-1)}ms`);
    expect(failures).toEqual([]);
    expect(p95, 'p95 response time (ms)').toBeLessThanOrEqual(p95Budget);
  });

  test('site degrades gracefully when Google Analytics is blocked', async ({ page }) => {
    await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('public site still renders if Clerk (auth) is unreachable', async ({ page }) => {
    await page.route(/clerk\.(accounts\.dev|com)|clerk\.technerdsng\.com/, (r) => r.abort());
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
