import type { DestinationKind } from './DestinationKind';

/**
 * Shared interface for items that have a destination kind.
 * Used for composition across domain and UI types.
 */
export interface WithDestinationKind {
  readonly kind: DestinationKind;
}
