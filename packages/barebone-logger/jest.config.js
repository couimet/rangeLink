module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Mock cleanup - automatic between tests
  clearMocks: true, // Clear mock.calls, mock.instances, mock.contexts, mock.results
  resetMocks: true, // Reset mock implementations to empty functions
  restoreMocks: true, // Restore original implementations for jest.spyOn

  // Test execution settings
  errorOnDeprecated: true, // Throw on deprecated API usage
  testTimeout: 5000, // 5s timeout (explicit)
  maxWorkers: '50%', // Use 50% of CPU cores

  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/__tests__/**',
    '!src/index.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    },
  },
  coverageDirectory: 'coverage',
  verbose: true,
};
