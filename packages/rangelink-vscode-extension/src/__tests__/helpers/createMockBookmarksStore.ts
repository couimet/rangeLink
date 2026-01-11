/**
 * Mock BookmarksStore for testing
 *
 * Provides factory function to create mock bookmarks stores with sensible defaults.
 */

import type { Bookmark, BookmarksStore } from '../../bookmarks';
import { ExtensionResult } from '../../types';

const DEFAULT_BOOKMARK: Bookmark = {
  id: 'test-id',
  label: 'Test Bookmark',
  link: '/path/to/file.ts#L10',
  scope: 'global',
  createdAt: '2025-01-01T00:00:00.000Z',
  accessCount: 0,
};

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
    add: jest.fn().mockResolvedValue(ExtensionResult.ok(DEFAULT_BOOKMARK)),
    update: jest.fn().mockResolvedValue(ExtensionResult.ok(DEFAULT_BOOKMARK)),
    remove: jest.fn().mockResolvedValue(ExtensionResult.ok(DEFAULT_BOOKMARK)),
    recordAccess: jest.fn().mockResolvedValue(ExtensionResult.ok(undefined)),
  } as unknown as jest.Mocked<BookmarksStore>;
};
