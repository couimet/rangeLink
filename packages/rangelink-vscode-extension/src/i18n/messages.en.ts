import { MessageCode } from '../types/MessageCode';

/**
 * English message templates for VSCode extension.
 * Uses {paramName} syntax for dynamic values.
 */
export const messagesEn: Record<MessageCode, string> = {
  // Keep the keys in alphabetical order.

  [MessageCode.CONFIG_LOADED]: 'Configuration loaded',
  [MessageCode.CONFIG_USING_DEFAULTS]: 'Using default configuration',

  [MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS]:
    'Paste (Cmd/Ctrl+V) in Claude Code chat to use.',
  [MessageCode.INFO_COMMIT_HASH_COPIED]: 'Commit hash copied to clipboard',
  [MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS]: 'Paste (Cmd/Ctrl+V) in Cursor chat to use.',
  [MessageCode.INFO_JUMP_FOCUS_FAILED]: 'RangeLink: Failed to focus {destinationName}',
  [MessageCode.INFO_JUMP_NO_DESTINATION_BOUND]:
    'RangeLink: No destination bound. Bind a destination first.',

  [MessageCode.SMART_BIND_CONFIRM_NO_DESCRIPTION]: 'Stay bound to {currentDestination}',
  [MessageCode.SMART_BIND_CONFIRM_NO_KEEP]: 'No, keep current binding',
  [MessageCode.SMART_BIND_CONFIRM_PLACEHOLDER]:
    'Already bound to {currentDestination}. Replace with {newDestination}?',
  [MessageCode.SMART_BIND_CONFIRM_YES_DESCRIPTION]:
    'Switch from {currentDestination} to {newDestination}',
  [MessageCode.SMART_BIND_CONFIRM_YES_REPLACE]: 'Yes, replace',

  [MessageCode.STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE]: '✓ Focused Claude Code Chat',
  [MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI]: '✓ Focused Cursor AI Assistant',
  [MessageCode.STATUS_BAR_JUMP_SUCCESS_EDITOR]: '✓ Focused Editor: {editorDisplayName}',
  [MessageCode.STATUS_BAR_JUMP_SUCCESS_TERMINAL]: '✓ Focused Terminal: {terminalName}',
  [MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD]: '✓ {linkTypeName} copied to clipboard',

  // Keep the keys in alphabetical order.
};
