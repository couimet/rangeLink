import { createMockLogger } from 'barebone-logger-testing';

import { createMockMemento, type MockMemento } from '../../__tests__/helpers';
import { BookmarksStore } from '../BookmarksStore';
import type { Bookmark, BookmarksStoreData } from '../types';

const STORAGE_KEY = 'rangelink.bookmarks';

const TEST_ID = 'test-bookmark-id-001';
const TEST_TIMESTAMP = '2025-01-15T10:30:00.000Z';

describe('BookmarksStore', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockMemento: MockMemento;
  let mockIdGenerator: jest.Mock<string>;
  let mockTimestampGenerator: jest.Mock<string>;
  let store: BookmarksStore;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockMemento = createMockMemento();
    mockIdGenerator = jest.fn(() => TEST_ID);
    mockTimestampGenerator = jest.fn(() => TEST_TIMESTAMP);
    store = new BookmarksStore(mockMemento, mockLogger, mockIdGenerator, mockTimestampGenerator);
  });

  describe('constructor', () => {
    it('enables Settings Sync when setKeysForSync is available', () => {
      new BookmarksStore(mockMemento, mockLogger);

      expect(mockMemento.setKeysForSync).toHaveBeenCalledWith([STORAGE_KEY]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.constructor' },
        'Settings Sync enabled for bookmarks',
      );
    });

    it('handles globalState without setKeysForSync gracefully', () => {
      delete (mockMemento as { setKeysForSync?: jest.Mock }).setKeysForSync;

      store = new BookmarksStore(mockMemento, mockLogger);

      expect(store).toBeDefined();
    });

    it('throws when globalState is undefined', () => {
      expect(
        () => new BookmarksStore(undefined as never, mockLogger),
      ).toThrowRangeLinkExtensionError('BOOKMARK_STORE_NOT_AVAILABLE', {
        message: 'Cannot create BookmarksStore: globalState is required for bookmark persistence',
        functionName: 'BookmarksStore.constructor',
      });
    });
  });

  describe('add()', () => {
    it('creates bookmark with generated id and timestamps', async () => {
      const result = await store.add({
        label: 'CLAUDE.md Instructions',
        link: '/Users/test/project/CLAUDE.md#L10-L20',
      });

      expect(result.success).toBe(true);
      expect(result.value).toStrictEqual({
        id: TEST_ID,
        label: 'CLAUDE.md Instructions',
        link: '/Users/test/project/CLAUDE.md#L10-L20',
        description: undefined,
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      });
    });

    it('includes description when provided', async () => {
      const result = await store.add({
        label: 'My Bookmark',
        link: '/path/to/file.ts#L5',
        description: 'Important code section',
      });

      expect(result.success).toBe(true);
      expect(result.value.description).toBe('Important code section');
    });

    it('defaults scope to global when not provided', async () => {
      const result = await store.add({
        label: 'My Bookmark',
        link: '/path/to/file.ts#L5',
      });

      expect(result.success).toBe(true);
      expect(result.value.scope).toBe('global');
    });

    it('persists to globalState', async () => {
      await store.add({ label: 'Test', link: '/test#L1' });

      expect(mockMemento.update).toHaveBeenCalledWith(STORAGE_KEY, {
        version: 1,
        bookmarks: [
          {
            id: TEST_ID,
            label: 'Test',
            link: '/test#L1',
            description: undefined,
            scope: 'global',
            createdAt: TEST_TIMESTAMP,
            accessCount: 0,
          },
        ],
      });
    });

    it('logs debug message', async () => {
      await store.add({ label: 'Test Bookmark', link: '/test#L1' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'BookmarksStore.add',
          bookmark: {
            id: TEST_ID,
            label: 'Test Bookmark',
            link: '/test#L1',
            description: undefined,
            scope: 'global',
            createdAt: TEST_TIMESTAMP,
            accessCount: 0,
          },
        },
        'Added bookmark: Test Bookmark',
      );
    });

    it('adds new bookmarks at the beginning of the list', async () => {
      const existingData: BookmarksStoreData = {
        version: 1,
        bookmarks: [
          {
            id: 'existing-id',
            label: 'Existing',
            link: '/existing#L1',
            scope: 'global',
            createdAt: '2025-01-01T00:00:00.000Z',
            accessCount: 5,
          },
        ],
      };
      mockMemento._storage.set(STORAGE_KEY, existingData);
      await store.add({ label: 'New', link: '/new#L1' });

      const saved = mockMemento._storage.get(STORAGE_KEY) as BookmarksStoreData;
      expect(saved.bookmarks[0].label).toBe('New');
      expect(saved.bookmarks[1].label).toBe('Existing');
    });

    it('retries ID generation on collision and logs debug message', async () => {
      const existingBookmark: Bookmark = {
        id: 'colliding-id',
        label: 'Existing',
        link: '/existing#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [existingBookmark] });
      mockIdGenerator.mockReturnValueOnce('colliding-id').mockReturnValueOnce('unique-id');
      store = new BookmarksStore(mockMemento, mockLogger, mockIdGenerator, mockTimestampGenerator);

      const result = await store.add({ label: 'New', link: '/new#L1' });

      expect(result.success).toBe(true);
      expect(result.value.id).toBe('unique-id');
      expect(mockIdGenerator).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.generateUniqueId', attempt: 1, collidingId: 'colliding-id' },
        'ID collision detected, generating new ID',
      );
    });

    it('returns error after max retries when all generated IDs collide', async () => {
      const existingBookmark: Bookmark = {
        id: 'always-collides',
        label: 'Existing',
        link: '/existing#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [existingBookmark] });
      mockIdGenerator.mockReturnValue('always-collides');
      store = new BookmarksStore(mockMemento, mockLogger, mockIdGenerator, mockTimestampGenerator);

      const result = await store.add({ label: 'New', link: '/new#L1' });

      expect(result).toBeRangeLinkExtensionErrorErr('BOOKMARK_ID_GENERATION_FAILED', {
        message: 'Failed to generate unique bookmark ID after 10 attempts',
        functionName: 'BookmarksStore.generateUniqueId',
      });
      expect(mockIdGenerator).toHaveBeenCalledTimes(10);
    });
  });

  describe('getAll()', () => {
    it('returns empty array when no bookmarks', () => {
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
    });

    it('returns all bookmarks', () => {
      const bookmark1: Bookmark = {
        id: 'id-1',
        label: 'First',
        link: '/first#L1',
        scope: 'global',
        createdAt: '2025-01-15T10:00:00.000Z',
        accessCount: 0,
      };
      const bookmark2: Bookmark = {
        id: 'id-2',
        label: 'Second',
        link: '/second#L2',
        scope: 'global',
        createdAt: '2025-01-15T11:00:00.000Z',
        accessCount: 3,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark1, bookmark2] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([bookmark1, bookmark2]);
    });

    it('returns a copy of the bookmarks array', () => {
      const bookmark: Bookmark = {
        id: 'id-1',
        label: 'Test',
        link: '/test#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result1 = store.getAll();
      const result2 = store.getAll();

      expect(result1).not.toBe(result2);
      expect(result1).toStrictEqual(result2);
    });
  });

  describe('getById()', () => {
    it('returns bookmark when found', () => {
      const bookmark: Bookmark = {
        id: 'target-id',
        label: 'Target',
        link: '/target#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getById('target-id');

      expect(result).toStrictEqual(bookmark);
    });

    it('returns undefined when not found', () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('update()', () => {
    const existingBookmark: Bookmark = {
      id: 'existing-id',
      label: 'Original Label',
      link: '/original#L1',
      description: 'Original description',
      scope: 'global',
      createdAt: '2025-01-01T00:00:00.000Z',
      accessCount: 5,
    };

    it('updates label field', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.update('existing-id', { label: 'New Label' });

      expect(result.success).toBe(true);
      expect(result.value.label).toBe('New Label');
      expect(result.value.link).toBe('/original#L1');
      expect(result.value.description).toBe('Original description');
    });

    it('updates link field', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.update('existing-id', { link: '/new/path#L10' });

      expect(result.success).toBe(true);
      expect(result.value.link).toBe('/new/path#L10');
      expect(result.value.label).toBe('Original Label');
    });

    it('updates description field', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.update('existing-id', {
        description: 'New description',
      });

      expect(result.success).toBe(true);
      expect(result.value.description).toBe('New description');
    });

    it('updates multiple fields', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.update('existing-id', {
        label: 'Updated Label',
        link: '/updated#L5',
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      expect(result.value).toStrictEqual({
        id: 'existing-id',
        label: 'Updated Label',
        link: '/updated#L5',
        description: 'Updated description',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 5,
      });
    });

    it('does not modify other fields (createdAt, accessCount, scope)', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.update('existing-id', { label: 'Changed' });

      expect(result.success).toBe(true);
      expect(result.value.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(result.value.accessCount).toBe(5);
      expect(result.value.scope).toBe('global');
    });

    it('returns Result.err and logs warning for non-existent id', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.update('non-existent', { label: 'New' });

      expect(result).toBeRangeLinkExtensionErrorErr('BOOKMARK_NOT_FOUND', {
        message: 'Cannot update bookmark: not found',
        functionName: 'BookmarksStore.update',
        details: { bookmarkId: 'non-existent' },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.update', bookmarkId: 'non-existent' },
        'Cannot update bookmark: not found',
      );
    });

    it('persists changes', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      store = new BookmarksStore(mockMemento, mockLogger);

      await store.update('existing-id', { label: 'Persisted' });

      const saved = mockMemento._storage.get(STORAGE_KEY) as BookmarksStoreData;
      expect(saved.bookmarks[0].label).toBe('Persisted');
    });

    it('logs debug message', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      store = new BookmarksStore(mockMemento, mockLogger);

      await store.update('existing-id', { label: 'Updated Label' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'BookmarksStore.update',
          bookmarkId: 'existing-id',
          updates: { label: 'Updated Label' },
          updatedBookmark: {
            id: 'existing-id',
            label: 'Updated Label',
            link: '/original#L1',
            description: 'Original description',
            scope: 'global',
            createdAt: '2025-01-01T00:00:00.000Z',
            accessCount: 5,
          },
        },
        'Updated bookmark: Updated Label',
      );
    });
  });

  describe('remove()', () => {
    it('removes existing bookmark and returns Result.ok', async () => {
      const bookmark: Bookmark = {
        id: 'to-remove',
        label: 'Remove Me',
        link: '/remove#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.remove('to-remove');

      expect(result.success).toBe(true);
      expect(store.getAll()).toStrictEqual([]);
    });

    it('returns Result.err and logs warning for non-existent id', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.remove('non-existent');

      expect(result).toBeRangeLinkExtensionErrorErr('BOOKMARK_NOT_FOUND', {
        message: 'Cannot remove bookmark: not found',
        functionName: 'BookmarksStore.remove',
        details: { bookmarkId: 'non-existent' },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.remove', bookmarkId: 'non-existent' },
        'Cannot remove bookmark: not found',
      );
    });

    it('persists changes', async () => {
      const bookmark: Bookmark = {
        id: 'to-remove',
        label: 'Remove Me',
        link: '/remove#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger);

      await store.remove('to-remove');

      expect(mockMemento.update).toHaveBeenCalledWith(STORAGE_KEY, {
        version: 1,
        bookmarks: [],
      });
    });

    it('logs debug message', async () => {
      const bookmark: Bookmark = {
        id: 'to-remove',
        label: 'Remove Me',
        link: '/remove#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger);

      await store.remove('to-remove');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'BookmarksStore.remove',
          removedBookmark: {
            id: 'to-remove',
            label: 'Remove Me',
            link: '/remove#L1',
            scope: 'global',
            createdAt: TEST_TIMESTAMP,
            accessCount: 0,
          },
        },
        'Removed bookmark: Remove Me',
      );
    });
  });

  describe('recordAccess()', () => {
    it('updates lastAccessedAt to current time', async () => {
      const bookmark: Bookmark = {
        id: 'access-me',
        label: 'Access Test',
        link: '/access#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger, undefined, mockTimestampGenerator);

      const result = await store.recordAccess('access-me');

      expect(result.success).toBe(true);
      const saved = mockMemento._storage.get(STORAGE_KEY) as BookmarksStoreData;
      expect(saved.bookmarks[0].lastAccessedAt).toBe(TEST_TIMESTAMP);
    });

    it('increments accessCount', async () => {
      const bookmark: Bookmark = {
        id: 'access-me',
        label: 'Access Test',
        link: '/access#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 5,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.recordAccess('access-me');

      expect(result.success).toBe(true);
      const saved = mockMemento._storage.get(STORAGE_KEY) as BookmarksStoreData;
      expect(saved.bookmarks[0].accessCount).toBe(6);
    });

    it('returns Result.err and logs warning for non-existent id', async () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = await store.recordAccess('non-existent');

      expect(result).toBeRangeLinkExtensionErrorErr('BOOKMARK_NOT_FOUND', {
        message: 'Cannot record access: bookmark not found',
        functionName: 'BookmarksStore.recordAccess',
        details: { bookmarkId: 'non-existent' },
      });
      expect(mockMemento.update).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.recordAccess', bookmarkId: 'non-existent' },
        'Cannot recordAccess bookmark: not found',
      );
    });

    it('persists changes', async () => {
      const bookmark: Bookmark = {
        id: 'access-me',
        label: 'Access Test',
        link: '/access#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger, undefined, mockTimestampGenerator);

      await store.recordAccess('access-me');

      expect(mockMemento.update).toHaveBeenCalledWith(STORAGE_KEY, {
        version: 1,
        bookmarks: [
          {
            id: 'access-me',
            label: 'Access Test',
            link: '/access#L1',
            scope: 'global',
            createdAt: '2025-01-01T00:00:00.000Z',
            lastAccessedAt: TEST_TIMESTAMP,
            accessCount: 1,
          },
        ],
      });
    });

    it('logs debug message', async () => {
      const bookmark: Bookmark = {
        id: 'access-me',
        label: 'Access Test',
        link: '/access#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 2,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger, undefined, mockTimestampGenerator);

      await store.recordAccess('access-me');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'BookmarksStore.recordAccess',
          updatedBookmark: {
            id: 'access-me',
            label: 'Access Test',
            link: '/access#L1',
            scope: 'global',
            createdAt: '2025-01-01T00:00:00.000Z',
            lastAccessedAt: TEST_TIMESTAMP,
            accessCount: 3,
          },
        },
        'Recorded access for bookmark: Access Test',
      );
    });
  });

  describe('migration', () => {
    it('handles null globalState data', () => {
      mockMemento._storage.set(STORAGE_KEY, null);
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
    });

    it('handles undefined globalState data', () => {
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
    });

    it('handles valid v1 data', () => {
      const bookmark: Bookmark = {
        id: 'valid-id',
        label: 'Valid',
        link: '/valid#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([bookmark]);
    });

    it('resets malformed data with warning', () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 999, invalid: true });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.migrate', data: { version: 999, invalid: true } },
        'Unknown bookmark data format, resetting to empty',
      );
    });

    it('resets data with missing bookmarks array', () => {
      mockMemento._storage.set(STORAGE_KEY, { version: 1 });
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('resets non-object data', () => {
      mockMemento._storage.set(STORAGE_KEY, 'invalid string');
      store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
    });
  });
});
