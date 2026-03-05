import { createMockLogger } from 'barebone-logger-testing';

import {
  createMockBookmarksStore,
  createMockClipboard,
  createMockConfigReader,
  createMockDestinationManager,
  createMockVscodeAdapter,
} from '../../__tests__/helpers';
import type { Bookmark } from '../../bookmarks';
import { BookmarkService } from '../BookmarkService';

describe('BookmarkService', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockBookmarksStore: ReturnType<typeof createMockBookmarksStore>;
  let mockConfigReader: ReturnType<typeof createMockConfigReader>;
  let mockClipboard: ReturnType<typeof createMockClipboard>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;

  const TEST_BOOKMARK: Bookmark = {
    id: 'bookmark-1',
    label: 'My Feature',
    link: 'src/features/my-feature.ts#L10-L20',
    scope: 'global',
    createdAt: '2025-01-01T00:00:00.000Z',
    accessCount: 0,
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockBookmarksStore = createMockBookmarksStore({ bookmarks: [TEST_BOOKMARK] });
    mockConfigReader = createMockConfigReader();
    mockClipboard = createMockClipboard();
    mockAdapter = createMockVscodeAdapter({
      envOptions: { clipboard: mockClipboard },
    });
  });

  describe('sendBookmark', () => {
    it('throws DESTINATION_NOT_BOUND when no destination is bound', async () => {
      const mockDestinationManager = createMockDestinationManager({ isBound: false });
      const service = new BookmarkService(
        mockBookmarksStore,
        mockAdapter,
        mockConfigReader,
        mockDestinationManager,
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
      const mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: { displayName: 'Terminal' } as any,
      });
      const service = new BookmarkService(
        mockBookmarksStore,
        mockAdapter,
        mockConfigReader,
        mockDestinationManager,
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
      const mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: { displayName: 'Terminal' } as any,
        sendTextToDestinationResult: true,
      });
      const service = new BookmarkService(
        mockBookmarksStore,
        mockAdapter,
        mockConfigReader,
        mockDestinationManager,
        mockLogger,
      );

      await service.sendBookmark('bookmark-1');

      expect(mockClipboard.writeText).toHaveBeenCalledWith('src/features/my-feature.ts#L10-L20');
      expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
        'src/features/my-feature.ts#L10-L20',
        'Bookmark pasted: My Feature',
        'both',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BookmarkService.sendBookmark', bookmarkId: 'bookmark-1', bookmark: TEST_BOOKMARK },
        'Sent bookmark to destination: My Feature',
      );
    });

    it('records access before writing to clipboard', async () => {
      const mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: { displayName: 'Terminal' } as any,
        sendTextToDestinationResult: true,
      });
      const service = new BookmarkService(
        mockBookmarksStore,
        mockAdapter,
        mockConfigReader,
        mockDestinationManager,
        mockLogger,
      );

      await service.sendBookmark('bookmark-1');

      expect(mockBookmarksStore.recordAccess).toHaveBeenCalledWith('bookmark-1');
    });
  });
});
