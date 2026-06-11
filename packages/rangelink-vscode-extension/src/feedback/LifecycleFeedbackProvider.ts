import type { AutoUnbindReason } from './types/AutoUnbindReason';

export interface LifecycleFeedbackProvider {
  notifyAutoUnbind(destinationName: string, reason: AutoUnbindReason): void;
  notifyDuplicateTabWarning(): void;
}
