import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { EligibleTerminal, NonBindableReason } from '../../types';

import { classifyTerminalForBinding } from './classifyTerminalForBinding';

/**
 * Get all terminals visible in the destination picker with their metadata.
 *
 * Terminals whose process has exited or that are marked `hideFromUser` are
 * filtered out entirely. Extension-managed pty terminals (Jest task runner,
 * debug consoles, etc.) are kept in the list but tagged with
 * `nonBindableReason: 'extension-managed'` so the picker can render them as
 * disabled entries. Terminal order matches VS Code's natural order — sorting
 * is a separate concern.
 *
 * @param ideAdapter - IDE adapter for reading terminal state
 * @returns Array of visible terminals (empty if none qualify)
 */
export const getEligibleTerminals = async (
  ideAdapter: VscodeAdapter,
): Promise<EligibleTerminal[]> => {
  const allTerminals = ideAdapter.terminals;

  const visibleTerminals: Array<{
    terminal: (typeof allTerminals)[number];
    nonBindableReason: NonBindableReason | undefined;
  }> = [];
  for (const terminal of allTerminals) {
    const classification = classifyTerminalForBinding(terminal);
    if (!classification.visible) continue;
    visibleTerminals.push({ terminal, nonBindableReason: classification.nonBindableReason });
  }

  if (visibleTerminals.length === 0) {
    return [];
  }
  const activeTerminal = ideAdapter.activeTerminal;

  return Promise.all(
    visibleTerminals.map(async ({ terminal, nonBindableReason }) => {
      const processId = await terminal.processId.then(
        (pid) => pid ?? undefined,
        () => undefined,
      );
      const base: EligibleTerminal = {
        terminal,
        name: terminal.name,
        isActive: terminal === activeTerminal,
        processId,
      };
      return nonBindableReason === undefined ? base : { ...base, nonBindableReason };
    }),
  );
};
