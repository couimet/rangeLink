import type { AutoUnbindDetails } from './types/AutoUnbindDetails';

export interface LifecycleFeedbackProvider {
  notifyAutoUnbind(destinationName: string, details: AutoUnbindDetails): void;
  notifyDuplicateTabWarning(): void;
}
