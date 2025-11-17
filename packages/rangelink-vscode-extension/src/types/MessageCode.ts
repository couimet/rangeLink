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
  // Keep the keys in alphabetical order.

  // Configuration messages (used in logging)
  CONFIG_LOADED = 'CONFIG_LOADED',
  CONFIG_USING_DEFAULTS = 'CONFIG_USING_DEFAULTS',

  // Information messages (user-facing UI)
  INFO_CLAUDE_CODE_USER_INSTRUCTIONS = 'INFO_CLAUDE_CODE_USER_INSTRUCTIONS',
  INFO_COMMIT_HASH_COPIED = 'INFO_COMMIT_HASH_COPIED',
  INFO_CURSOR_AI_USER_INSTRUCTIONS = 'INFO_CURSOR_AI_USER_INSTRUCTIONS',
  INFO_JUMP_FOCUS_FAILED = 'INFO_JUMP_FOCUS_FAILED',
  INFO_JUMP_NO_DESTINATION_BOUND = 'INFO_JUMP_NO_DESTINATION_BOUND',

  // Smart bind confirmation dialog (user-facing UI)
  SMART_BIND_CONFIRM_NO_DESCRIPTION = 'SMART_BIND_CONFIRM_NO_DESCRIPTION',
  SMART_BIND_CONFIRM_NO_KEEP = 'SMART_BIND_CONFIRM_NO_KEEP',
  SMART_BIND_CONFIRM_PLACEHOLDER = 'SMART_BIND_CONFIRM_PLACEHOLDER',
  SMART_BIND_CONFIRM_YES_DESCRIPTION = 'SMART_BIND_CONFIRM_YES_DESCRIPTION',
  SMART_BIND_CONFIRM_YES_REPLACE = 'SMART_BIND_CONFIRM_YES_REPLACE',

  // Status bar messages (user-facing UI)
  STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE = 'STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE',
  STATUS_BAR_JUMP_SUCCESS_CURSOR_AI = 'STATUS_BAR_JUMP_SUCCESS_CURSOR_AI',
  STATUS_BAR_JUMP_SUCCESS_EDITOR = 'STATUS_BAR_JUMP_SUCCESS_EDITOR',
  STATUS_BAR_JUMP_SUCCESS_TERMINAL = 'STATUS_BAR_JUMP_SUCCESS_TERMINAL',
  STATUS_BAR_LINK_COPIED_TO_CLIPBOARD = 'STATUS_BAR_LINK_COPIED_TO_CLIPBOARD',

  // Keep the keys in alphabetical order.
}
