import type { Logger } from 'barebone-logger';
import { nanoid } from 'nanoid';
import type * as vscode from 'vscode';

import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import { createIsoTimestamp } from '../utils';

import type {
  Bookmark,
  BookmarkId,
  BookmarkInput,
  BookmarksStoreData,
  BookmarkUpdate,
  IdGenerator,
  TimestampGenerator,
} from './types';

const STORAGE_KEY = 'rangelink.bookmarks';

const createEmptyStoreData = (): BookmarksStoreData => ({ version: 1, bookmarks: [] });

const defaultIdGenerator: IdGenerator = nanoid;
const defaultTimestampGenerator: TimestampGenerator = createIsoTimestamp;

type GlobalStateWithSync = vscode.Memento & {
  setKeysForSync?: (keys: readonly string[]) => void;
};

/**
 * Persists bookmarks using VSCode's globalState API.
 * Enables cross-workspace bookmark storage with Settings Sync support.
 */
export class BookmarksStore {
  constructor(
    private readonly globalState: GlobalStateWithSync | undefined,
    private readonly logger: Logger,
    private readonly idGenerator: IdGenerator = defaultIdGenerator,
    private readonly timestampGenerator: TimestampGenerator = defaultTimestampGenerator,
  ) {
    if (!globalState) {
      this.logger.warn(
        { fn: 'BookmarksStore.constructor' },
        'No globalState provided - bookmarks will not be persisted',
      );
      return;
    }

    if ('setKeysForSync' in globalState && typeof globalState.setKeysForSync === 'function') {
      globalState.setKeysForSync([STORAGE_KEY]);
      this.logger.debug(
        { fn: 'BookmarksStore.constructor' },
        'Settings Sync enabled for bookmarks',
      );
    }
  }

  private findBookmarkIndex(data: BookmarksStoreData, id: BookmarkId, operation: string): number {
    const index = data.bookmarks.findIndex((b) => b.id === id);
    if (index === -1) {
      this.logger.warn(
        { fn: `BookmarksStore.${operation}`, bookmarkId: id },
        `Cannot ${operation} bookmark: not found`,
      );
    }
    return index;
  }

  /**
   * Creates a new bookmark with generated id, createdAt, and accessCount=0.
   */
  async add(input: BookmarkInput): Promise<Bookmark> {
    const data = this.load();
    const bookmark: Bookmark = {
      id: this.idGenerator(),
      label: input.label,
      link: input.link,
      description: input.description,
      scope: input.scope ?? 'global',
      createdAt: this.timestampGenerator(),
      accessCount: 0,
    };

    data.bookmarks.unshift(bookmark);
    await this.save(data, 'add');

    this.logger.debug(
      { fn: 'BookmarksStore.add', bookmark },
      `Added bookmark: ${bookmark.label}`,
    );

    return bookmark;
  }

  /**
   * Returns all bookmarks ordered by createdAt (newest first).
   */
  getAll(): Bookmark[] {
    const data = this.load();
    return [...data.bookmarks];
  }

  /**
   * Finds a bookmark by its id.
   */
  getById(id: BookmarkId): Bookmark | undefined {
    const data = this.load();
    return data.bookmarks.find((b) => b.id === id);
  }

  /**
   * Updates a bookmark's label, link, or description.
   * Returns the updated bookmark, or undefined if not found.
   */
  async update(id: BookmarkId, updates: BookmarkUpdate): Promise<Bookmark | undefined> {
    const data = this.load();
    const index = this.findBookmarkIndex(data, id, 'update');

    if (index === -1) {
      return undefined;
    }

    const bookmark = data.bookmarks[index];
    const updated: Bookmark = {
      ...bookmark,
      ...(updates.label !== undefined && { label: updates.label }),
      ...(updates.link !== undefined && { link: updates.link }),
      ...(updates.description !== undefined && { description: updates.description }),
    };

    data.bookmarks[index] = updated;
    await this.save(data, 'update');

    this.logger.debug(
      { fn: 'BookmarksStore.update', bookmarkId: id, updates, updatedBookmark: updated },
      `Updated bookmark: ${updated.label}`,
    );

    return updated;
  }

  /**
   * Removes a bookmark by its id.
   * Returns true if removed, false if not found.
   */
  async remove(id: BookmarkId): Promise<boolean> {
    const data = this.load();
    const index = this.findBookmarkIndex(data, id, 'remove');

    if (index === -1) {
      return false;
    }

    const [removed] = data.bookmarks.splice(index, 1);
    await this.save(data, 'remove');

    this.logger.debug(
      { fn: 'BookmarksStore.remove', removedBookmark: removed },
      `Removed bookmark: ${removed.label}`,
    );

    return true;
  }

  /**
   * Records an access to a bookmark, updating lastAccessedAt and incrementing accessCount.
   */
  async recordAccess(id: BookmarkId): Promise<void> {
    const data = this.load();
    const index = this.findBookmarkIndex(data, id, 'recordAccess');

    if (index === -1) {
      return;
    }

    const bookmark = data.bookmarks[index];
    const updatedBookmark: Bookmark = {
      ...bookmark,
      lastAccessedAt: this.timestampGenerator(),
      accessCount: bookmark.accessCount + 1,
    };

    data.bookmarks[index] = updatedBookmark;
    await this.save(data, 'recordAccess');

    this.logger.debug(
      { fn: 'BookmarksStore.recordAccess', updatedBookmark },
      `Recorded access for bookmark: ${updatedBookmark.label}`,
    );
  }

  private load(): BookmarksStoreData {
    if (!this.globalState) {
      return createEmptyStoreData();
    }
    const raw = this.globalState.get<unknown>(STORAGE_KEY);
    return this.migrate(raw);
  }

  private async save(data: BookmarksStoreData, operation: string): Promise<void> {
    if (!this.globalState) {
      return;
    }
    try {
      await this.globalState.update(STORAGE_KEY, data);
    } catch (error) {
      this.logger.error(
        { fn: `BookmarksStore.${operation}`, error },
        `Failed to save bookmarks during ${operation}`,
      );
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.BOOKMARK_SAVE_FAILED,
        message: `Failed to persist bookmarks during ${operation}`,
        functionName: `BookmarksStore.${operation}`,
        details: { operation },
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  private migrate(data: unknown): BookmarksStoreData {
    if (!data || typeof data !== 'object') {
      return createEmptyStoreData();
    }

    const typed = data as Record<string, unknown>;

    if (typed.version === 1 && Array.isArray(typed.bookmarks)) {
      return data as BookmarksStoreData;
    }

    this.logger.warn(
      { fn: 'BookmarksStore.migrate', data },
      'Unknown bookmark data format, resetting to empty',
    );
    return createEmptyStoreData();
  }
}
