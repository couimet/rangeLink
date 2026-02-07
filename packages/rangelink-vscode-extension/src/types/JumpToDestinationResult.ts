import type { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';

/**
 * Discriminator for all jump-to-destination result types.
 *
 * Each literal must appear in exactly one JumpToDestinationResult variant.
 * Variants use Extract<JumpToDestinationOutcome, 'x'> to ensure compile-time
 * failure if a literal is removed from this union.
 */
export type JumpToDestinationOutcome = 'focused' | 'no-resource' | 'cancelled' | 'focus-failed';

/**
 * Result of the jump-to-destination command.
 */
export type JumpToDestinationResult =
  | { readonly outcome: Extract<JumpToDestinationOutcome, 'focused'>; readonly destinationName: string }
  | { readonly outcome: Extract<JumpToDestinationOutcome, 'no-resource'> }
  | { readonly outcome: Extract<JumpToDestinationOutcome, 'cancelled'> }
  | { readonly outcome: Extract<JumpToDestinationOutcome, 'focus-failed'>; readonly error: RangeLinkExtensionError };
