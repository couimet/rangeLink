import type { BindSuccessInfo } from '../destinations';
import type { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';

/**
 * Discriminator for all quick pick bind result types.
 *
 * Each literal must appear in exactly one QuickPickBindResult variant.
 * Variants use Extract<QuickPickBindOutcome, 'x'> to ensure compile-time
 * failure if a literal is removed from this union.
 */
export type QuickPickBindOutcome = 'bound' | 'no-resource' | 'cancelled' | 'bind-failed';

/**
 * Result of showing quick pick for destination binding.
 *
 * Represents the distinct outcomes when a user is prompted to choose
 * a destination to bind to (used by both Jump and Paste flows).
 */
export type QuickPickBindResult =
  | { readonly outcome: Extract<QuickPickBindOutcome, 'bound'>; readonly bindInfo: BindSuccessInfo }
  | { readonly outcome: Extract<QuickPickBindOutcome, 'no-resource'> }
  | { readonly outcome: Extract<QuickPickBindOutcome, 'cancelled'> }
  | {
      readonly outcome: Extract<QuickPickBindOutcome, 'bind-failed'>;
      readonly error: RangeLinkExtensionError;
    };
