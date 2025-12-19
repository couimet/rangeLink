import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import { BookmarksStore } from '../BookmarksStore';
import type { Bookmark, BookmarksStoreData } from '../types';

const STORAGE_KEY = 'rangelink.bookmarks';

const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_TIMESTAMP = '2025-01-15T10:30:00.000Z';

const createMockMemento = (): vscode.Memento & {
  setKeysForSync: jest.Mock;
  _storage: Map<string, unknown>;
} => {
  const storage = new Map<string, unknown>();
  return {
    get: jest.fn(<T>(key: string, defaultValue?: T): T | undefined => {
      return (storage.get(key) as T | undefined) ?? defaultValue;
    }),
    update: jest.fn((key: string, value: unknown): Thenable<void> => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    keys: jest.fn(() => Array.from(storage.keys())),
    setKeysForSync: jest.fn(),
    _storage: storage,
  };
};

const createTestIdGenerator = () => jest.fn(() => TEST_UUID);

describe('BookmarksStore', () => {
  const mockLogger = createMockLogger();

  beforeEach(() => {
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(TEST_TIMESTAMP);
  });

  describe('constructor', () => {
    it('enables Settings Sync when setKeysForSync is available', () => {
      const mockMemento = createMockMemento();

      new BookmarksStore(mockMemento, mockLogger);

      expect(mockMemento.setKeysForSync).toHaveBeenCalledWith([STORAGE_KEY]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.constructor' },
        'Settings Sync enabled for bookmarks',
      );
    });

    it('handles globalState without setKeysForSync gracefully', () => {
      const mockMemento = createMockMemento();
      delete (mockMemento as any).setKeysForSync;

      const store = new BookmarksStore(mockMemento, mockLogger);

      expect(store).toBeDefined();
    });

    it('logs warning and operates without persistence when globalState is undefined', () => {
      const mockIdGenerator = createTestIdGenerator();
      const store = new BookmarksStore(undefined, mockLogger, mockIdGenerator);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.constructor' },
        'No globalState provided - bookmarks will not be persisted',
      );

      const bookmark = store.add({ label: 'Test', link: '/test#L1' });
      expect(bookmark.id).toBe(TEST_UUID);
      expect(store.getAll()).toStrictEqual([]);
    });
  });

  describe('add()', () => {
    it('creates bookmark with generated id and timestamps', () => {
      const mockMemento = createMockMemento();
      const mockIdGenerator = createTestIdGenerator();
      const store = new BookmarksStore(mockMemento, mockLogger, mockIdGenerator);

      const result = store.add({
        label: 'CLAUDE.md Instructions',
        link: '/Users/test/project/CLAUDE.md#L10-L20',
      });

      expect(result).toStrictEqual({
        id: TEST_UUID,
        label: 'CLAUDE.md Instructions',
        link: '/Users/test/project/CLAUDE.md#L10-L20',
        description: undefined,
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      });
    });

    it('includes description when provided', () => {
      const mockMemento = createMockMemento();
      const mockIdGenerator = createTestIdGenerator();
      const store = new BookmarksStore(mockMemento, mockLogger, mockIdGenerator);

      const result = store.add({
        label: 'My Bookmark',
        link: '/path/to/file.ts#L5',
        description: 'Important code section',
      });

      expect(result.description).toBe('Important code section');
    });

    it('defaults scope to global when not provided', () => {
      const mockMemento = createMockMemento();
      const mockIdGenerator = createTestIdGenerator();
      const store = new BookmarksStore(mockMemento, mockLogger, mockIdGenerator);

      const result = store.add({
        label: 'My Bookmark',
        link: '/path/to/file.ts#L5',
      });

      expect(result.scope).toBe('global');
    });

    it('persists to globalState', () => {
      const mockMemento = createMockMemento();
      const mockIdGenerator = createTestIdGenerator();
      const store = new BookmarksStore(mockMemento, mockLogger, mockIdGenerator);

      store.add({ label: 'Test', link: '/test#L1' });

      expect(mockMemento.update).toHaveBeenCalledWith(STORAGE_KEY, {
        version: 1,
        bookmarks: [
          {
            id: TEST_UUID,
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

    it('logs debug message', () => {
      const mockMemento = createMockMemento();
      const mockIdGenerator = createTestIdGenerator();
      const store = new BookmarksStore(mockMemento, mockLogger, mockIdGenerator);

      store.add({ label: 'Test Bookmark', link: '/test#L1' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.add', bookmarkId: TEST_UUID, label: 'Test Bookmark' },
        'Added bookmark: Test Bookmark',
      );
    });

    it('adds new bookmarks at the beginning of the list', () => {
      const mockMemento = createMockMemento();
      const mockIdGenerator = createTestIdGenerator();
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
      const store = new BookmarksStore(mockMemento, mockLogger, mockIdGenerator);

      store.add({ label: 'New', link: '/new#L1' });

      const saved = mockMemento._storage.get(STORAGE_KEY) as BookmarksStoreData;
      expect(saved.bookmarks[0].label).toBe('New');
      expect(saved.bookmarks[1].label).toBe('Existing');
    });
  });

  describe('getAll()', () => {
    it('returns empty array when no bookmarks', () => {
      const mockMemento = createMockMemento();
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
    });

    it('returns all bookmarks', () => {
      const mockMemento = createMockMemento();
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
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([bookmark1, bookmark2]);
    });

    it('returns a copy of the bookmarks array', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'id-1',
        label: 'Test',
        link: '/test#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result1 = store.getAll();
      const result2 = store.getAll();

      expect(result1).not.toBe(result2);
      expect(result1).toStrictEqual(result2);
    });
  });

  describe('getById()', () => {
    it('returns bookmark when found', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'target-id',
        label: 'Target',
        link: '/target#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getById('target-id');

      expect(result).toStrictEqual(bookmark);
    });

    it('returns undefined when not found', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [] });
      const store = new BookmarksStore(mockMemento, mockLogger);

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

    it('updates label field', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.update('existing-id', { label: 'New Label' });

      expect(result?.label).toBe('New Label');
      expect(result?.link).toBe('/original#L1');
      expect(result?.description).toBe('Original description');
    });

    it('updates link field', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.update('existing-id', { link: '/new/path#L10' });

      expect(result?.link).toBe('/new/path#L10');
      expect(result?.label).toBe('Original Label');
    });

    it('updates description field', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.update('existing-id', { description: 'New description' });

      expect(result?.description).toBe('New description');
    });

    it('updates multiple fields', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.update('existing-id', {
        label: 'Updated Label',
        link: '/updated#L5',
        description: 'Updated description',
      });

      expect(result).toStrictEqual({
        id: 'existing-id',
        label: 'Updated Label',
        link: '/updated#L5',
        description: 'Updated description',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 5,
      });
    });

    it('does not modify other fields (createdAt, accessCount, scope)', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.update('existing-id', { label: 'Changed' });

      expect(result?.createdAt).toBe('2025-01-01T00:00:00.000Z');
      expect(result?.accessCount).toBe(5);
      expect(result?.scope).toBe('global');
    });

    it('returns undefined for non-existent id', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.update('non-existent', { label: 'New' });

      expect(result).toBeUndefined();
    });

    it('persists changes', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      store.update('existing-id', { label: 'Persisted' });

      const saved = mockMemento._storage.get(STORAGE_KEY) as BookmarksStoreData;
      expect(saved.bookmarks[0].label).toBe('Persisted');
    });

    it('logs debug message', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [{ ...existingBookmark }] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      store.update('existing-id', { label: 'Updated Label' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'BookmarksStore.update',
          bookmarkId: 'existing-id',
          updates: { label: 'Updated Label' },
        },
        'Updated bookmark: Updated Label',
      );
    });
  });

  describe('remove()', () => {
    it('removes existing bookmark and returns true', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'to-remove',
        label: 'Remove Me',
        link: '/remove#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.remove('to-remove');

      expect(result).toBe(true);
      expect(store.getAll()).toStrictEqual([]);
    });

    it('returns false for non-existent id', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.remove('non-existent');

      expect(result).toBe(false);
    });

    it('persists changes', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'to-remove',
        label: 'Remove Me',
        link: '/remove#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      store.remove('to-remove');

      expect(mockMemento.update).toHaveBeenCalledWith(STORAGE_KEY, {
        version: 1,
        bookmarks: [],
      });
    });

    it('logs debug message', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'to-remove',
        label: 'Remove Me',
        link: '/remove#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      store.remove('to-remove');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.remove', bookmarkId: 'to-remove', label: 'Remove Me' },
        'Removed bookmark: Remove Me',
      );
    });
  });

  describe('recordAccess()', () => {
    it('updates lastAccessedAt to current time', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'access-me',
        label: 'Access Test',
        link: '/access#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      store.recordAccess('access-me');

      const saved = mockMemento._storage.get(STORAGE_KEY) as BookmarksStoreData;
      expect(saved.bookmarks[0].lastAccessedAt).toBe(TEST_TIMESTAMP);
    });

    it('increments accessCount', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'access-me',
        label: 'Access Test',
        link: '/access#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 5,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      store.recordAccess('access-me');

      const saved = mockMemento._storage.get(STORAGE_KEY) as BookmarksStoreData;
      expect(saved.bookmarks[0].accessCount).toBe(6);
    });

    it('does nothing for non-existent id', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      store.recordAccess('non-existent');

      expect(mockMemento.update).not.toHaveBeenCalled();
    });

    it('persists changes', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'access-me',
        label: 'Access Test',
        link: '/access#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      store.recordAccess('access-me');

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

    it('logs debug message', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'access-me',
        label: 'Access Test',
        link: '/access#L1',
        scope: 'global',
        createdAt: '2025-01-01T00:00:00.000Z',
        accessCount: 2,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      store.recordAccess('access-me');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.recordAccess', bookmarkId: 'access-me', accessCount: 3 },
        'Recorded access for bookmark: Access Test',
      );
    });
  });

  describe('migration', () => {
    it('handles null globalState data', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, null);
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
    });

    it('handles undefined globalState data', () => {
      const mockMemento = createMockMemento();
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
    });

    it('handles valid v1 data', () => {
      const mockMemento = createMockMemento();
      const bookmark: Bookmark = {
        id: 'valid-id',
        label: 'Valid',
        link: '/valid#L1',
        scope: 'global',
        createdAt: TEST_TIMESTAMP,
        accessCount: 0,
      };
      mockMemento._storage.set(STORAGE_KEY, { version: 1, bookmarks: [bookmark] });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([bookmark]);
    });

    it('resets malformed data with warning', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 999, invalid: true });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'BookmarksStore.migrate', data: { version: 999, invalid: true } },
        'Unknown bookmark data format, resetting to empty',
      );
    });

    it('resets data with missing bookmarks array', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, { version: 1 });
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('resets non-object data', () => {
      const mockMemento = createMockMemento();
      mockMemento._storage.set(STORAGE_KEY, 'invalid string');
      const store = new BookmarksStore(mockMemento, mockLogger);

      const result = store.getAll();

      expect(result).toStrictEqual([]);
    });
  });
});
