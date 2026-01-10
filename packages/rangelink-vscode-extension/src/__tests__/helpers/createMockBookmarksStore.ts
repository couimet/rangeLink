/**
 * Mock BookmarksStore for testing
 *
 * Provides factory function to create mock bookmarks stores with sensible defaults.
 */

import type { Bookmark, BookmarksStore } from '../../bookmarks';
import { ExtensionResult } from '../../types';

/**
 * Options for creating a mock bookmarks store
 */
export interface MockBookmarksStoreOptions {
  /** Initial bookmarks to return from getAll (default: []) */
  bookmarks?: Bookmark[];
}

/**
 * Create a mock BookmarksStore for testing
 *
 * @param options - Optional configuration for the mock
 * @returns Mock BookmarksStore with jest functions
 */
export const createMockBookmarksStore = (
  options: MockBookmarksStoreOptions = {},
): jest.Mocked<BookmarksStore> => {
  const bookmarks = options.bookmarks ?? [];

  return {
    getAll: jest.fn(() => bookmarks),
    getById: jest.fn((id: string) => bookmarks.find((b) => b.id === id)),
    add: jest.fn().mockResolvedValue(ExtensionResult.ok({})),
    update: jest.fn().mockResolvedValue(ExtensionResult.ok({})),
    remove: jest.fn().mockResolvedValue(ExtensionResult.ok(undefined)),
    recordAccess: jest.fn().mockResolvedValue(ExtensionResult.ok(undefined)),
  } as unknown as jest.Mocked<BookmarksStore>;
};
