/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Scope to the package's own nodes/ — anchored at <rootDir> so the assembled
  // build context under .axiom/image/nodes/ (a copy) is never double-collected.
  testMatch: ['<rootDir>/nodes/**/*_test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.axiom/', '/dist/'],
  // jsdom's dependency tree (html-encoding-sniffer -> @exodus/bytes, its own
  // nested parse5/entities/lru-cache, its CSS engine -> @asamuzakjp/* ->
  // @csstools/* -> ..., undici) ships largely as pure ESM ("type": "module",
  // no CJS build). Real Node 22+ resolves those require() calls itself via
  // native require(esm) interop (axiom dev / ts-node run this package fine),
  // but Jest's own CJS-based module loader does not implement that interop
  // and throws "Unexpected token 'export'" — and the ESM packages are nested
  // many levels deep, so allowlisting them one at a time is a losing game.
  // Transform everything EXCEPT the platform-scaffold gRPC/protobuf/otel
  // deps: those are plain CJS (don't need it) and babel's strict-mode
  // wrapping actually BREAKS google-protobuf's sloppy-mode `this` feature
  // detection ("self is not defined") if it gets transformed too.
  transformIgnorePatterns: ['/node_modules/(google-protobuf|@grpc|@opentelemetry)/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
    // .js/.mjs (including nested node_modules, per transformIgnorePatterns
    // above) goes through babel-jest, not ts-jest — the TS transpiler
    // chokes on some modern syntax (e.g. class fields + `super` in undici)
    // that babel handles natively. Some of jsdom's CSS-engine deps ship
    // as .mjs specifically (@csstools/css-tokenizer et al.), hence m?js.
    '^.+\\.m?jsx?$': 'babel-jest',
  },
};
