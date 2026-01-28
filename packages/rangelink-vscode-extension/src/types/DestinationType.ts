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
 * AI assistant destination types (subset of DestinationType)
 *
 * These destinations require extension availability checks rather than
 * resource binding (like terminal or text-editor).
 */
export type AIAssistantDestinationType = Extract<
  DestinationType,
  'claude-code' | 'cursor-ai' | 'github-copilot-chat'
>;
