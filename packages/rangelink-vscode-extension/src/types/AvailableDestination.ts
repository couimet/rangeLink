import type { WithDestinationKind } from './WithDestinationKind';
import type { WithDisplayName } from './WithDisplayName';

/**
 * Represents a destination that is currently available for binding.
 * Composed from shared interfaces for consistency across domain and UI types.
 */
export interface AvailableDestination extends WithDestinationKind, WithDisplayName {}
