import type { BookmarkService } from '../../bookmarks/BookmarkService';

export const createMockBookmarkService = (): jest.Mocked<BookmarkService> =>
  ({
    getAllBookmarks: jest.fn().mockReturnValue([]),
    hasBookmarks: jest.fn().mockReturnValue(false),
    addBookmark: jest.fn(),
    pasteBookmark: jest.fn(),
  }) as unknown as jest.Mocked<BookmarkService>;
