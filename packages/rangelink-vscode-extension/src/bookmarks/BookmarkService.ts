import type { Logger } from 'barebone-logger';

import type { ConfigReader } from '../config/ConfigReader';
import {
  DEFAULT_FEATURES_BOOKMARKS_ENABLED,
  DEFAULT_SMART_PADDING_PASTE_BOOKMARK,
  SETTING_FEATURES_BOOKMARKS_ENABLED,
  SETTING_SMART_PADDING_PASTE_BOOKMARK,
} from '../constants';
import type { PasteDestinationManager } from '../destinations';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
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
   * Whether bookmarks UI should be displayed (feature flag gate).
   * TODO: #366 remove when bookmarks graduates from beta
   */
  isVisible(): boolean {
    // TODO: #366 remove when bookmarks graduates from beta
    return this.configReader.getBoolean(
      SETTING_FEATURES_BOOKMARKS_ENABLED,
      DEFAULT_FEATURES_BOOKMARKS_ENABLED,
    );
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
   * Send a bookmark's link to the bound destination.
   *
   * - Records access (updates lastAccessedAt, accessCount)
   * - Copies link to clipboard
   * - Sends to bound destination with smart padding
   *
   * @param bookmarkId - The ID of the bookmark to send
   */
  async sendBookmark(bookmarkId: BookmarkId): Promise<void> {
    const logCtx = { fn: 'BookmarkService.sendBookmark', bookmarkId };

    // TODO #385: add clipboard preservation here when bookmarks are exposed
    if (!this.destinationManager.isBound()) {
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_BOUND,
        message: 'Cannot send bookmark: no destination is currently bound',
        functionName: 'BookmarkService.sendBookmark',
      });
    }

    const bookmark = this.bookmarksStore.getById(bookmarkId);
    if (!bookmark) {
      this.logger.warn(logCtx, 'Bookmark not found');
      return;
    }

    await this.bookmarksStore.recordAccess(bookmarkId);
    await this.ideAdapter.writeTextToClipboard(bookmark.link);

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
      { ...logCtx, bookmark },
      `Sent bookmark to destination: ${bookmark.label}`,
    );
  }
}
