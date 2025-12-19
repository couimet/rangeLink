import type { Logger } from 'barebone-logger';
import { nanoid } from 'nanoid';
import type * as vscode from 'vscode';

import type { Bookmark, BookmarkInput, BookmarksStoreData, BookmarkUpdate } from './types';

const STORAGE_KEY = 'rangelink.bookmarks';

const createEmptyStoreData = (): BookmarksStoreData => ({ version: 1, bookmarks: [] });

export type IdGenerator = () => string;

const defaultIdGenerator: IdGenerator = nanoid;

type GlobalStateWithSync = vscode.Memento & {
  setKeysForSync?: (keys: readonly string[]) => void;
};

/**
 * Persists bookmarks using VSCode's globalState API.
 * Enables cross-workspace bookmark storage with Settings Sync support.
 */
export class BookmarksStore {
  private readonly generateId: IdGenerator;
  private readonly globalState: GlobalStateWithSync | undefined;

  constructor(
    globalState: GlobalStateWithSync | undefined,
    private readonly logger: Logger,
    idGenerator: IdGenerator = defaultIdGenerator,
  ) {
    this.generateId = idGenerator;
    this.globalState = globalState;

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

  /**
   * Creates a new bookmark with generated id, createdAt, and accessCount=0.
   * Defaults scope to 'global' if not specified.
   */
  add(input: BookmarkInput): Bookmark {
    const data = this.load();
    const bookmark: Bookmark = {
      id: this.generateId(),
      label: input.label,
      link: input.link,
      description: input.description,
      scope: input.scope ?? 'global',
      createdAt: new Date().toISOString(),
      accessCount: 0,
    };

    data.bookmarks.unshift(bookmark);
    void this.save(data);

    this.logger.debug(
      { fn: 'BookmarksStore.add', bookmarkId: bookmark.id, label: bookmark.label },
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
   * Finds a bookmark by its UUID.
   */
  getById(id: string): Bookmark | undefined {
    const data = this.load();
    return data.bookmarks.find((b) => b.id === id);
  }

  /**
   * Updates a bookmark's label, link, or description.
   * Returns the updated bookmark, or undefined if not found.
   */
  update(id: string, updates: BookmarkUpdate): Bookmark | undefined {
    const data = this.load();
    const index = data.bookmarks.findIndex((b) => b.id === id);

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
    void this.save(data);

    this.logger.debug(
      { fn: 'BookmarksStore.update', bookmarkId: id, updates },
      `Updated bookmark: ${updated.label}`,
    );

    return updated;
  }

  /**
   * Removes a bookmark by its UUID.
   * Returns true if removed, false if not found.
   */
  remove(id: string): boolean {
    const data = this.load();
    const index = data.bookmarks.findIndex((b) => b.id === id);

    if (index === -1) {
      return false;
    }

    const [removed] = data.bookmarks.splice(index, 1);
    void this.save(data);

    this.logger.debug(
      { fn: 'BookmarksStore.remove', bookmarkId: id, label: removed.label },
      `Removed bookmark: ${removed.label}`,
    );

    return true;
  }

  /**
   * Records an access to a bookmark, updating lastAccessedAt and incrementing accessCount.
   */
  recordAccess(id: string): void {
    const data = this.load();
    const index = data.bookmarks.findIndex((b) => b.id === id);

    if (index === -1) {
      return;
    }

    const bookmark = data.bookmarks[index];
    const updatedBookmark: Bookmark = {
      ...bookmark,
      lastAccessedAt: new Date().toISOString(),
      accessCount: bookmark.accessCount + 1,
    };

    data.bookmarks[index] = updatedBookmark;
    void this.save(data);

    this.logger.debug(
      {
        fn: 'BookmarksStore.recordAccess',
        bookmarkId: id,
        accessCount: updatedBookmark.accessCount,
      },
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

  private save(data: BookmarksStoreData): PromiseLike<void> {
    if (!this.globalState) {
      return Promise.resolve();
    }
    return this.globalState.update(STORAGE_KEY, data);
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
