/**
 * Builds a test-case catalogue from the Gherkin feature files and (if present) merges in
 * the latest results from reports/cucumber-report.json.
 *
 * Outputs:
 *   reports/test-cases.json   – full catalogue with steps and results
 *   reports/test-cases.xml    – same catalogue as XML (test-management import friendly)
 *   reports/junit-results.xml – JUnit XML of the last run (for CI dashboards)
 * The Excel workbook is produced from test-cases.json by scripts/export_excel.py.
 *
 * Run: npx ts-node scripts/export-test-cases.ts
 */
import fs from 'fs';
import path from 'path';

interface Step { keyword: string; text: string; table?: string[][] }
interface TestCase {
  id: string; feature: string; featureFile: string; scenario: string; line: number;
  type: 'Positive' | 'Negative'; category: string; wcag: string[]; priority: 'High' | 'Medium' | 'Low';
  tags: string[]; preconditions: string[]; steps: string[]; expectedResults: string[]; testData: string;
  knownDefect: boolean; status: 'Passed' | 'Failed' | 'Skipped' | 'Not run'; durationMs?: number; failureReason?: string;
}

const root = path.resolve(__dirname, '..');
const featuresDir = path.join(root, 'features');
const reportsDir = path.join(root, 'reports');

function stepLines(steps: Step[]) {
  return steps.map((s) => `${s.keyword} ${s.text}` + (s.table ? ` [${s.table.map((r) => r.join(', ')).join(' | ')}]` : ''));
}

function parse(file: string): TestCase[] {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let feature = '', featureTags: string[] = [], pendingTags: string[] = [], comment = '';
  let background: Step[] = [];
  const out: TestCase[] = [];
  type Sc = { name: string; line: number; tags: string[]; steps: Step[]; outline: boolean; comment: string; examples: { tags: string[]; rows: { cells: string[]; line: number }[] }[] };
  const scenarios: Sc[] = [];
  let cur: { steps: Step[] } | null = null, sc: Sc | null = null, ex: Sc['examples'][number] | null = null, lastStep: Step | null = null;

  lines.forEach((raw, i) => {
    const line = raw.trim(); let m: RegExpMatchArray | null;
    if (!line) return;
    if (line.startsWith('#')) { comment = line.slice(1).trim(); return; }
    if (line.startsWith('@')) { pendingTags.push(...line.split(/\s+/)); return; }
    if ((m = line.match(/^Feature:\s*(.*)/))) { feature = m[1]; featureTags = pendingTags; pendingTags = []; return; }
    if (line.startsWith('Background:')) { cur = { steps: background }; sc = null; return; }
    if ((m = line.match(/^Scenario( Outline)?:\s*(.*)/))) {
      sc = { name: m[2], line: i + 1, tags: pendingTags, steps: [], outline: !!m[1], comment, examples: [] };
      pendingTags = []; comment = ''; ex = null; cur = sc; scenarios.push(sc); return;
    }
    if (line.startsWith('Examples:')) { ex = { tags: pendingTags, rows: [] }; pendingTags = []; sc!.examples.push(ex); return; }
    if (line.startsWith('|')) {
      const cells = line.slice(1, -1).split('|').map((c) => c.trim());
      if (ex) ex.rows.push({ cells, line: i + 1 }); else if (lastStep) (lastStep.table ||= []).push(cells);
      return;
    }
    if ((m = line.match(/^(Given|When|Then|And|But)\s+(.*)/)) && cur) { lastStep = { keyword: m[1], text: m[2] }; cur.steps.push(lastStep); }
  });

  for (const s of scenarios) {
    const idm = s.comment.match(/(TC-[A-Z]+)-(\d+)/);
    const prefix = idm ? idm[1] : 'TC-' + path.basename(file).slice(0, 2);
    let n = idm ? parseInt(idm[2], 10) : 1;
    const wcagFromComment = [...s.comment.matchAll(/WCAG ([\d.]+(?: [A-Z][\w ()]+?)?)(?=\s*[/,]|$)/g)].map((x) => x[1].trim());
    const variants = s.outline
      ? s.examples.flatMap((e) => { const [h, ...rows] = e.rows; return rows.map((r) => ({ header: h.cells, row: r, tags: e.tags })); })
      : [{ header: [] as string[], row: { cells: [] as string[], line: s.line }, tags: [] as string[] }];

    for (const v of variants) {
      const sub = (t: string) => t.replace(/<([^>]+)>/g, (_, k) => v.row.cells[v.header.indexOf(k)] ?? `<${k}>`);
      const tags = [...featureTags, ...s.tags, ...v.tags];
      const steps = s.steps.map((st) => ({ ...st, text: sub(st.text) }));
      // Expected results = Then steps plus the And/But steps that follow them.
      let inThen = false;
      const expected = steps.filter((st) => (st.keyword === 'Then' ? (inThen = true) : st.keyword === 'When' || st.keyword === 'Given' ? (inThen = false) : inThen));
      const wcagTags = [...new Set([...tags.filter((t) => t.startsWith('@wcag-')).map((t) => t.replace('@wcag-', '')), ...wcagFromComment.map((w) => w.split(' ')[0])])];
      out.push({
        id: `${prefix}-${String(n++).padStart(2, '0')}`,
        feature, featureFile: rel, scenario: sub(s.name), line: v.row.line,
        type: tags.includes('@negative') ? 'Negative' : 'Positive',
        category: (featureTags.find((t) => !['@a11y', '@negative'].includes(t)) || '@general').slice(1),
        wcag: wcagTags.length ? wcagTags : tags.includes('@best-practice') ? ['best-practice'] : tags.includes('@scan') || tags.includes('@control') ? ['WCAG 2.2 A/AA (axe ruleset)'] : [],
        priority: tags.includes('@smoke') || tags.includes('@known-defect') ? 'High' : tags.includes('@best-practice') ? 'Low' : 'Medium',
        tags, preconditions: stepLines(background), steps: stepLines(steps), expectedResults: stepLines(expected),
        testData: v.header.map((h, i) => `${h}=${v.row.cells[i]}`).join('; '),
        knownDefect: tags.includes('@known-defect'), status: 'Not run',
      });
    }
  }
  return out;
}

