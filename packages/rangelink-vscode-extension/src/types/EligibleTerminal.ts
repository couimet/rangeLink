import type * as vscode from 'vscode';

import type { BoundState } from './BoundState';
import type { NonBindableReason } from './NonBindableReason';

/**
 * Information about a terminal in the destination list. Eligibility now means
 * "visible to the user in the picker" — a terminal can be visible AND
 * not-bindable when its `nonBindableReason` is set.
 */
export interface EligibleTerminal {
  readonly terminal: vscode.Terminal;
  readonly name: string;
  readonly isActive: boolean;
  readonly processId?: number;
  readonly boundState?: BoundState;
  readonly nonBindableReason?: NonBindableReason;
}
