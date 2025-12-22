/**
 * Mock BookmarksStore for testing
 *
 * Provides factory function to create mock bookmarks stores with sensible defaults.
 */

import { Result } from 'rangelink-core-ts';

import type { Bookmark, BookmarksStore } from '../../bookmarks';

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
    add: jest.fn().mockResolvedValue(Result.ok({})),
    update: jest.fn().mockResolvedValue(Result.ok({})),
    remove: jest.fn().mockResolvedValue(Result.ok(undefined)),
    recordAccess: jest.fn().mockResolvedValue(Result.ok(undefined)),
  } as unknown as jest.Mocked<BookmarksStore>;
};
