import { createMockLogger } from 'barebone-logger-testing';
import { Result } from 'rangelink-core-ts';

import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import { TerminalPasteService } from '../../services';
import { BehaviourAfterPaste } from '../../types';
import { createMockClipboardService, createMockTerminal, createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from '../helpers';

describe('TerminalPasteService', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockClipboardService: ReturnType<typeof createMockClipboardService>;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let service: TerminalPasteService;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockClipboardService = createMockClipboardService();
    mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
    service = new TerminalPasteService(mockAdapter, mockClipboardService, mockLogger);
  });

  describe('pasteIntoTerminal', () => {
    it('returns ok and logs success when paste succeeds', async () => {
      const terminal = createMockTerminal({ name: 'my-terminal' });

      const result = await service.pasteIntoTerminal('test content', terminal);

      expect(result).toBeOk();
      expect(mockClipboardService.stage).toHaveBeenCalledWith('test content', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'TerminalPasteService.pasteIntoTerminal', terminalName: 'my-terminal' },
        'Terminal paste succeeded',
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('shows terminal and executes paste command inside stage callback', async () => {
      const terminal = createMockTerminal({ name: 'test-terminal' });

      await service.pasteIntoTerminal('test content', terminal);

      expect(mockClipboardService.stage).toHaveBeenCalledWith('test content', expect.any(Function));
      // The mock clipboard service ran the callback, so all adapter calls
      // were made during pasteIntoTerminal.
      expect(terminal.show).toHaveBeenCalled();
      expect(mockAdapter.executeCommand).toHaveBeenCalledWith('workbench.action.terminal.paste');
    });

    it('sends enter when BehaviourAfterPaste is EXECUTE', async () => {
      const terminal = createMockTerminal({ name: 'test-terminal' });

      await service.pasteIntoTerminal('test content', terminal, {
        behaviour: BehaviourAfterPaste.EXECUTE,
      });

      expect(mockClipboardService.stage).toHaveBeenCalledWith('test content', expect.any(Function));
      expect(terminal.sendText).toHaveBeenCalledWith('', true);
    });

    it('does not send enter by default', async () => {
      const terminal = createMockTerminal({ name: 'test-terminal' });

      await service.pasteIntoTerminal('test content', terminal);

      expect(mockClipboardService.stage).toHaveBeenCalledWith('test content', expect.any(Function));
      expect(terminal.sendText).not.toHaveBeenCalled();
    });

    it('does not send enter when BehaviourAfterPaste is NOTHING', async () => {
      const terminal = createMockTerminal({ name: 'test-terminal' });

      await service.pasteIntoTerminal('test content', terminal, {
        behaviour: BehaviourAfterPaste.NOTHING,
      });

      expect(mockClipboardService.stage).toHaveBeenCalledWith('test content', expect.any(Function));
      expect(terminal.sendText).not.toHaveBeenCalled();
    });

    it('returns error when terminal is undefined', async () => {
      const terminal = undefined as any;

      const result = await service.pasteIntoTerminal('test content', terminal);

      expect(result).toBeRangeLinkExtensionErrorErr('TERMINAL_NOT_DEFINED', {
        message: 'Terminal reference is not defined',
        functionName: 'validateTerminalDefined',
      });
      expect(mockClipboardService.stage).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'TerminalPasteService.pasteIntoTerminal', error: expect.any(Error) },
        'Terminal paste failed - terminal not defined',
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('returns error and logs failure when clipboard stage fails', async () => {
      const terminal = createMockTerminal({ name: 'failing-terminal' });
      const stageError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.CLIPBOARD_READ_FAILED,
        message: 'Failed to read clipboard',
        functionName: 'ClipboardService::stage',
      });
      mockClipboardService.stage.mockResolvedValue(Result.err(stageError));

      const result = await service.pasteIntoTerminal('bad content', terminal);

      expect(mockClipboardService.stage).toHaveBeenCalledWith('bad content', expect.any(Function));
      expect(result).toBeRangeLinkExtensionErrorErr('CLIPBOARD_READ_FAILED', {
        message: 'Failed to read clipboard',
        functionName: 'ClipboardService::stage',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TerminalPasteService.pasteIntoTerminal',
          terminalName: 'failing-terminal',
          error: stageError,
        },
        'Terminal paste failed - clipboard service problem',
      );
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });
});
