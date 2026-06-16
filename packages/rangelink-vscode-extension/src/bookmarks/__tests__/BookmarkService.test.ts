import { createMockLogger } from '@couimet/logger-contract-testing';

import {
  createMockBookmarksStore,
  createMockClipboard,
  createMockConfigReader,
  createMockDestinationManager,
  createMockVscodeAdapter,
} from '../../__tests__/helpers';
import { createMockBoundSession } from '../../__tests__/helpers';
import type { Bookmark } from '../../bookmarks';
import { BookmarkService } from '../BookmarkService';

describe('BookmarkService', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockBookmarksStore: ReturnType<typeof createMockBookmarksStore>;
  let mockConfigReader: ReturnType<typeof createMockConfigReader>;
  let mockClipboard: ReturnType<typeof createMockClipboard>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let service: BookmarkService;

  const TEST_BOOKMARK: Bookmark = {
    id: 'bookmark-1',
    label: 'My Feature',
    link: 'src/features/my-feature.ts#L10-L20',
    scope: 'global',
    createdAt: '2025-01-01T00:00:00.000Z',
    accessCount: 0,
  };

  const createService = (): BookmarkService => {
    const mockSession = createMockBoundSession();
    const mockDestinationManager = createMockDestinationManager();
    return new BookmarkService(
      mockBookmarksStore,
      mockAdapter,
      mockConfigReader,
      mockDestinationManager,
      mockSession,
      mockLogger,
    );
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockBookmarksStore = createMockBookmarksStore({ bookmarks: [TEST_BOOKMARK] });
    mockConfigReader = createMockConfigReader();
    mockClipboard = createMockClipboard();
    mockAdapter = createMockVscodeAdapter({
      envOptions: { clipboard: mockClipboard },
    });
    service = createService();
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BookmarkService.constructor' },
        'BookmarkService initialized',
      );
    });
  });

  describe('isVisible', () => {
    it('returns true when bookmarks feature is enabled', () => {
      (mockConfigReader.getBoolean as jest.Mock).mockReturnValue(true);

      expect(service.isVisible()).toBe(true);
    });

    it('returns false when bookmarks feature is disabled', () => {
      expect(service.isVisible()).toBe(false);
    });
  });

  describe('getAllBookmarks', () => {
    it('returns all bookmarks from store', () => {
      const result = service.getAllBookmarks();

      expect(result).toStrictEqual([TEST_BOOKMARK]);
      expect(mockBookmarksStore.getAll).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no bookmarks exist', () => {
      mockBookmarksStore.getAll.mockReturnValue([]);

      expect(service.getAllBookmarks()).toStrictEqual([]);
    });
  });

  describe('hasBookmarks', () => {
    it('returns true when bookmarks exist', () => {
      expect(service.hasBookmarks()).toBe(true);
    });

    it('returns false when no bookmarks exist', () => {
      mockBookmarksStore.getAll.mockReturnValue([]);

      expect(service.hasBookmarks()).toBe(false);
    });
  });

  describe('addBookmark', () => {
    it('delegates to store.add', async () => {
      const input = { label: 'New', link: 'src/file.ts#L1' };

      await service.addBookmark(input);

      expect(mockBookmarksStore.add).toHaveBeenCalledWith(input);
    });
  });

  describe('removeBookmark', () => {
    it('delegates to store.remove', async () => {
      await service.removeBookmark('bookmark-1');

      expect(mockBookmarksStore.remove).toHaveBeenCalledWith('bookmark-1');
    });
  });

  describe('sendBookmark', () => {
    it('throws DESTINATION_NOT_BOUND when no destination is bound', async () => {
      const mockSession = createMockBoundSession();
      const mockDestinationManager = createMockDestinationManager();
      const service = new BookmarkService(
        mockBookmarksStore,
        mockAdapter,
        mockConfigReader,
        mockDestinationManager,
        mockSession,
        mockLogger,
      );

      await expect(async () =>
        service.sendBookmark('bookmark-1'),
      ).toThrowRangeLinkExtensionErrorAsync('DESTINATION_NOT_BOUND', {
        message: 'Cannot send bookmark: no destination is currently bound',
        functionName: 'BookmarkService.sendBookmark',
      });
    });

    it('logs warning and returns early when bookmark is not found', async () => {
      const mockSession = createMockBoundSession({ isSet: jest.fn().mockReturnValue(true) });
      const mockDestinationManager = createMockDestinationManager();
      const service = new BookmarkService(
        mockBookmarksStore,
        mockAdapter,
        mockConfigReader,
        mockDestinationManager,
        mockSession,
        mockLogger,
      );

      await service.sendBookmark('unknown-id');

      expect(mockClipboard.writeText).not.toHaveBeenCalled();
      expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'BookmarkService.sendBookmark', bookmarkId: 'unknown-id' },
        'Bookmark not found',
      );
    });

    it('copies link to clipboard and sends to bound destination', async () => {
      const mockSession = createMockBoundSession({ isSet: jest.fn().mockReturnValue(true) });
      const mockDestinationManager = createMockDestinationManager({
        sendTextToDestinationResult: true,
      });
      const service = new BookmarkService(
        mockBookmarksStore,
        mockAdapter,
        mockConfigReader,
        mockDestinationManager,
        mockSession,
        mockLogger,
      );

      await service.sendBookmark('bookmark-1');

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/features/my-feature.ts#L10-L20');
      expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
        'src/features/my-feature.ts#L10-L20',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BookmarkService.sendBookmark', bookmarkId: 'bookmark-1', bookmark: TEST_BOOKMARK },
        'Sent bookmark to destination: My Feature',
      );
    });

    it('records access before writing to clipboard', async () => {
      const mockSession = createMockBoundSession({ isSet: jest.fn().mockReturnValue(true) });
      const mockDestinationManager = createMockDestinationManager({
        sendTextToDestinationResult: true,
      });
      const service = new BookmarkService(
        mockBookmarksStore,
        mockAdapter,
        mockConfigReader,
        mockDestinationManager,
        mockSession,
        mockLogger,
      );

      await service.sendBookmark('bookmark-1');

      expect(mockBookmarksStore.recordAccess).toHaveBeenCalledWith('bookmark-1');
      expect(mockBookmarksStore.recordAccess.mock.invocationCallOrder[0]).toBeLessThan(
        mockClipboard.writeText.mock.invocationCallOrder[0],
      );
    });
  });
});
