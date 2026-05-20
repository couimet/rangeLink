import type * as vscode from 'vscode';

import type { BoundState } from './BoundState';

/**
 * Information about a terminal eligible to bind to in the destination list.
 *
 * Non-bindable terminals (extension-managed pty, hidden, exited) are filtered
 * out upstream in `getEligibleTerminals` and never reach this shape.
 */
export interface EligibleTerminal {
  readonly terminal: vscode.Terminal;
  readonly name: string;
  readonly isActive: boolean;
  readonly processId?: number;
  readonly boundState?: BoundState;
}
