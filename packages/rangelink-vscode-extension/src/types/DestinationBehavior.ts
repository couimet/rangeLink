/**
 * Controls whether content should be sent to bound destination.
 */
export enum DestinationBehavior {
  /** Normal behavior: Send to bound destination if one exists and is eligible */
  BoundDestination = 'bound-destination',
  /** Force clipboard-only: Skip destination even if one is bound */
  ClipboardOnly = 'clipboard-only',
}
