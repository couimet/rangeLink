/**
 * Narrow interface for components that only need to show information messages.
 *
 * Used by callers that need user-facing toasts
 * (e.g., JumpToDestinationCommand's onNoResource callback).
 */
export interface MessageProvider {
  showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
}
