import type * as vscode from 'vscode';

import type { BoundState } from './BoundState';

/**
 * Information about a terminal eligible for binding.
 * Includes the raw terminal reference, display name, active state,
 * resolved processId, and optional bound state.
 */
export interface EligibleTerminal {
  readonly terminal: vscode.Terminal;
  readonly name: string;
  readonly isActive: boolean;
  readonly processId?: number;
  readonly boundState?: BoundState;
}
