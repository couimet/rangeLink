import type * as vscode from 'vscode';

import type { EligibleTerminal } from '../../types';

import { createMockTerminal } from './createMockTerminal';

export interface MockEligibleTerminalOptions {
  readonly name?: string;
  readonly isActive?: boolean;
  readonly processId?: number;
  readonly boundState?: EligibleTerminal['boundState'];
  readonly terminal?: vscode.Terminal;
}

export const createMockEligibleTerminal = (
  options: MockEligibleTerminalOptions = {},
): EligibleTerminal => {
  const { name = 'bash', isActive = false, processId, boundState, terminal } = options;
  const resolvedTerminal = terminal ?? createMockTerminal({ name });
  return {
    bindOptions: { kind: 'terminal', terminal: resolvedTerminal },
    name,
    isActive,
    ...(processId !== undefined && { processId }),
    ...(boundState !== undefined && { boundState }),
  };
};
