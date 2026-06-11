import { isTerminalDestination } from '../../utils';
import type { PasteDestination } from '../PasteDestination';

/**
 * Resolve the processId of the currently bound terminal destination.
 *
 * @returns The bound terminal's processId, or undefined if no terminal is bound
 *          or the terminal has no processId yet.
 */
export const resolveBoundTerminalProcessId = async (
  getBound: () => PasteDestination | undefined,
): Promise<number | undefined> => {
  const boundDest = getBound();
  if (!isTerminalDestination(boundDest)) return undefined;
  return (await boundDest.resource.terminal.processId) ?? undefined;
};
