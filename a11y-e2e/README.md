# technerdsng.com — End-to-end Accessibility Test Suite

Playwright + TypeScript + Cucumber (BDD) + axe-core suite that checks
[technerdsng.com](https://www.technerdsng.com) against **WCAG 2.2 AA**. It covers positive cases
(the site behaves accessibly) and negative cases (it must not trap, hide or block users, and the
checks must catch defects that are injected on purpose).

## Coverage — 57 test cases (36 positive / 21 negative)

| Feature file | Area | WCAG |
|---|---|---|
| `01_wcag_automated_scan` | axe-core scan of all 7 pages, zoom-blocking check, landmark best practices | 2.2 A/AA ruleset, 1.4.4 |
| `02_keyboard_navigation` | Skip link, focus order, Shift+Tab, visible focus, Enter activation, no keyboard trap, focus hidden by cookie banner | 2.1.1, 2.1.2, 2.4.1, 2.4.3, 2.4.7, 2.4.11 |
| `03_mobile_navigation` | Menu toggle name/state/`aria-controls`, keyboard open, Escape closes and returns focus, hidden links can't be focused | 2.1.1, 2.4.3, 4.1.2 |
| `04_cookie_consent` | Labelled region, keyboard reject + persistence, Customize moves focus, labelled toggles, Privacy options reopens banner, banner scan | 1.3.1, 2.1.1, 2.4.3, 4.1.2 |
| `05_structure_semantics` | `lang`, unique titles, one h1, heading order, landmarks, alt text, link/button names, 404 page | 1.1.1, 1.3.1, 2.4.2, 2.4.4, 2.4.5, 2.4.6, 3.1.1 |
| `06_responsive_motion` | Reflow at 320px (with clipped-content detection), 200% text, text spacing, reduced motion | 1.4.4, 1.4.10, 1.4.12, 2.3.3 |
| `07_negative_controls` | Injects 7 known defects plus focus and reflow defects to prove each check fails when it should | control |

Tags: `@positive` `@negative` `@smoke` `@known-defect` `@best-practice` `@wcag-x.y.z` `@mobile` `@reduced-motion`.

## Setup & run

```bash
npm install
npx playwright install --with-deps chromium

npm test                                  # full suite against https://www.technerdsng.com
npm run test:smoke                        # @smoke only
npm run test:positive / test:negative     # positive or negative cases only
npm run test:ci                           # everything except logged @known-defect cases (CI gate)
BASE_URL=https://staging.example.com npm test
BROWSER=firefox npm test                  # chromium | firefox | webkit
HEADLESS=false npm test                   # watch it run
```

Reports are written to `reports/`. That folder holds the Cucumber HTML and JSON reports and
screenshots of failures, with the axe violations attached to each failed scenario.

## Test-case exports (JSON, XML, Excel)

```bash
npm run export
```

This reads the feature files and merges in the latest `reports/cucumber-report.json`. It writes:

- `reports/test-cases.json`: the full catalogue (ID, type, WCAG, priority, preconditions, steps, expected result, test data, status, failure reason)
- `reports/test-cases.xml`: the same catalogue as XML, for import into a test-management tool
- `reports/junit-results.xml`: JUnit results for CI dashboards
- `reports/test-cases.xlsx`: a workbook with Summary (live formulas), Test Cases and Defects sheets. Building it needs `pip install openpyxl`.

## Defects found (latest run)

| ID | WCAG | Severity | Finding |
|---|---|---|---|
| A11Y-001 | 1.4.4 | Critical | `<meta name="viewport" … maximum-scale=1>` blocks pinch-zoom on every page |
| A11Y-002/003 | best practice | Minor | `<aside class="contact-side">` is nested inside another landmark (Home, Contact) |
| A11Y-004 | 2.4.11 | Serious | With the cookie banner open, the focused "Explore what we do" link sits fully behind the banner |
| A11Y-005 | 2.4.5 | Moderate | The 404 page has no header, nav, footer or link home, and shows a developer message ("Did you forget to add the page to the router?") |
| A11Y-006 | 1.4.10 | Serious | At 320px, text in "Who we are" and the contact section overflows by about 34px and is clipped |

Each of these scenarios is tagged `@known-defect`. Remove the tag once the fix ships, so the
scenario becomes a regression guard.

## Project layout

```
features/            Gherkin scenarios (positive + negative)
src/support/         config, world, hooks (browser lifecycle, screenshots), axe-core runner
src/pages/           page objects: BasePage, HomePage, SiteHeader, CookieBanner
src/steps/           step definitions
scripts/             test-case exporters (JSON/XML/JUnit + Excel)
reports/             generated output
```
