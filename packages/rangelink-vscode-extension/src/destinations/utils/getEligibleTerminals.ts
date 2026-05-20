import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { EligibleTerminal } from '../../types';

import { classifyTerminalForBinding } from './classifyTerminalForBinding';

/**
 * Get all terminals eligible to bind to.
 *
 * Filters out terminals whose process has exited, that are marked
 * `hideFromUser`, or that are extension-managed pty terminals (Jest watchers,
 * task runners, debug consoles). Terminal order matches VS Code's natural
 * order — sorting is a separate concern.
 *
 * @param ideAdapter - IDE adapter for reading terminal state
 * @returns Array of bindable terminals (empty if none qualify)
 */
export const getEligibleTerminals = async (
  ideAdapter: VscodeAdapter,
): Promise<EligibleTerminal[]> => {
  const allTerminals = ideAdapter.terminals;

  const bindableTerminals: Array<(typeof allTerminals)[number]> = [];
  for (const terminal of allTerminals) {
    const classification = classifyTerminalForBinding(terminal);
    if (!classification.visible) continue;
    if (classification.nonBindableReason !== undefined) continue;
    bindableTerminals.push(terminal);
  }

  if (bindableTerminals.length === 0) {
    return [];
  }
  const activeTerminal = ideAdapter.activeTerminal;

  return Promise.all(
    bindableTerminals.map(async (terminal) => {
      const processId = await terminal.processId.then(
        (pid) => pid ?? undefined,
        () => undefined,
      );
      return {
        terminal,
        name: terminal.name,
        isActive: terminal === activeTerminal,
        processId,
      };
    }),
  );
};
