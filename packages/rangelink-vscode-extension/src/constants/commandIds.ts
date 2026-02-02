/**
 * Single source of truth for command IDs for all RangeLink extension commands.
 *
 * Keep entries sorted alphabetically by constant name.
 */

export const CMD_BIND_TO_CLAUDE_CODE = 'rangelink.bindToClaudeCode';
export const CMD_BIND_TO_CURSOR_AI = 'rangelink.bindToCursorAI';
export const CMD_BIND_TO_GITHUB_COPILOT_CHAT = 'rangelink.bindToGitHubCopilotChat';
export const CMD_BIND_TO_TERMINAL = 'rangelink.bindToTerminal';
export const CMD_BIND_TO_TERMINAL_HERE = 'rangelink.bindToTerminalHere';
export const CMD_BIND_TO_TEXT_EDITOR = 'rangelink.bindToTextEditor';
export const CMD_BIND_TO_TEXT_EDITOR_HERE = 'rangelink.bindToTextEditorHere';
export const CMD_BOOKMARK_ADD = 'rangelink.bookmark.add';
export const CMD_BOOKMARK_LIST = 'rangelink.bookmark.list';
export const CMD_BOOKMARK_MANAGE = 'rangelink.bookmark.manage';
export const CMD_BOOKMARK_NAVIGATE = 'rangelink.bookmark.navigate';
export const CMD_CONTEXT_EDITOR_CONTENT_BIND = 'rangelink.editorContent.bind';
export const CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH = 'rangelink.editorContent.pasteFilePath';
export const CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH =
  'rangelink.editorContent.pasteRelativeFilePath';
export const CMD_CONTEXT_EDITOR_CONTENT_UNBIND = 'rangelink.editorContent.unbind';
export const CMD_CONTEXT_EDITOR_COPY_LINK = 'rangelink.editorContext.copyLink';
export const CMD_CONTEXT_EDITOR_COPY_LINK_ABSOLUTE = 'rangelink.editorContext.copyLinkAbsolute';
export const CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK = 'rangelink.editorContext.copyPortableLink';
export const CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK_ABSOLUTE =
  'rangelink.editorContext.copyPortableLinkAbsolute';
export const CMD_CONTEXT_EDITOR_PASTE_SELECTED_TEXT = 'rangelink.editorContext.pasteSelectedText';
export const CMD_CONTEXT_EDITOR_SAVE_BOOKMARK = 'rangelink.editorContext.saveBookmark';
export const CMD_CONTEXT_EDITOR_TAB_PASTE_FILE_PATH = 'rangelink.editorTab.pasteFilePath';
export const CMD_CONTEXT_EDITOR_TAB_PASTE_RELATIVE_FILE_PATH =
  'rangelink.editorTab.pasteRelativeFilePath';
export const CMD_CONTEXT_EXPLORER_PASTE_FILE_PATH = 'rangelink.explorer.pasteFilePath';
export const CMD_CONTEXT_EXPLORER_PASTE_RELATIVE_FILE_PATH =
  'rangelink.explorer.pasteRelativeFilePath';
export const CMD_CONTEXT_TERMINAL_BIND = 'rangelink.terminal.bind';
export const CMD_CONTEXT_TERMINAL_UNBIND = 'rangelink.terminal.unbind';
export const CMD_COPY_LINK_ABSOLUTE = 'rangelink.copyLinkWithAbsolutePath';
export const CMD_COPY_LINK_ONLY_ABSOLUTE = 'rangelink.copyLinkOnlyWithAbsolutePath';
export const CMD_COPY_LINK_ONLY_RELATIVE = 'rangelink.copyLinkOnlyWithRelativePath';
export const CMD_COPY_LINK_RELATIVE = 'rangelink.copyLinkWithRelativePath';
export const CMD_COPY_PORTABLE_LINK_ABSOLUTE = 'rangelink.copyPortableLinkWithAbsolutePath';
export const CMD_COPY_PORTABLE_LINK_RELATIVE = 'rangelink.copyPortableLinkWithRelativePath';
export const CMD_GO_TO_RANGELINK = 'rangelink.goToRangeLink';
export const CMD_HANDLE_DOCUMENT_LINK_CLICK = 'rangelink.handleDocumentLinkClick';
export const CMD_JUMP_TO_DESTINATION = 'rangelink.jumpToBoundDestination';
export const CMD_OPEN_STATUS_BAR_MENU = 'rangelink.openStatusBarMenu';
export const CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE = 'rangelink.pasteCurrentFileAbsolutePath';
export const CMD_PASTE_CURRENT_FILE_PATH_RELATIVE = 'rangelink.pasteCurrentFileRelativePath';
export const CMD_PASTE_FILE_PATH_ABSOLUTE = 'rangelink.pasteFileAbsolutePath';
export const CMD_PASTE_FILE_PATH_RELATIVE = 'rangelink.pasteFileRelativePath';
export const CMD_PASTE_TO_DESTINATION = 'rangelink.pasteSelectedTextToDestination';
export const CMD_SHOW_VERSION = 'rangelink.showVersion';
export const CMD_UNBIND_DESTINATION = 'rangelink.unbindDestination';

