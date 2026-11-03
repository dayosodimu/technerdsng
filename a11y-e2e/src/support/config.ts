export const config = {
  baseUrl: (process.env.BASE_URL || 'https://www.technerdsng.com').replace(/\/$/, ''),
  browser: (process.env.BROWSER || 'chromium') as 'chromium' | 'firefox' | 'webkit',
  /** Optional Chromium channel, e.g. "chrome" or "msedge". */
  channel: process.env.CHANNEL || undefined,
  headless: process.env.HEADLESS !== 'false',
  timeoutMs: Number(process.env.STEP_TIMEOUT || 60_000),
  /** WCAG conformance target used by every automated scan. */
  wcagTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  viewports: {
    desktop: { width: 1280, height: 800 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 390, height: 844 },
    reflow: { width: 320, height: 640 }, // WCAG 1.4.10: 1280px at 400% zoom
  },
};

/** Friendly page names used in feature files → site paths. */
export const routes: Record<string, string> = {
  Home: '/',
  'About Us': '/about',
  Services: '/services',
  News: '/news',
  Process: '/process',
  Contact: '/contact',
  'Privacy Policy': '/privacy-policy',
};
