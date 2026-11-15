# TechnerdsNG — End-to-End Test Suite (Playwright + TypeScript)

Functional and non-functional automated tests for the public site **www.technerdsng.com** and the **/admin** Technerds Content Studio (Clerk-authenticated).

> The apex domain `technerdsng.com` does **not** resolve (DNS NXDOMAIN, checked 2026-11-15). The suite targets `https://www.technerdsng.com` and has a dedicated test that flags the apex issue.

## What's covered

| Area | Spec | Highlights |
|---|---|---|
| **Functional – site** | `tests/functional/site/pages.spec.ts` | Every route renders (status, title, single H1, layout, no JS errors); hero CTA; services/process cards; news empty state |
| | `navigation.spec.ts` | Primary nav, logo, back/forward, deep-link reload, skip link, mobile menu (toggle, close, Escape), footer links, social links (`target=_blank` + `rel=noopener`) |
| | `contact.spec.ts` | All mailboxes as valid `mailto:` links on the company domain |
| | `faq-assistant.spec.ts` | "Ask a question" widget: aria state, open/close, every answer, Escape, present on all pages |
| | `cookie-consent.spec.ts` | First-visit banner, **no Google Analytics before consent**, accept/reject/customise storage, opt-in defaults, privacy options re-open |
| | `not-found.spec.ts` | Branded 404, no developer copy, noindex, real HTTP 404 |
| **Functional – admin** | `tests/functional/admin/admin-gate.spec.ts` | Anonymous `/admin` shows gate, no editor controls, sub-paths don't bypass, admin APIs reject, noindex |
| | `sign-in.spec.ts` | Clerk form, empty/malformed/unknown email, password mask, back link, sign-up link, Google SSO redirect, layout overlap |
| | `admin-authenticated.spec.ts` | Signed-in editor journey (skipped unless `ADMIN_EMAIL`/`ADMIN_PASSWORD` set); write round-trip only with `ADMIN_ALLOW_WRITES=true` |
| **Accessibility** | `tests/non-functional/accessibility.spec.ts` | axe-core WCAG 2.2 AA on 9 pages, zoom not disabled, `lang`, alt text, visible focus, heading order |
| **Performance** | `performance.spec.ts` | TTFB, FCP, LCP, CLS, load, JS/total bytes vs budgets; throttled 3G + 4x CPU; compression & caching; image sizing/lazy-load |
| **Security** | `security.spec.ts` | HTTPS redirect, HSTS / nosniff / Referrer / Permissions / CSP / clickjacking, no mixed content, cookie flags, no source maps or secrets in JS, Clerk `pk_live`, no dev tooling scripts, sensitive files, DOM-XSS smoke |
| **SEO** | `seo.spec.ts` | Title/description length & uniqueness, canonical, Open Graph/Twitter, robots.txt, sitemap.xml, raw-HTML titles, JSON-LD |
| **Responsive** | `responsive.spec.ts` | No horizontal overflow at 320 → 1920 px on every page, 24px tap targets, 200% reflow |
| **Reliability / load** | `reliability.spec.ts` | Apex DNS, console/network errors on every page, internal link crawl, gentle concurrent load (p95), graceful degradation when GA or Clerk are blocked |

Cross-browser: Chromium, Firefox, WebKit (desktop 1440×900) + Pixel 7 and iPhone 14. Server-side checks (perf, security, SEO, load) run once on `chromium-desktop`.

## Tags

- `@smoke` – fast critical path
- `@a11y`, `@perf`, `@security`, `@seo` – non-functional groups
- `@defect` – asserts the **correct** behaviour for a defect observed on 2026-11-15. These fail until the issue is fixed; run `npm run test:no-defects` for a green regression baseline.

## Run locally

```bash
cd e2e
npm ci
npx playwright install --with-deps
cp .env.example .env          # optional: budgets, admin test account

npm test                      # everything, all browsers
npm run test:smoke            # critical path, Chromium
npm run test:admin            # admin + sign-in
npm run test:a11y | test:perf | test:security | test:seo
npm run test:no-defects       # exclude known-defect assertions
npm run report                # open the HTML report
```

## CI

`.github/workflows/playwright.yml` runs on pushes/PRs touching `e2e/`, daily at ~06:17 Lagos time, and on demand (with optional `base_url` and `grep` inputs). Each browser runs as its own job; HTML reports, traces and videos are uploaded as artifacts.

For authenticated admin tests, add repository secrets `TECHNERDS_ADMIN_EMAIL` and `TECHNERDS_ADMIN_PASSWORD` for a dedicated **test** editor account (email + password, not Google SSO).

## Structure

```
e2e/
├── playwright.config.ts      # projects, reporters, baseURL
├── fixtures/test.ts          # custom fixtures: consent seeding, error capture, page objects
├── pages/                    # Page Object Model (SitePage, CookieConsent, FaqAssistant, AdminPage, SignInPage)
├── utils/site-map.ts         # routes, expected titles/H1s, emails, social links
└── tests/
    ├── functional/site/      # public site
    ├── functional/admin/     # /admin + /sign-in
    └── non-functional/       # a11y, perf, security, SEO, responsive, reliability
```

## Findings from the first CI run (2026-11-15)

Tests tagged `@defect` assert the **correct** behaviour and stay red until fixed.

**Availability / routing**
1. `technerdsng.com` (apex) does not resolve (`ENOTFOUND`) — only `www` works.
2. Unknown URLs return HTTP 200 (soft-404); the 404 page is `index, follow` and shows developer copy: "Did you forget to add the page to the router?"

**Security**
3. No `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors` (admin & sign-in can be framed), `X-Content-Type-Options`, `Referrer-Policy` or `Permissions-Policy`. (HSTS *is* set.)
4. Hosting cookie `GAESA` is set without `Secure`.
5. `https://i.replit.com/script.js` loads on every production page.
6. Review item: `/sign-in` offers public **Sign up** for an editor-only studio — confirm new accounts get no editor rights. `GET /api/site-content` is public (expected for site copy); verify write methods require an editor session (not probed against production).

**SEO**
7. `/admin` and `/sign-in` are `index, follow` (should be `noindex`).
8. `/sitemap.xml` serves the HTML app shell; `robots.txt` has no `Sitemap:` and doesn't disallow `/admin`.
9. No `og:image`, no JSON-LD Organization schema; raw HTML has the same `<title>` on every route (SPA).

**Performance**
10. ~920 KB of JavaScript on every page (budget 700 KB); static JS/CSS served **without compression** and **without `Cache-Control`**.
11. Brand PNGs (`technerd-black/white/pattern.png`) are over 2.5× their rendered size; CLS 0.104 on `/privacy-policy` (budget 0.1).

**Accessibility / UX**
12. Viewport meta `maximum-scale=1` blocks pinch-zoom on iOS (WCAG 1.4.4).
13. `/sign-in`: a malformed email gives no feedback at all; serious colour-contrast violation; overflows horizontally at 768 px and 1024 px (Clerk card), and the hero title overlaps its subtitle on desktop.
14. Cookie consent panel isn't exposed as a dialog (no role/label), and "Close settings" re-shows the first-visit banner even after a choice was saved.
