module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 43,
      lines: 65,
      statements: 65,
    },
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__tests__/__mocks__/vscode',
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
