/**
 * Message codes for VSCode extension UI messages and structured logging.
 * Extension-only i18n system - core layer stays English for technical messages.
 *
 * Values match keys for clarity in logs and i18n mapping.
 *
 * Architecture: Following Option D (Extension-Only i18n) where:
 * - Core layer: Hardcoded English (industry standard for technical messages)
 * - Extension layer: Localized UI messages (this file)
 */
export enum MessageCode {
  // Configuration messages (used in logging)
  CONFIG_LOADED = 'CONFIG_LOADED',
  CONFIG_USING_DEFAULTS = 'CONFIG_USING_DEFAULTS',

  // Status bar messages (user-facing UI)
  STATUS_BAR_LINK_COPIED_TO_CLIPBOARD = 'STATUS_BAR_LINK_COPIED_TO_CLIPBOARD',

  // Information messages (user-facing UI)
  INFO_CLAUDE_CODE_LINK_COPIED = 'INFO_CLAUDE_CODE_LINK_COPIED',
  INFO_CURSOR_AI_LINK_COPIED = 'INFO_CURSOR_AI_LINK_COPIED',
  INFO_COMMIT_HASH_COPIED = 'INFO_COMMIT_HASH_COPIED',
}
