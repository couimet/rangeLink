export type ResolveResult =
  | { canProceed: true; bindPerformed: false }
  | { canProceed: true; bindPerformed: true; destinationName: string }
  | { canProceed: false };
