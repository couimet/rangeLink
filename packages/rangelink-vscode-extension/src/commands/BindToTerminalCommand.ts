import type { Logger } from 'barebone-logger';

import type {
  BindSuccessInfo,
  DestinationAvailabilityService,
  PasteDestinationManager,
} from '../destinations';
import { resolveBoundTerminalProcessId, showTerminalPicker } from '../destinations/utils';
import type { QuickPickProvider } from '../ide/QuickPickProvider';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { type ExtensionResult, MessageCode, type QuickPickBindResult } from '../types';
import { formatMessage } from '../utils';

/**
 * Command handler for binding to a terminal via picker.
 *
 * Orchestrates the terminal selection flow:
 * - 0 terminals: Shows error message, returns 'no-resource'
 * - 1 terminal: Auto-binds to it (no picker shown)
 * - 2+ terminals: Shows picker, binds to selected terminal
 *
 * Success feedback is handled by PasteDestinationManager.bind().
 */
export class BindToTerminalCommand {
  constructor(
    private readonly vscodeAdapter: VscodeAdapter,
    private readonly quickPickProvider: QuickPickProvider,
    private readonly availabilityService: DestinationAvailabilityService,
    private readonly destinationManager: PasteDestinationManager,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'BindToTerminalCommand.constructor' },
      'BindToTerminalCommand initialized',
    );
  }

  async execute(): Promise<QuickPickBindResult> {
    const logCtx = { fn: 'BindToTerminalCommand.execute' };

    const boundTerminalProcessId = await resolveBoundTerminalProcessId(this.destinationManager);
    const terminalItems = await this.availabilityService.getTerminalItems(
      Infinity,
      boundTerminalProcessId,
    );

    this.logger.debug(
      { ...logCtx, terminalCount: terminalItems.length },
      'Starting bind to terminal command',
    );

    if (terminalItems.length === 0) {
      this.logger.debug(logCtx, 'No terminals available');
      this.vscodeAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TERMINAL));
      return { outcome: 'no-resource' };
    }

    if (terminalItems.length === 1) {
      const { terminal } = terminalItems[0].terminalInfo;
      this.logger.debug(
        { ...logCtx, terminalName: terminal.name },
        'Single terminal, auto-binding',
      );
      return this.mapBindResult(await this.destinationManager.bind({ kind: 'terminal', terminal }));
    }

    const bindResult = await showTerminalPicker(
      terminalItems,
      this.quickPickProvider,
      {
        getPlaceholder: () => formatMessage(MessageCode.TERMINAL_PICKER_BIND_ONLY_PLACEHOLDER),
        onSelected: async (eligible) => {
          this.logger.debug(
            { ...logCtx, terminalName: eligible.name },
            `Binding to terminal "${eligible.name}"`,
          );
          return this.destinationManager.bind({ kind: 'terminal', terminal: eligible.terminal });
        },
      },
      this.logger,
    );

    if (!bindResult) {
      this.logger.debug(logCtx, 'User cancelled terminal picker');
      return { outcome: 'cancelled' };
    }

    return this.mapBindResult(bindResult);
  }

  private mapBindResult(bindResult: ExtensionResult<BindSuccessInfo>): QuickPickBindResult {
    if (bindResult.success) {
      return { outcome: 'bound', bindInfo: bindResult.value };
    }
    return { outcome: 'bind-failed', error: bindResult.error };
  }
}
