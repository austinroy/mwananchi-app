/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  rootDir: ".",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "cjs", "mjs", "json", "node"],
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/src/test/styleMock.cjs",
  },
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.app.json",
        useESM: true,
      },
    ],
  },
};
