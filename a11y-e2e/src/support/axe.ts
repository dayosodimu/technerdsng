import fs from 'fs';
import type { Page } from '@playwright/test';

/** Minimal axe-core typings for what the suite uses. */
export interface AxeNode { target: string[]; html: string; failureSummary?: string }
export interface AxeViolation {
  id: string; impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  help: string; helpUrl: string; tags: string[]; nodes: AxeNode[];
}
export interface AxeResults { violations: AxeViolation[]; passes: { id: string }[]; incomplete: AxeViolation[] }

const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

export interface ScanOptions {
  tags?: string[];
  include?: string;
  exclude?: string[];
  rules?: string[];
}

/** Injects axe-core into the page and runs it with the given WCAG tags or rules. */
export async function runAxe(page: Page, opts: ScanOptions = {}): Promise<AxeResults> {
  const hasAxe = await page.evaluate(() => typeof (window as any).axe !== 'undefined');
  if (!hasAxe) await page.addScriptTag({ content: axeSource });

  return page.evaluate(async ({ tags, include, exclude, rules }) => {
    const context: any = include || exclude?.length
      ? { include: include ? [include] : [document], exclude: (exclude || []).map((s) => [s]) }
      : document;
    const runOnly = rules?.length ? { type: 'rule', values: rules } : { type: 'tag', values: tags };
    return (window as any).axe.run(context, { runOnly, resultTypes: ['violations'] });
  }, opts);
}

const rank = { minor: 1, moderate: 2, serious: 3, critical: 4 } as const;

export function atOrAbove(results: AxeResults, minImpact: keyof typeof rank) {
  return results.violations.filter((v) => v.impact && rank[v.impact] >= rank[minImpact]);
}

export function formatViolations(violations: AxeViolation[]): string {
  if (!violations.length) return 'no violations';
  return violations
    .map((v) => `• [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))\n    ${v.nodes
      .slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}\n    ${v.helpUrl}`)
    .join('\n');
}
