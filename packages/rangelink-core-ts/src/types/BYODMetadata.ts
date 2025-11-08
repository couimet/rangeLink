import { DelimiterConfig } from './DelimiterConfig';

/**
 * BYOD (Bring Your Own Delimiters) metadata extracted from portable links.
 *
 * Portable links embed delimiter configuration in the link itself, allowing
 * recipients to parse the link correctly regardless of their local configuration.
 *
 * Format: `path#L10-L20~#~L~-~` (line-only)
 * Format: `path#L10C5-L20C10~#~L~-~C~` (with positions)
 */
export interface BYODMetadata {
  /**
   * Extracted delimiter configuration from the link metadata.
   */
  delimiters: DelimiterConfig;

  /**
   * Whether the metadata includes a position delimiter (4-field format).
   * - true: Format is `~hash~line~range~position~`
   * - false: Format is `~hash~line~range~`
   */
  hasPosition: boolean;
}
