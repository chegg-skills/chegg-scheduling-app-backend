/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts"],
  clearMocks: true,
  // Create test DB and run migrations once before any test file runs
  globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  // Load .env.test into process.env before each test file
  setupFiles: ["<rootDir>/tests/setup/setup-env.ts"],
  // Disconnect Prisma cleanly after each test file
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
};