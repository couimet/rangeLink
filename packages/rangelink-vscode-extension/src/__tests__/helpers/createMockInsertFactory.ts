import type { InsertFactory } from '../../destinations/capabilities/insertFactories';

/**
 * Create a mock InsertFactory for testing.
 *
 * Returns a jest-mocked factory whose forTarget returns a resolved insert function.
 * Generic — works for any target type (TextEditor, Terminal, etc.).
 */
export const createMockInsertFactory = <T = unknown>(): jest.Mocked<InsertFactory<T>> => ({
  forTarget: jest.fn(() => jest.fn().mockResolvedValue(true)),
});
