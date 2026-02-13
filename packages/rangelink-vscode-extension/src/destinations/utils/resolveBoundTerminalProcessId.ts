import { isTerminalDestination } from '../../utils';
import type { PasteDestinationManager } from '../PasteDestinationManager';

/**
 * Resolve the processId of the currently bound terminal destination.
 *
 * @returns The bound terminal's processId, or undefined if no terminal is bound
 *          or the terminal has no processId yet.
 */
export const resolveBoundTerminalProcessId = async (
  destinationManager: PasteDestinationManager,
): Promise<number | undefined> => {
  const boundDest = destinationManager.getBoundDestination();
  if (!isTerminalDestination(boundDest)) return undefined;
  return (await boundDest.resource.terminal.processId) ?? undefined;
};
