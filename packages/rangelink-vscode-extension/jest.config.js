module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/test/**', '!src/test/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 73,
      functions: 43,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/test/vscode',
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
