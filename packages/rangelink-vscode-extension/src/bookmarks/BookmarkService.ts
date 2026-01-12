import type { Logger } from 'barebone-logger';

import type { ConfigReader } from '../config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_BOOKMARK,
  SETTING_SMART_PADDING_PASTE_BOOKMARK,
} from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { ExtensionResult } from '../types';

import type { BookmarksStore } from './BookmarksStore';
import type { Bookmark, BookmarkId, BookmarkInput } from './types';

/**
 * Service layer for bookmark operations.
 *
 * Encapsulates bookmark data access and destination pasting,
 * allowing presentation components to work with a higher-level abstraction.
 */
export class BookmarkService {
  constructor(
    private readonly bookmarksStore: BookmarksStore,
    private readonly ideAdapter: VscodeAdapter,
    private readonly configReader: ConfigReader,
    private readonly destinationManager: PasteDestinationManager,
    private readonly logger: Logger,
  ) {
    this.logger.debug({ fn: 'BookmarkService.constructor' }, 'BookmarkService initialized');
  }

  /**
   * Get all bookmarks.
   */
  getAllBookmarks(): Bookmark[] {
    return this.bookmarksStore.getAll();
  }

  /**
   * Check if any bookmarks exist.
   */
  hasBookmarks(): boolean {
    return this.bookmarksStore.getAll().length > 0;
  }

  /**
   * Add a new bookmark.
   *
   * @param input - The bookmark data (label, link, optional description/scope)
   */
  async addBookmark(input: BookmarkInput): Promise<ExtensionResult<Bookmark>> {
    return this.bookmarksStore.add(input);
  }

  /**
   * Remove a bookmark by ID.
   *
   * @param id - The ID of the bookmark to remove
   * @returns The deleted bookmark on success
   */
  async removeBookmark(id: BookmarkId): Promise<ExtensionResult<Bookmark>> {
    return this.bookmarksStore.remove(id);
  }

  /**
   * Paste a bookmark's link to clipboard and bound destination (if any).
   *
   * - Records access (updates lastAccessedAt, accessCount)
   * - Copies link to clipboard
   * - If destination bound: sends to destination with smart padding
   * - If no destination: clipboard only
   *
   * @param bookmarkId - The ID of the bookmark to paste
   */
  async pasteBookmark(bookmarkId: BookmarkId): Promise<void> {
    const logCtx = { fn: 'BookmarkService.pasteBookmark', bookmarkId };

    const bookmark = this.bookmarksStore.getById(bookmarkId);
    if (!bookmark) {
      this.logger.warn(logCtx, 'Bookmark not found');
      return;
    }

    await this.bookmarksStore.recordAccess(bookmarkId);
    await this.ideAdapter.writeTextToClipboard(bookmark.link);

    if (this.destinationManager.isBound()) {
      const paddingMode = this.configReader.getPaddingMode(
        SETTING_SMART_PADDING_PASTE_BOOKMARK,
        DEFAULT_SMART_PADDING_PASTE_BOOKMARK,
      );
      await this.destinationManager.sendTextToDestination(
        bookmark.link,
        `Bookmark pasted: ${bookmark.label}`,
        paddingMode,
      );
      this.logger.debug(
        { ...logCtx, bookmark, pastedToDestination: true },
        `Pasted bookmark to destination: ${bookmark.label}`,
      );
    } else {
      this.logger.debug(
        { ...logCtx, bookmark, pastedToDestination: false },
        `Copied bookmark to clipboard (no destination bound): ${bookmark.label}`,
      );
    }
  }
}
