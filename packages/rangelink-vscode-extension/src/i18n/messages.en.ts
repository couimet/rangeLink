import { MessageCode } from '../types/MessageCode';

/**
 * English message templates for VSCode extension.
 * Uses {paramName} syntax for dynamic values.
 */
export const messagesEn: Record<MessageCode, string> = {
  // Keep the keys in alphabetical order.

  [MessageCode.ALREADY_BOUND_TO_DESTINATION]: 'RangeLink: Already bound to {destinationName}',
  [MessageCode.BOOKMARK_ACTION_ADD]: '$(add) Save Selection as Bookmark',
  [MessageCode.BOOKMARK_ACTION_MANAGE]: '$(gear) Manage Bookmarks...',
  [MessageCode.BOOKMARK_LIST_EMPTY]: 'No bookmarks saved',
  [MessageCode.BOOKMARK_LIST_PLACEHOLDER]: 'Select a bookmark to paste to destination',
  [MessageCode.BOOKMARK_LIST_TITLE]: 'Bookmarks',
  [MessageCode.BOOKMARK_MANAGE_CONFIRM_DELETE]: 'Delete bookmark "{label}"?',
  [MessageCode.BOOKMARK_MANAGE_CONFIRM_DELETE_CANCEL]: 'Cancel',
  [MessageCode.BOOKMARK_MANAGE_CONFIRM_DELETE_YES]: 'Delete',
  [MessageCode.BOOKMARK_MANAGE_DELETED]: '✓ Bookmark deleted: {label}',
  [MessageCode.BOOKMARK_MANAGE_EMPTY]: 'No bookmarks to manage',
  [MessageCode.BOOKMARK_MANAGE_ERROR_DELETE_FAILED]: 'RangeLink: Failed to delete bookmark',
  [MessageCode.BOOKMARK_MANAGE_PLACEHOLDER]: 'Select a bookmark to manage',
  [MessageCode.BOOKMARK_MANAGE_TITLE]: 'Manage Bookmarks',
  [MessageCode.BOUND_EDITOR_CLOSED_AUTO_UNBOUND]: 'RangeLink: Bound editor closed. Unbound.',

  [MessageCode.CONFIG_LOADED]: 'Configuration loaded',
  [MessageCode.CONFIG_USING_DEFAULTS]: 'Using default configuration',

  [MessageCode.ERROR_BOOKMARK_EMPTY_LABEL]: 'RangeLink: Bookmark label cannot be empty',
  [MessageCode.ERROR_BOOKMARK_LINK_GENERATION_FAILED]:
    'RangeLink: Cannot add bookmark - failed to generate link from selection',
  [MessageCode.ERROR_BOOKMARK_NO_ACTIVE_EDITOR]:
    'RangeLink: Cannot add bookmark - no active editor',
  [MessageCode.ERROR_BOOKMARK_SAVE_FAILED]: 'RangeLink: Failed to save bookmark',
  [MessageCode.ERROR_BOOKMARK_UNTITLED_FILE]:
    'RangeLink: Cannot bookmark unsaved file. Save the file first, or select an existing RangeLink to bookmark.',
  [MessageCode.ERROR_CLAUDE_CODE_NOT_AVAILABLE]:
    'RangeLink: Cannot bind Claude Code - extension not installed or not active',
  [MessageCode.ERROR_CURSOR_AI_NOT_AVAILABLE]:
    'RangeLink: Cannot bind Cursor AI Assistant - not running in Cursor IDE',
  [MessageCode.ERROR_GITHUB_COPILOT_CHAT_NOT_AVAILABLE]:
    'RangeLink: Cannot bind GitHub Copilot Chat - extension not installed or not active',
  [MessageCode.ERROR_LINK_GENERATION_FAILED]: 'RangeLink: Failed to generate {linkTypeName}',
  [MessageCode.ERROR_NAVIGATION_FAILED]: 'RangeLink: Failed to navigate to {path}: {error}',
  [MessageCode.ERROR_NO_ACTIVE_TERMINAL]:
    'RangeLink: No active terminal. Open a terminal and try again.',
  [MessageCode.ERROR_NO_ACTIVE_TEXT_EDITOR]:
    'RangeLink: No active text editor. Open a file and try again.',
  [MessageCode.ERROR_TEXT_EDITOR_BINARY_FILE]: 'RangeLink: Cannot bind to {fileName} - binary file',
  [MessageCode.ERROR_TEXT_EDITOR_READ_ONLY]:
    'RangeLink: Cannot bind to read-only editor ({scheme})',
  [MessageCode.ERROR_TEXT_EDITOR_REQUIRES_SPLIT]:
    'RangeLink: Text editor binding requires split editor (2+ tab groups). Split your editor and try again.',

  [MessageCode.INFO_CLAUDE_CODE_NOT_AVAILABLE]:
    'RangeLink can seamlessly integrate with Claude Code for faster context sharing of precise code ranges.\n\nInstall and activate the Claude Code extension to use it as a paste destination.',
  [MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS]:
    'Paste (Cmd/Ctrl+V) in Claude Code chat to use.',
  [MessageCode.INFO_COMMIT_HASH_COPIED]: 'Commit hash copied to clipboard',
  [MessageCode.INFO_CURSOR_AI_NOT_AVAILABLE]:
    'This command is designed for Cursor IDE, which has built-in AI chat.\n\nRangeLink can paste code ranges directly into Cursor AI chat for faster context sharing. To use this feature, open your project in Cursor IDE instead of VS Code.',
  [MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS]: 'Paste (Cmd/Ctrl+V) in Cursor chat to use.',
  [MessageCode.INFO_GITHUB_COPILOT_CHAT_NOT_AVAILABLE]:
    'RangeLink can seamlessly integrate with GitHub Copilot Chat for faster context sharing of precise code ranges.\n\nInstall and activate the GitHub Copilot Chat extension to use it as a paste destination.',
  [MessageCode.INFO_GITHUB_COPILOT_CHAT_USER_INSTRUCTIONS]:
    'Paste (Cmd/Ctrl+V) in GitHub Copilot chat to use.',
  [MessageCode.INFO_JUMP_FOCUS_FAILED]: 'RangeLink: Failed to focus {destinationName}',
  [MessageCode.INFO_JUMP_NO_DESTINATIONS_AVAILABLE]:
    'No destinations available. Open a terminal, split editor, or install an AI assistant extension.',
  [MessageCode.INFO_JUMP_QUICK_PICK_PLACEHOLDER]:
    'No destination bound. Choose destination to jump to:',
  [MessageCode.INFO_NAVIGATION_SUCCESS]: 'RangeLink: Navigated to {path} @ {position}',
  [MessageCode.INFO_PASTE_CONTENT_NO_DESTINATIONS_AVAILABLE]:
    'No destinations available. Open a terminal, split editor, or install an AI assistant extension.',
  [MessageCode.INFO_PASTE_CONTENT_QUICK_PICK_DESTINATIONS_CHOOSE_BELOW]:
    'No bound destination. Choose below to bind and paste:',

  [MessageCode.SMART_BIND_CONFIRM_NO_DESCRIPTION]: 'Stay bound to {currentDestination}',
  [MessageCode.SMART_BIND_CONFIRM_NO_KEEP]: 'No, keep current binding',
  [MessageCode.SMART_BIND_CONFIRM_PLACEHOLDER]:
    'Already bound to {currentDestination}. Replace with {newDestination}?',
  [MessageCode.SMART_BIND_CONFIRM_YES_DESCRIPTION]:
    'Switch from {currentDestination} to {newDestination}',
  [MessageCode.SMART_BIND_CONFIRM_YES_REPLACE]: 'Yes, replace',

  [MessageCode.STATUS_BAR_DESTINATION_BINDING_REMOVED_TERMINAL_CLOSED]:
    'Destination binding removed (terminal closed)',
  [MessageCode.STATUS_BAR_DESTINATION_BOUND]: '✓ RangeLink bound to {destinationName}',
  [MessageCode.STATUS_BAR_DESTINATION_NOT_BOUND]: 'RangeLink: No destination bound',
  [MessageCode.STATUS_BAR_DESTINATION_REBOUND]:
    'Unbound {previousDestination}, now bound to {newDestination}',
  [MessageCode.STATUS_BAR_DESTINATION_UNBOUND]: '✓ RangeLink unbound from {destinationName}',
  [MessageCode.STATUS_BAR_ITEM_TEXT]: '$(link) RangeLink',
  [MessageCode.STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE]: '✓ Focused Claude Code Chat',
  [MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI]: '✓ Focused Cursor AI Assistant',
  [MessageCode.STATUS_BAR_JUMP_SUCCESS_EDITOR]: '✓ Focused Editor: "{resourceName}"',
  [MessageCode.STATUS_BAR_JUMP_SUCCESS_GITHUB_COPILOT_CHAT]: '✓ Focused GitHub Copilot Chat',
  [MessageCode.STATUS_BAR_JUMP_SUCCESS_TERMINAL]: '✓ Focused Terminal: "{resourceName}"',
  [MessageCode.STATUS_BAR_BOOKMARK_SAVED]: '✓ Bookmark saved: {label}',
  [MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD]: '✓ {linkTypeName} copied to clipboard',
  [MessageCode.STATUS_BAR_MENU_BOOKMARKS_SECTION_LABEL]: 'Bookmarks',
  [MessageCode.STATUS_BAR_MENU_DESTINATIONS_CHOOSE_BELOW]:
    'No bound destination. Choose below to bind:',
  [MessageCode.STATUS_BAR_MENU_DESTINATIONS_NONE_AVAILABLE]: 'No destinations available',
  [MessageCode.STATUS_BAR_MENU_ITEM_JUMP_ENABLED_LABEL]: '$(arrow-right) Jump to Bound Destination',
  [MessageCode.STATUS_BAR_MENU_ITEM_VERSION_INFO_LABEL]: '$(info) Show Version Info',
  [MessageCode.STATUS_BAR_MENU_PLACEHOLDER]: 'Select an action',
  [MessageCode.STATUS_BAR_MENU_TITLE]: 'RangeLink',
  [MessageCode.STATUS_BAR_MENU_TOOLTIP]: 'RangeLink Menu',

  [MessageCode.WARN_NAVIGATION_FILE_NOT_FOUND]: 'RangeLink: Cannot find file: {path}',
  [MessageCode.WARN_NAVIGATION_UNTITLED_FILE]:
    'RangeLink: Cannot navigate to unsaved file ({path}). Save the file first, then try again.',

  // Keep the keys in alphabetical order.
};
