import type { Logger } from 'barebone-logger';

/**
 * Creates a mock Logger for testing
 * All methods are jest.fn() mocks that can be asserted on
 *
 * @returns Mock Logger with jest.fn() for all methods
 */
export const createMockLogger = (): Logger => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});
