import type { DestinationKind } from './DestinationKind';

/**
 * Narrowed bound-destination info exposed to event consumers.
 *
 * Carries only the fields needed for status bar appearance and other
 * read-only consumers — not the full PasteDestination API surface.
 */
export interface BoundDestinationInfo {
  readonly id: DestinationKind;
  readonly displayName: string;
}
