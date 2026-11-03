// Cucumber configuration. Override the target with BASE_URL, e.g.
//   BASE_URL=https://staging.technerdsng.com npm test
const common = {
  paths: ['features/**/*.feature'],
  requireModule: ['ts-node/register'],
  require: ['src/support/**/*.ts', 'src/steps/**/*.ts'],
  format: [
    'progress-bar',
    'summary',
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-report.json',
  ],
  formatOptions: { snippetInterface: 'async-await' },
  parallel: Number(process.env.PARALLEL || 1),
  retry: Number(process.env.RETRY || 0),
};

module.exports = {
  default: { ...common },
  // Only defects that are not yet logged as known — useful as a CI gate.
  ci: { ...common, tags: 'not @known-defect', retry: 1 },
};
