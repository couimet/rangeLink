import type { DestinationKind } from '../../types';

export interface DestinationInfo {
  kind: DestinationKind;
  /** Machine-readable label (e.g. "bash", "file.ts") */
  label: string;
  /** Formatted display name (e.g. 'Terminal ("bash")', 'Text Editor ("file.ts")') */
  displayName: string;
}
