import type { Bookmark } from '../../bookmarks';
import type { BookmarkService } from '../../bookmarks/BookmarkService';
import { ExtensionResult } from '../../types';

const DEFAULT_BOOKMARK: Bookmark = {
  id: 'test-id',
  label: 'Test Bookmark',
  link: '/path/to/file.ts#L10',
  scope: 'global',
  createdAt: '2025-01-01T00:00:00.000Z',
  accessCount: 0,
};

export interface MockBookmarkServiceOptions {
  bookmarks?: Bookmark[];
}

export const createMockBookmarkService = (
  options: MockBookmarkServiceOptions = {},
): jest.Mocked<BookmarkService> => {
  const { bookmarks = [] } = options;

  return {
    getAllBookmarks: jest.fn().mockReturnValue(bookmarks),
    hasBookmarks: jest.fn().mockReturnValue(bookmarks.length > 0),
    addBookmark: jest.fn().mockResolvedValue(ExtensionResult.ok(DEFAULT_BOOKMARK)),
    removeBookmark: jest.fn().mockResolvedValue(ExtensionResult.ok(DEFAULT_BOOKMARK)),
    pasteBookmark: jest.fn(),
  } as unknown as jest.Mocked<BookmarkService>;
};
