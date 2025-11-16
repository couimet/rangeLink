import { MessageCode } from '../types/MessageCode';

/**
 * English message templates for VSCode extension.
 * Uses {paramName} syntax for dynamic values.
 */
export const messagesEn: Record<MessageCode, string> = {
  // Keep the keys in alphabetical order.

  [MessageCode.CONFIG_LOADED]: 'Configuration loaded',
  [MessageCode.CONFIG_USING_DEFAULTS]: 'Using default configuration',

  [MessageCode.INFO_CLAUDE_CODE_LINK_COPIED]:
    'RangeLink copied to clipboard. Paste (Cmd/Ctrl+V) in Claude Code chat to use.',
  [MessageCode.INFO_CURSOR_AI_LINK_COPIED]:
    'RangeLink copied to clipboard. Paste (Cmd/Ctrl+V) in Cursor chat to use.',
  [MessageCode.INFO_COMMIT_HASH_COPIED]: 'Commit hash copied to clipboard',

  [MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD]: '✓ {linkTypeName} copied to clipboard',

  // Keep the keys in alphabetical order.
};