// Keep entries sorted alphabetically by constant name.

/**
 * Union type of all RangeLink command IDs.
 * Derived from the individual constants for strong typing.
 */
export type RangeLinkCommandId =
  | typeof CMD_BIND_TO_CLAUDE_CODE
  | typeof CMD_BIND_TO_CURSOR_AI
  | typeof CMD_BIND_TO_GITHUB_COPILOT_CHAT
  | typeof CMD_BIND_TO_TERMINAL
  | typeof CMD_BIND_TO_TERMINAL_HERE
  | typeof CMD_BIND_TO_TEXT_EDITOR
  | typeof CMD_BIND_TO_TEXT_EDITOR_HERE
  | typeof CMD_BOOKMARK_ADD
  | typeof CMD_BOOKMARK_LIST
  | typeof CMD_BOOKMARK_MANAGE
  | typeof CMD_BOOKMARK_NAVIGATE
  | typeof CMD_CONTEXT_EDITOR_CONTENT_BIND
  | typeof CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH
  | typeof CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH
  | typeof CMD_CONTEXT_EDITOR_CONTENT_UNBIND
  | typeof CMD_CONTEXT_EDITOR_COPY_LINK
  | typeof CMD_CONTEXT_EDITOR_COPY_LINK_ABSOLUTE
  | typeof CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK
  | typeof CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK_ABSOLUTE
  | typeof CMD_CONTEXT_EDITOR_PASTE_SELECTED_TEXT
  | typeof CMD_CONTEXT_EDITOR_SAVE_BOOKMARK
  | typeof CMD_CONTEXT_EDITOR_TAB_PASTE_FILE_PATH
  | typeof CMD_CONTEXT_EDITOR_TAB_PASTE_RELATIVE_FILE_PATH
  | typeof CMD_CONTEXT_EXPLORER_PASTE_FILE_PATH
  | typeof CMD_CONTEXT_EXPLORER_PASTE_RELATIVE_FILE_PATH
  | typeof CMD_CONTEXT_TERMINAL_BIND
  | typeof CMD_CONTEXT_TERMINAL_UNBIND
  | typeof CMD_COPY_LINK_ABSOLUTE
  | typeof CMD_COPY_LINK_ONLY_ABSOLUTE
  | typeof CMD_COPY_LINK_ONLY_RELATIVE
  | typeof CMD_COPY_LINK_RELATIVE
  | typeof CMD_COPY_PORTABLE_LINK_ABSOLUTE
  | typeof CMD_COPY_PORTABLE_LINK_RELATIVE
  | typeof CMD_GO_TO_RANGELINK
  | typeof CMD_HANDLE_DOCUMENT_LINK_CLICK
  | typeof CMD_JUMP_TO_DESTINATION
  | typeof CMD_OPEN_STATUS_BAR_MENU
  | typeof CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE
  | typeof CMD_PASTE_CURRENT_FILE_PATH_RELATIVE
  | typeof CMD_PASTE_FILE_PATH_ABSOLUTE
  | typeof CMD_PASTE_FILE_PATH_RELATIVE
  | typeof CMD_PASTE_TO_DESTINATION
  | typeof CMD_SHOW_VERSION
  | typeof CMD_UNBIND_DESTINATION;
