import type { DestinationKind } from '../../types/DestinationKind';

export type PasteSendOutcome =
  | { kind: 'sent-automatic' }
  | { kind: 'sent-manual'; instruction: string }
  | { kind: 'failed-automatic'; destinationKind: DestinationKind }
  | { kind: 'failed-manual'; instruction: string }
  | {
      kind: 'self-paste-blocked';
      destinationKind: DestinationKind;
      clipboardWritten: boolean;
      toastMessage: string;
    };
