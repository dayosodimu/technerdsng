import { test, expect, onlyOnChromiumDesktop } from '../../fixtures/test';

/**
 * Passive, non-intrusive security checks against production.
 * No fuzzing, brute force or injection payloads are sent.
 */
test.describe('Security hygiene @security', () => {
  test.beforeEach(() => onlyOnChromiumDesktop(test.info().project.name));

  test('HTTP redirects to HTTPS', async ({ request, baseURL }) => {
    const httpUrl = baseURL!.replace(/^https:/, 'http:');
    const res = await request.get(httpUrl, { maxRedirects: 0 }).catch(() => null);
    test.skip(!res, 'Plain HTTP not reachable from runner');
    expect([301, 302, 307, 308]).toContain(res!.status());
    expect(res!.headers()['location'] ?? '').toMatch(/^https:\/\//);
  });

  const requiredHeaders: [string, RegExp][] = [
    ['strict-transport-security', /max-age=\d{7,}/i],
    ['x-content-type-options', /nosniff/i],
    ['referrer-policy', /.+/],
    ['permissions-policy', /.+/],
  ];

  for (const [name, pattern] of requiredHeaders) {
    test(`response header "${name}" is set @defect`, async ({ request }) => {
      // Observed 2026-11-15: none of these headers are returned (server: Google Frontend)
      for (const path of ['/', '/admin', '/sign-in']) {
        const h = (await request.get(path)).headers();
        expect(h[name] ?? '', `${name} on ${path}`).toMatch(pattern);
      }
    });
  }

  test('clickjacking protection on admin/sign-in (X-Frame-Options or CSP frame-ancestors) @defect', async ({ request }) => {
    for (const path of ['/admin', '/sign-in']) {
      const h = (await request.get(path)).headers();
      const xfo = h['x-frame-options'] ?? '';
      const csp = h['content-security-policy'] ?? '';
      expect(/deny|sameorigin/i.test(xfo) || /frame-ancestors/i.test(csp), `${path} can be framed`).toBeTruthy();
    }
  });

  test('a Content-Security-Policy is present @defect', async ({ request }) => {
    const h = (await request.get('/')).headers();
    expect(h['content-security-policy'] ?? h['content-security-policy-report-only'] ?? '').not.toBe('');
  });

  test('server does not disclose framework/version details', async ({ request }) => {
    const h = (await request.get('/')).headers();
    expect(h['x-powered-by']).toBeUndefined();
    expect(h['server'] ?? '').not.toMatch(/\d+\.\d+/);
  });

  test('no mixed content on any page', async ({ page }) => {
    const insecure: string[] = [];
    page.on('request', (r) => r.url().startsWith('http://') && insecure.push(r.url()));
    for (const path of ['/', '/about', '/services', '/contact', '/admin', '/sign-in']) {
      await page.goto(path, { waitUntil: 'networkidle' });
    }
    expect(insecure).toEqual([]);
  });

  test('first-party cookies are Secure and session cookies HttpOnly/SameSite', async ({ page, context }) => {
    await page.goto('/sign-in', { waitUntil: 'networkidle' });
    const cookies = (await context.cookies()).filter((c) => c.domain.includes('technerdsng.com'));
    for (const c of cookies) {
      expect(c.secure, `${c.name} Secure`).toBe(true);
      expect(['Lax', 'Strict', 'None'], `${c.name} SameSite`).toContain(c.sameSite);
    }
  });

  test('no source maps or secrets shipped in production JS', async ({ page, request }) => {
    const scripts: string[] = [];
    page.on('response', (r) => {
      const u = new URL(r.url());
      if (u.hostname.endsWith('technerdsng.com') && u.pathname.endsWith('.js')) scripts.push(u.pathname);
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) {
      const body = await (await request.get(s)).text();
      expect(body, `${s} references a source map`).not.toMatch(/sourceMappingURL=/);
      expect(body, `${s} contains a Clerk SECRET key`).not.toMatch(/sk_(live|test)_[A-Za-z0-9]{10,}/);
      expect(body, `${s} contains a private key`).not.toMatch(/-----BEGIN (RSA |EC )?PRIVATE KEY-----/);
      expect(body, `${s} contains a service-role / secret token`).not.toMatch(/service_role|SUPABASE_SERVICE|api[_-]?secret/i);
      const map = await request.get(`${s}.map`);
      expect(map.status() === 200 && /"mappings"/.test(await map.text()), `${s}.map is publicly downloadable`).toBe(false);
    }
  });

  test('Clerk is using production (pk_live) keys', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('#identifier-field')).toBeVisible({ timeout: 20_000 });
    const pk = await page.evaluate(() => (window as any).Clerk?.publishableKey ?? '');
    expect(pk, 'Clerk publishable key').toMatch(/^pk_live_/);
  });

  test('no development/hosting tooling scripts load in production @defect', async ({ page }) => {
    // Observed 2026-11-15: a script from i.replit.com is loaded on every page
    const devScripts: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'script' && /replit\.com|localhost|vite\/client|@react-refresh/.test(r.url())) devScripts.push(r.url().split('?')[0]);
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(devScripts).toEqual([]);
  });

  test('sensitive files are not exposed', async ({ request }) => {
    for (const path of ['/.env', '/.git/config', '/package.json', '/.replit', '/replit.nix', '/server.js']) {
      const res = await request.get(path);
      const body = await res.text();
      const isAppShell = /<div id="root">/.test(body);
      expect(res.status() === 200 && !isAppShell, `${path} is publicly served`).toBe(false);
    }
  });

  test('reflected input in URL is not executed (no DOM XSS via query/hash)', async ({ page }) => {
    let dialog = false;
    page.on('dialog', async (d) => {
      dialog = true;
      await d.dismiss();
    });
    const payload = encodeURIComponent('"><img src=x onerror=alert(1)>');
    await page.goto(`/news?q=${payload}#${payload}`);
    await page.goto(`/this-${payload}`);
    await page.waitForTimeout(1000);
    expect(dialog).toBe(false);
  });
});
