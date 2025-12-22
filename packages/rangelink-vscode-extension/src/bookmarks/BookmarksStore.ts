import type { Logger } from 'barebone-logger';
import { nanoid } from 'nanoid';
import { Result } from 'rangelink-core-ts';
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
const MAX_ID_GENERATION_RETRIES = 10;

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
  private readonly syncEnabled: boolean;

  constructor(
    private readonly globalState: GlobalStateWithSync,
    private readonly logger: Logger,
    private readonly idGenerator: IdGenerator = defaultIdGenerator,
    private readonly timestampGenerator: TimestampGenerator = defaultTimestampGenerator,
  ) {
    if (!globalState) {
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.BOOKMARK_STORE_NOT_AVAILABLE,
        message: 'Cannot create BookmarksStore: globalState is required for bookmark persistence',
        functionName: 'BookmarksStore.constructor',
      });
    }

    if ('setKeysForSync' in globalState && typeof globalState.setKeysForSync === 'function') {
      globalState.setKeysForSync([STORAGE_KEY]);
      this.syncEnabled = true;
      this.logger.debug(
        { fn: 'BookmarksStore.constructor', syncEnabled: true },
        'Settings Sync enabled for bookmarks',
      );
    } else {
      this.syncEnabled = false;
      this.logger.warn(
        { fn: 'BookmarksStore.constructor', syncEnabled: false },
        'Settings Sync not available - bookmarks will only be stored locally',
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

  private generateUniqueId(existingIds: Set<BookmarkId>): BookmarkId {
    for (let attempt = 1; attempt <= MAX_ID_GENERATION_RETRIES; attempt++) {
      const id = this.idGenerator();
      if (!existingIds.has(id)) {
        return id;
      }
      this.logger.debug(
        { fn: 'BookmarksStore.generateUniqueId', attempt, collidingId: id },
        'ID collision detected, generating new ID',
      );
    }
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.BOOKMARK_ID_GENERATION_FAILED,
      message: `Failed to generate unique bookmark ID after ${MAX_ID_GENERATION_RETRIES} attempts`,
      functionName: 'BookmarksStore.generateUniqueId',
    });
  }

  /**
   * Creates a new bookmark with generated id, createdAt, and accessCount=0.
   */
  async add(input: BookmarkInput): Promise<Result<Bookmark, RangeLinkExtensionError>> {
    try {
      const data = this.load();
      const existingIds = new Set(data.bookmarks.map((b) => b.id));
      const bookmark: Bookmark = {
        id: this.generateUniqueId(existingIds),
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
        { fn: 'BookmarksStore.add', bookmark, syncEnabled: this.syncEnabled },
        `Added bookmark: ${bookmark.label}`,
      );

      return Result.ok(bookmark);
    } catch (error) {
      if (error instanceof RangeLinkExtensionError) {
        return Result.err(error);
      }
      return Result.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.BOOKMARK_SAVE_FAILED,
          message: 'Unexpected error while adding bookmark',
          functionName: 'BookmarksStore.add',
          cause: error instanceof Error ? error : undefined,
        }),
      );
    }
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
  async update(
    id: BookmarkId,
    updates: BookmarkUpdate,
  ): Promise<Result<Bookmark, RangeLinkExtensionError>> {
    try {
      const data = this.load();
      const index = this.findBookmarkIndex(data, id, 'update');

      if (index === -1) {
        return Result.err(
          new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.BOOKMARK_NOT_FOUND,
            message: `Cannot update bookmark: not found`,
            functionName: 'BookmarksStore.update',
            details: { bookmarkId: id },
          }),
        );
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
        {
          fn: 'BookmarksStore.update',
          bookmarkId: id,
          originalBookmark: bookmark,
          updates,
          updatedBookmark: updated,
          syncEnabled: this.syncEnabled,
        },
        `Updated bookmark: ${updated.label}`,
      );

      return Result.ok(updated);
    } catch (error) {
      if (error instanceof RangeLinkExtensionError) {
        return Result.err(error);
      }
      return Result.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.BOOKMARK_SAVE_FAILED,
          message: 'Unexpected error while updating bookmark',
          functionName: 'BookmarksStore.update',
          cause: error instanceof Error ? error : undefined,
        }),
      );
    }
  }

  /**
   * Removes a bookmark by its id.
   */
  async remove(id: BookmarkId): Promise<Result<void, RangeLinkExtensionError>> {
    try {
      const data = this.load();
      const index = this.findBookmarkIndex(data, id, 'remove');

      if (index === -1) {
        return Result.err(
          new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.BOOKMARK_NOT_FOUND,
            message: `Cannot remove bookmark: not found`,
            functionName: 'BookmarksStore.remove',
            details: { bookmarkId: id },
          }),
        );
      }

      const [removed] = data.bookmarks.splice(index, 1);
      await this.save(data, 'remove');

      this.logger.debug(
        { fn: 'BookmarksStore.remove', removedBookmark: removed, syncEnabled: this.syncEnabled },
        `Removed bookmark: ${removed.label}`,
      );

      return Result.ok(undefined);
    } catch (error) {
      if (error instanceof RangeLinkExtensionError) {
        return Result.err(error);
      }
      return Result.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.BOOKMARK_SAVE_FAILED,
          message: 'Unexpected error while removing bookmark',
          functionName: 'BookmarksStore.remove',
          cause: error instanceof Error ? error : undefined,
        }),
      );
    }
  }

  /**
   * Records an access to a bookmark, updating lastAccessedAt and incrementing accessCount.
   */
  async recordAccess(id: BookmarkId): Promise<Result<void, RangeLinkExtensionError>> {
    try {
      const data = this.load();
      const index = this.findBookmarkIndex(data, id, 'recordAccess');

      if (index === -1) {
        return Result.err(
          new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.BOOKMARK_NOT_FOUND,
            message: `Cannot record access: bookmark not found`,
            functionName: 'BookmarksStore.recordAccess',
            details: { bookmarkId: id },
          }),
        );
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
        { fn: 'BookmarksStore.recordAccess', updatedBookmark, syncEnabled: this.syncEnabled },
        `Recorded access for bookmark: ${updatedBookmark.label}`,
      );

      return Result.ok(undefined);
    } catch (error) {
      if (error instanceof RangeLinkExtensionError) {
        return Result.err(error);
      }
      return Result.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.BOOKMARK_SAVE_FAILED,
          message: 'Unexpected error while recording bookmark access',
          functionName: 'BookmarksStore.recordAccess',
          cause: error instanceof Error ? error : undefined,
        }),
      );
    }
  }

  private load(): BookmarksStoreData {
    const raw = this.globalState.get<unknown>(STORAGE_KEY);
    return this.migrate(raw);
  }

  private async save(data: BookmarksStoreData, operation: string): Promise<void> {
    try {
      await this.globalState.update(STORAGE_KEY, data);
    } catch (error) {
      this.logger.error(
        { fn: `BookmarksStore.${operation}`, error, syncEnabled: this.syncEnabled },
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
