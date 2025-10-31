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
      branches: 78,
      functions: 46,
      lines: 76,
      statements: 75,
    },
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/test/vscode',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        types: ['node', 'jest'],
      },
    },
  },
};
