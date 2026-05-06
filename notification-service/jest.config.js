/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "node",
          types: ["node", "jest"],
        },
      },
    ],
  },
  testMatch: ["**/*.test.ts"],
};

module.exports = config;
