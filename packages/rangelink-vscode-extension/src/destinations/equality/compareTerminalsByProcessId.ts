import type * as vscode from 'vscode';

import { isTerminalDestination } from '../../utils';
import type { PasteDestination } from '../PasteDestination';

/**
 * Compare two terminals by their process IDs.
 *
 * Used for destination equality checks in terminal-based paste destinations.
 * Process IDs uniquely identify terminal instances across VSCode sessions.
 *
 * @param thisTerminal - The terminal from the current destination
 * @param other - The destination to compare against
 * @returns Promise resolving to true if both terminals have matching process IDs
 */
export const compareTerminalsByProcessId = async (
  thisTerminal: vscode.Terminal,
  other: PasteDestination,
): Promise<boolean> => {
  if (!isTerminalDestination(other)) {
    return false;
  }

  const otherTerminal = other.resource.terminal;
  const [thisPid, otherPid] = await Promise.all([thisTerminal.processId, otherTerminal.processId]);

  return thisPid !== undefined && thisPid === otherPid;
};
