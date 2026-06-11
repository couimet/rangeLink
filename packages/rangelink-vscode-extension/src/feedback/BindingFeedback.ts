import type { DestinationKind, MessageCode } from '../types';

export interface BindingFeedback {
  notifyBound(destinationName: string, replacedName?: string): void;
  notifyAlreadyBound(destinationName: string): void;
  notifyBindFailedEditor(messageCode: MessageCode, params: Record<string, string>): void;
  notifyBindFailedNotAvailable(displayName: string, kind: DestinationKind): void;
  notifyBackgroundTabOpened(fileName: string): void;
  notifyUnbound(destinationName: string): void;
  notifyNothingToUnbind(): void;
  notifyJumpFocused(message: string): void;
  notifyJumpFailed(destinationName: string): void;
}