function mergeResults(cases: TestCase[]) {
  const reportFile = path.join(reportsDir, 'cucumber-report.json');
  if (!fs.existsSync(reportFile)) return;
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  for (const f of report) for (const el of f.elements || []) {
    const tc = cases.find((c) => c.featureFile === f.uri && c.line === el.line);
    if (!tc) continue;
    const results = [...(el.before || []), ...el.steps, ...(el.after || [])].map((s: any) => s.result);
    const failed = results.find((r: any) => r.status === 'failed');
    tc.status = failed ? 'Failed' : results.every((r: any) => r.status === 'passed') ? 'Passed' : 'Skipped';
    tc.durationMs = Math.round(el.steps.reduce((a: number, s: any) => a + (s.result.duration || 0), 0) / 1e6);
    if (failed) tc.failureReason = String(failed.error_message).split('\n').filter((l) => l.trim() && !/^\s+at /.test(l)).slice(0, 6).join(' ').replace(/\s+/g, ' ').slice(0, 600);
  }
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function toXml(cases: TestCase[], meta: Record<string, string | number>) {
  const list = (tag: string, item: string, xs: string[]) => !xs.length ? `      <${tag}/>` : `      <${tag}>\n${xs.map((x) => `        <${item}>${esc(x)}</${item}>`).join('\n')}\n      </${tag}>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<testSuite name="${esc(meta.suite)}" target="${esc(meta.target)}" generated="${esc(meta.generated)}" total="${cases.length}">
${cases.map((c) => `  <testCase id="${c.id}" type="${c.type}" priority="${c.priority}" status="${c.status}" knownDefect="${c.knownDefect}">
      <feature file="${esc(c.featureFile)}" line="${c.line}">${esc(c.feature)}</feature>
      <title>${esc(c.scenario)}</title>
      <category>${esc(c.category)}</category>
${list('wcag', 'criterion', c.wcag)}
${list('tags', 'tag', c.tags)}
${list('preconditions', 'step', c.preconditions)}
${list('steps', 'step', c.steps)}
${list('expectedResults', 'result', c.expectedResults)}
      <testData>${esc(c.testData)}</testData>${c.durationMs !== undefined ? `\n      <durationMs>${c.durationMs}</durationMs>` : ''}${c.failureReason ? `\n      <failureReason>${esc(c.failureReason)}</failureReason>` : ''}
  </testCase>`).join('\n')}
</testSuite>
`;
}

function toJUnit(cases: TestCase[]) {
  const byFeature = new Map<string, TestCase[]>();
  cases.forEach((c) => byFeature.set(c.feature, [...(byFeature.get(c.feature) || []), c]));
  const suites = [...byFeature].map(([name, cs]) => {
    const failures = cs.filter((c) => c.status === 'Failed').length;
    const skipped = cs.filter((c) => c.status !== 'Passed' && c.status !== 'Failed').length;
    const time = cs.reduce((a, c) => a + (c.durationMs || 0), 0) / 1000;
    return `  <testsuite name="${esc(name)}" tests="${cs.length}" failures="${failures}" skipped="${skipped}" time="${time.toFixed(3)}">
${cs.map((c) => `    <testcase classname="${esc(c.featureFile)}" name="${esc(`${c.id} ${c.scenario}`)}" time="${((c.durationMs || 0) / 1000).toFixed(3)}">${
      c.status === 'Failed' ? `\n      <failure message="${esc((c.knownDefect ? '[known defect] ' : '') + (c.failureReason || '').slice(0, 200))}">${esc(c.failureReason)}</failure>\n    ` :
      c.status === 'Passed' ? '' : '\n      <skipped/>\n    '}</testcase>`).join('\n')}
  </testsuite>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="technerdsng.com accessibility">\n${suites.join('\n')}\n</testsuites>\n`;
}

const files = fs.readdirSync(featuresDir).filter((f) => f.endsWith('.feature')).sort().map((f) => path.join(featuresDir, f));
const cases = files.flatMap(parse);
mergeResults(cases);

const summary = {
  total: cases.length,
  positive: cases.filter((c) => c.type === 'Positive').length,
  negative: cases.filter((c) => c.type === 'Negative').length,
  passed: cases.filter((c) => c.status === 'Passed').length,
  failed: cases.filter((c) => c.status === 'Failed').length,
  notRun: cases.filter((c) => c.status === 'Not run').length,
  knownDefects: cases.filter((c) => c.knownDefect && c.status === 'Failed').length,
};
const meta = {
  suite: 'technerdsng.com — End-to-end accessibility (WCAG 2.2 AA)',
  target: process.env.BASE_URL || 'https://www.technerdsng.com',
  generated: new Date().toISOString(),
  runEnvironment: process.env.RUN_ENV || 'local',
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'test-cases.json'), JSON.stringify({ ...meta, summary, testCases: cases }, null, 2));
fs.writeFileSync(path.join(reportsDir, 'test-cases.xml'), toXml(cases, meta));
fs.writeFileSync(path.join(reportsDir, 'junit-results.xml'), toJUnit(cases));
console.log(`Exported ${cases.length} test cases →`, summary);
