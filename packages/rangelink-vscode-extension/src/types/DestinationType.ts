/**
 * All supported paste destination type identifiers
 *
 * Single source of truth - DestinationType is derived from this array.
 * Keep in alphabetical order for maintainability.
 */
export const DESTINATION_TYPES = [
  'claude-code',
  'cursor-ai',
  'github-copilot-chat',
  'terminal',
  'text-editor',
] as const;

/**
 * Supported paste destination types (derived from DESTINATION_TYPES array)
 */
export type DestinationType = (typeof DESTINATION_TYPES)[number];

/**
 * AI assistant destination type identifiers.
 *
 * Single source of truth - AIAssistantDestinationType is derived from this array.
 * These destinations require extension availability checks rather than
 * resource binding (like terminal or text-editor).
 */
export const AI_ASSISTANT_TYPES = ['claude-code', 'cursor-ai', 'github-copilot-chat'] as const;

/**
 * AI assistant destination types (derived from AI_ASSISTANT_TYPES array)
 */
export type AIAssistantDestinationType = (typeof AI_ASSISTANT_TYPES)[number];

/**
 * Non-terminal destination types (text-editor and AI assistants).
 * Terminal destinations use TerminalQuickPickItem which carries the terminal reference.
 */
export type NonTerminalDestinationType = Exclude<DestinationType, 'terminal'>;
