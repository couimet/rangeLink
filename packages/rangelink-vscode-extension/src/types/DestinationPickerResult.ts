import type { BindOptions } from './BindOptions';

/**
 * Discriminator for all destination picker result types.
 *
 * Each literal must appear in exactly one DestinationPickerResult variant.
 * Variants use Extract<DestinationPickerOutcome, 'x'> to ensure compile-time
 * failure if a literal is removed from this union.
 */
export type DestinationPickerOutcome = 'selected' | 'cancelled' | 'no-resource';

/**
 * Result of the destination picker command.
 * Returns the user's selection without performing any binding.
 *
 * Outcome values align with BindResultOutcome where applicable:
 * - 'cancelled' - user dismissed the picker
 * - 'no-resource' - no destinations available (aligns with BindResultOutcome)
 * - 'selected' - user made a selection (picker-specific, differs from 'bound')
 */
export type DestinationPickerResult =
  | { readonly outcome: Extract<DestinationPickerOutcome, 'selected'>; readonly bindOptions: BindOptions }
  | { readonly outcome: Extract<DestinationPickerOutcome, 'cancelled'> }
  | { readonly outcome: Extract<DestinationPickerOutcome, 'no-resource'> };
