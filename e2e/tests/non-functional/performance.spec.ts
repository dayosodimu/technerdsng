import { test, expect, onlyOnChromiumDesktop } from '../../fixtures/test';
import { ALL_AUDITED_PATHS } from '../../utils/site-map';

const budget = {
  ttfb: Number(process.env.PERF_TTFB_MS ?? 800),
  fcp: Number(process.env.PERF_FCP_MS ?? 1800),
  lcp: Number(process.env.PERF_LCP_MS ?? 2500),
  cls: Number(process.env.PERF_CLS ?? 0.1),
  load: Number(process.env.PERF_LOAD_MS ?? 5000),
  jsBytes: Number(process.env.PERF_JS_BYTES ?? 700_000),
  totalBytes: Number(process.env.PERF_TOTAL_BYTES ?? 3_000_000),
};

interface Metrics {
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  load: number;
  jsBytes: number;
  totalBytes: number;
  requests: number;
}

/** Collects Navigation Timing + Core Web Vitals (LCP, CLS) from the browser. Chromium only. */
async function measure(page: import('@playwright/test').Page, path: string): Promise<Metrics> {
  await page.addInitScript(() => {
    (window as any).__cwv = { lcp: 0, cls: 0 };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) (window as any).__cwv.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cwv.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // let LCP/CLS settle
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const size = (r: PerformanceResourceTiming) => r.transferSize || r.encodedBodySize || 0;
    return {
      ttfb: nav.responseStart - nav.requestStart,
      fcp,
      lcp: (window as any).__cwv.lcp,
      cls: (window as any).__cwv.cls,
      load: nav.loadEventEnd - nav.startTime,
      jsBytes: res.filter((r) => r.initiatorType === 'script' || /\.m?js(\?|$)/.test(r.name)).reduce((a, r) => a + size(r), 0),
      totalBytes: res.reduce((a, r) => a + size(r), nav.transferSize || 0),
      requests: res.length + 1,
    };
  });
}

test.describe('Performance budgets @perf', () => {
  test.beforeEach(() => onlyOnChromiumDesktop(test.info().project.name));

  for (const path of ALL_AUDITED_PATHS) {
    test(`Core Web Vitals within budget: ${path}`, async ({ page }, testInfo) => {
      const m = await measure(page, path);
      await testInfo.attach('metrics.json', { body: JSON.stringify({ path, ...m, budget }, null, 2), contentType: 'application/json' });
      console.log(`[perf] ${path}`, JSON.stringify(m));

      expect.soft(m.ttfb, 'TTFB (ms)').toBeLessThanOrEqual(budget.ttfb);
      expect.soft(m.fcp, 'FCP (ms)').toBeLessThanOrEqual(budget.fcp);
      expect.soft(m.lcp, 'LCP (ms)').toBeLessThanOrEqual(budget.lcp);
      expect.soft(m.cls, 'CLS').toBeLessThanOrEqual(budget.cls);
      expect.soft(m.load, 'Load event (ms)').toBeLessThanOrEqual(budget.load);
      expect.soft(m.jsBytes, 'JS transferred (bytes)').toBeLessThanOrEqual(budget.jsBytes);
      expect.soft(m.totalBytes, 'Total transferred (bytes)').toBeLessThanOrEqual(budget.totalBytes);
    });
  }

  test('home page stays usable on a throttled "Fast 3G"-like connection', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    const tti = Date.now() - start;
    console.log(`[perf] H1 visible on throttled network after ${tti}ms`);
    expect(tti, 'hero visible on throttled mobile network (ms)').toBeLessThanOrEqual(10_000);
  });

  test('static assets are compressed and cacheable', async ({ page }) => {
    const issues: string[] = [];
    page.on('response', async (r) => {
      const url = new URL(r.url());
      if (!url.hostname.endsWith('technerdsng.com') || !/\.(js|css)$/.test(url.pathname) || r.status() !== 200) return;
      const h = r.headers();
      if (!/br|gzip|zstd/.test(h['content-encoding'] ?? '')) issues.push(`${url.pathname}: not compressed`);
      if (!/max-age=\d{4,}|immutable/.test(h['cache-control'] ?? '')) issues.push(`${url.pathname}: weak cache-control "${h['cache-control'] ?? ''}"`);
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(issues).toEqual([]);
  });

  test('images are appropriately sized and lazily loaded below the fold', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const report = await page.locator('img').evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).map((i) => ({
        src: i.currentSrc.split('?')[0],
        natural: i.naturalWidth,
        rendered: i.getBoundingClientRect().width,
        belowFold: i.getBoundingClientRect().top > window.innerHeight,
        loading: i.loading,
      })),
    );
    const oversized = report.filter((i) => i.rendered > 0 && i.natural > i.rendered * 2.5 && i.natural > 600);
    const eager = report.filter((i) => i.belowFold && i.loading !== 'lazy');
    expect.soft(oversized.map((i) => i.src), 'images > 2.5x their rendered width').toEqual([]);
    expect.soft(eager.map((i) => i.src), 'below-the-fold images without loading="lazy"').toEqual([]);
  });
});
