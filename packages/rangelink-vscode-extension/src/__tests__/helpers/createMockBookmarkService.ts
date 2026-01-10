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

export const createMockBookmarkService = (): jest.Mocked<BookmarkService> =>
  ({
    getAllBookmarks: jest.fn().mockReturnValue([]),
    hasBookmarks: jest.fn().mockReturnValue(false),
    addBookmark: jest.fn().mockResolvedValue(ExtensionResult.ok(DEFAULT_BOOKMARK)),
    pasteBookmark: jest.fn(),
  }) as unknown as jest.Mocked<BookmarkService>;
