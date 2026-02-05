/**
 * All supported paste destination kind identifiers
 *
 * Single source of truth - DestinationKind is derived from this array.
 * Keep in alphabetical order for maintainability.
 */
export const DESTINATION_KINDS = [
  'claude-code',
  'cursor-ai',
  'github-copilot-chat',
  'terminal',
  'text-editor',
] as const;

/**
 * Supported paste destination kinds (derived from DESTINATION_KINDS array)
 */
export type DestinationKind = (typeof DESTINATION_KINDS)[number];

/**
 * AI assistant destination kind identifiers.
 *
 * Single source of truth - AIAssistantDestinationKind is derived from this array.
 * These destinations require extension availability checks rather than
 * resource binding (like terminal or text-editor).
 */
export const AI_ASSISTANT_KINDS = ['claude-code', 'cursor-ai', 'github-copilot-chat'] as const;

/**
 * AI assistant destination kinds (derived from AI_ASSISTANT_KINDS array)
 */
export type AIAssistantDestinationKind = (typeof AI_ASSISTANT_KINDS)[number];

/**
 * Non-terminal destination kinds (text-editor and AI assistants).
 * Terminal destinations use TerminalQuickPickItem which carries the terminal reference.
 */
export type NonTerminalDestinationKind = Exclude<DestinationKind, 'terminal'>;
