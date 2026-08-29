module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Mock cleanup - automatic between tests
  clearMocks: true, // Clear mock.calls, mock.instances, mock.contexts, mock.results
  resetMocks: true, // Reset mock.calls, mock.instances, mock.contexts, mock.results
  restoreMocks: true, // Restore original implementations for jest.spyOn

  // Test execution settings
  errorOnDeprecated: true, // Throw on deprecated API usage
  testTimeout: 5000, // 5s timeout (explicit)
  maxWorkers: '50%', // Use 50% of CPU cores

  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/__integration-tests__/'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/matchers.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/__tests__/**', '!src/__integration-tests__/**', '!src/**/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 97,
      functions: 97,
      lines: 99,
      statements: 99,
    },
    // VS Code bootstrap entry point — impractical to unit-test (require() of build
    // artifact version.json, vscode global wiring, no-op deactivate); exercised by
    // the release integration suite instead.
    'src/extension.ts': {
      branches: 60,
      functions: 50,
      lines: 90,
      statements: 90,
    },
    // getMessages() defensive fallback is dead by invariant — currentLocale can
    // only ever be a supported locale, so the `|| supportedLocales[DEFAULT_LOCALE]`
    // branch is unreachable.
    'src/i18n/LocaleManager.ts': {
      branches: 60,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__tests__/__mocks__/vscode',
    // Mock nanoid (ESM-only package) - tests use injected IdGenerator anyway
    '^nanoid$': '<rootDir>/src/__tests__/__mocks__/nanoid.ts',
    // Resolve rangelink-core-ts to source so jest.spyOn works (compiled CJS __exportStar uses
    // non-configurable Object.defineProperty on barrel exports, blocking spyOn)
    '^rangelink-core-ts$': '<rootDir>/../rangelink-core-ts/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
