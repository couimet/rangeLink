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
      branches: 98,
      functions: 100,
      lines: 99,
      statements: 99,
    },
  },
  coverageDirectory: 'coverage',
  verbose: true,
};
