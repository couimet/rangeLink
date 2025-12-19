/**
 * Scope of a bookmark - determines storage location.
 * Currently only 'global' is supported; 'workspace' is reserved for future use.
 */
export type BookmarkScope = 'global';

/**
 * Function that generates unique identifiers for bookmarks.
 */
export type IdGenerator = () => string;

/**
 * Function that generates ISO 8601 timestamps.
 */
export type TimestampGenerator = () => string;

/**
 * A saved bookmark to a code location
 */
export interface Bookmark {
  /** Unique identifier for stable references */
  readonly id: string;
  /** User-friendly name (e.g., "CLAUDE.md Instructions") */
  readonly label: string;
  /** Full RangeLink (absolute path + range) */
  readonly link: string;
  /** Optional notes */
  readonly description?: string;
  /** Bookmark scope - global (cross-workspace) or workspace-specific */
  readonly scope: BookmarkScope;
  /** ISO timestamp when created */
  readonly createdAt: string;
  /** ISO timestamp of last navigation (for sorting by recent use) */
  readonly lastAccessedAt?: string;
  /** Navigation count (for sorting by frequency) */
  readonly accessCount: number;
}

/**
 * Input for creating a new bookmark (generated fields omitted)
 */
export type BookmarkInput = Pick<Bookmark, 'label' | 'link'> &
  Partial<Pick<Bookmark, 'description' | 'scope'>>;

/**
 * Fields that can be updated on an existing bookmark
 */
export type BookmarkUpdate = Partial<Pick<Bookmark, 'label' | 'link' | 'description'>>;

/**
 * Persisted data structure with version for migrations
 */
export interface BookmarksStoreData {
  version: 1;
  bookmarks: Bookmark[];
}
