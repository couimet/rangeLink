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
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/matchers.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/__tests__/**',
    '!src/index.ts',
    '!src/**/index.ts', // Exclude all index.ts files (re-exports)
    '!src/types/RangeLinkMessageCode.ts', // Enum with no logic - will achieve natural coverage when i18n is implemented
  ],
  coverageThreshold: {
    global: {
      branches: 99,
      functions: 100,
      lines: 100,
      statements: 99,
    },
  },
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
  coverageDirectory: 'coverage',
  verbose: true,
  moduleNameMapper: {
    // Resolve sibling workspace packages to source so jest.mock/jest.spyOn can replace a barrel
    // export (the compiled CJS __exportStar uses non-configurable Object.defineProperty on barrels);
    // percent-codec-ts is mapped because text-fragment-ts imports it.
    '^percent-codec-ts$': '<rootDir>/../percent-codec-ts/src/index.ts',
    '^text-fragment-ts$': '<rootDir>/../text-fragment-ts/src/index.ts',
  },
};
