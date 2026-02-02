import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { isTerminalEligible } from './isTerminalEligible';

/**
 * Check if terminal destination binding is eligible.
 *
 * Only considers terminals with live processes (exitStatus undefined).
 *
 * @param ideAdapter - IDE adapter for reading terminal state
 * @returns true if at least one live terminal exists, false otherwise
 */
export const isTerminalDestinationEligible = (ideAdapter: VscodeAdapter): boolean =>
  ideAdapter.terminals.some(isTerminalEligible);
