/**
 * AI Assistant detection utilities.
 *
 * Provides functions for detecting availability of various AI assistants
 * in the VS Code environment:
 * - GitHub Copilot Chat (built-in or extension)
 * - Cursor IDE (VS Code fork)
 * - Claude Code (Anthropic extension)
 */

export * from './isClaudeCodeAvailable';
export * from './isCursorIDEDetected';
export * from './isGitHubCopilotChatAvailable';
