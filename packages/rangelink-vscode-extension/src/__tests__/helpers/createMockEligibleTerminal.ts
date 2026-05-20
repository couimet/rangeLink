import type { EligibleTerminal } from '../../types';

import { createMockTerminal } from './createMockTerminal';

export interface MockEligibleTerminalOptions {
  readonly name?: string;
  readonly isActive?: boolean;
  readonly processId?: number;
  readonly boundState?: EligibleTerminal['boundState'];
  readonly terminal?: EligibleTerminal['terminal'];
}

export const createMockEligibleTerminal = (
  options: MockEligibleTerminalOptions = {},
): EligibleTerminal => {
  const { name = 'bash', isActive = false, processId, boundState, terminal } = options;
  return {
    terminal: terminal ?? createMockTerminal({ name }),
    name,
    isActive,
    ...(processId !== undefined && { processId }),
    ...(boundState !== undefined && { boundState }),
  };
};
