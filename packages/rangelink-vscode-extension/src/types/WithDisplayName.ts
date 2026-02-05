/**
 * Shared interface for items with a display name.
 * The displayName is the raw name (e.g., "Claude Code Chat", "Terminal \"bash\"").
 * Consumers add indentation/icons as needed.
 */
export interface WithDisplayName {
  readonly displayName: string;
}
