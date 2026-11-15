import { test, expect, onlyOnChromiumDesktop } from '../../fixtures/test';
import { PUBLIC_ROUTES } from '../../utils/site-map';

test.describe('SEO & discoverability @seo', () => {
  test.beforeEach(() => onlyOnChromiumDesktop(test.info().project.name));

  for (const route of PUBLIC_ROUTES) {
    test(`on-page SEO: ${route.path} @defect`, async ({ site, page, baseURL }) => {
      await site.goto(route.path);
      const title = await page.title();
      expect.soft(title.length, 'title length 10-65 chars').toBeGreaterThanOrEqual(10);
      expect.soft(title.length, 'title length 10-65 chars').toBeLessThanOrEqual(65);

      const desc = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
      expect.soft(desc.length, 'meta description 50-160 chars').toBeGreaterThanOrEqual(50);
      expect.soft(desc.length, 'meta description 50-160 chars').toBeLessThanOrEqual(160);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect.soft(canonical, 'canonical URL').toBe(new URL(route.path, baseURL).href.replace(/\/$/, route.path === '/' ? '/' : ''));

      await expect.soft(page.locator('meta[property="og:title"]'), 'og:title').toHaveCount(1);
      await expect.soft(page.locator('meta[property="og:description"]'), 'og:description').toHaveCount(1);
      await expect.soft(page.locator('meta[property="og:image"]'), 'og:image').toHaveCount(1);
      await expect.soft(page.locator('meta[name="twitter:card"]'), 'twitter:card').toHaveCount(1);
      await expect.soft(site.h1, 'exactly one H1').toHaveCount(1);
    });
  }

  test('page titles and descriptions are unique per route', async ({ site, page }) => {
    const titles = new Map<string, string>();
    const descs = new Map<string, string>();
    for (const r of PUBLIC_ROUTES) {
      await site.goto(r.path);
      titles.set(r.path, await page.title());
      descs.set(r.path, (await page.locator('meta[name="description"]').getAttribute('content')) ?? '');
    }
    expect(new Set(titles.values()).size, JSON.stringify([...titles])).toBe(titles.size);
    expect(new Set(descs.values()).size, JSON.stringify([...descs])).toBe(descs.size);
  });

  test('robots.txt is served and references a sitemap @defect', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/text\/plain/);
    const body = await res.text();
    expect(body).toMatch(/User-agent:/i);
    expect.soft(body, 'robots.txt should list Sitemap:').toMatch(/Sitemap:\s*https?:\/\//i);
    expect.soft(body, 'robots.txt should disallow /admin and /sign-in').toMatch(/Disallow:\s*\/admin/i);
  });

  test('sitemap.xml is valid XML and lists every public route @defect', async ({ request, baseURL }) => {
    // Observed 2026-11-15: /sitemap.xml returns the HTML app shell
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/xml/);
    const xml = await res.text();
    expect(xml).toMatch(/<urlset/);
    for (const r of PUBLIC_ROUTES) expect(xml).toContain(new URL(r.path, baseURL).href.replace(/\/$/, r.path === '/' ? '/' : ''));
    expect(xml).not.toMatch(/\/admin|\/sign-in/);
  });

  test('server-rendered HTML has route-specific titles for crawlers without JS @defect', async ({ request }) => {
    // SPA shell currently returns the same <title> for every route; social/crawler previews suffer.
    const titles = new Set<string>();
    for (const r of PUBLIC_ROUTES) {
      const html = await (await request.get(r.path)).text();
      titles.add(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '');
    }
    expect.soft(titles.size, 'distinct <title> in raw HTML across routes').toBe(PUBLIC_ROUTES.length);
  });

  test('structured data (JSON-LD Organization) is present on home @defect', async ({ site, page }) => {
    await site.goto('/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.flatMap((b) => {
      try {
        const j = JSON.parse(b);
        return [j['@type'], ...(j['@graph'] ?? []).map((g: any) => g['@type'])].flat();
      } catch {
        return [];
      }
    });
    expect.soft(types.join(','), 'Organization / LocalBusiness schema').toMatch(/Organization|LocalBusiness/);
  });
});
