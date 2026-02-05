import type { DestinationType } from '../destinations/PasteDestination';

/**
 * Represents a destination that is currently available for binding
 */
export interface AvailableDestination {
  readonly kind: DestinationType;
  readonly displayName: string;
}
