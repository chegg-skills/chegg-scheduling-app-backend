/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts", "!src/instrument.ts"],
  // Ratchet gate: a few points below the current baseline
  // (~79% stmts / ~60% branch / ~79% funcs / ~80% lines) so a regression fails CI
  // while existing work passes. The margin also absorbs minor coverage jitter from
  // the occasional flaky test. Raise over time.
  coverageThreshold: {
    global: {
      statements: 76,
      branches: 56,
      functions: 75,
      lines: 76,
    },
  },
  clearMocks: true,
  // Create test DB and run migrations once before any test file runs
  globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  // Load .env.test into process.env before each test file
  setupFiles: ["<rootDir>/tests/setup/setup-env.ts"],
  // Disconnect Prisma cleanly after each test file
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
};
