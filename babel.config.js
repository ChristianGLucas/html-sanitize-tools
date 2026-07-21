// Used ONLY by jest (via babel-jest) to transpile plain .js files pulled in
// from node_modules that ship as pure ESM with no CJS build (jsdom and its
// dependency tree). The package's own TypeScript source is compiled by
// ts-jest / tsc, never by this config — see jest.config.js.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
