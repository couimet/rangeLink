import type { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';

/**
 * Result of showing quick pick for destination binding.
 *
 * Represents the distinct outcomes when a user is prompted to choose
 * a destination to bind to (used by both Jump and Paste flows).
 */
export type QuickPickBindResult =
  | { readonly outcome: 'bound' }
  | { readonly outcome: 'no-destinations' }
  | { readonly outcome: 'cancelled' }
  | { readonly outcome: 'bind-failed'; readonly error: RangeLinkExtensionError };
