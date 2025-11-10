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
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 43,
      lines: 58,
      statements: 60,
    },
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__tests__/__mocks__/vscode',
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
