import { createMockLogger } from 'barebone-logger-testing';

import { TerminalSelectionService } from '../../services/TerminalSelectionService';
import { DestinationBehavior } from '../../types';

import {
  createMockClipboardPreserver,
  createMockConfigReader,
  createMockDestinationManager,
  createMockDestinationPicker,
  createMockTerminal,
  createMockVscodeAdapter,
  spyOnFormatMessage,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

describe('TerminalSelectionService', () => {
  let service: TerminalSelectionService;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockPreserver: ReturnType<typeof createMockClipboardPreserver>;
  let mockConfigReader: ReturnType<typeof createMockConfigReader>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockShowErrorMessage: jest.Mock;
  let mockShowInformationMessage: jest.Mock;
  let formatMessageSpy: jest.SpyInstance;
  let mockClipboardRouter: {
    resolveDestinationBehavior: jest.Mock;
    copyAndSendToDestination: jest.Mock;
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockPreserver = createMockClipboardPreserver();
    mockConfigReader = createMockConfigReader();
    mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
    mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
    mockAdapter = createMockVscodeAdapter({
      windowOptions: {
        showErrorMessage: mockShowErrorMessage,
        showInformationMessage: mockShowInformationMessage,
      },
    });
    mockDestinationManager = createMockDestinationManager({ isBound: false });
    mockClipboardRouter = {
      resolveDestinationBehavior: jest.fn(),
      copyAndSendToDestination: jest.fn(),
    };
    service = new TerminalSelectionService(
      mockAdapter,
      mockDestinationManager,
      mockConfigReader,
      mockPreserver,
      mockClipboardRouter as any,
      mockLogger,
    );
    formatMessageSpy = spyOnFormatMessage();
  });

  describe('pasteTerminalSelectionToDestination', () => {
    it('returns no-active-terminal and shows error when no terminal is active', async () => {
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => undefined });

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'no-active-terminal' });
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_NO_ACTIVE_TERMINAL');
      expect(mockShowErrorMessage).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination' },
        'No active terminal',
      );
    });

    it('returns copy-command-failed when executeCommand throws', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      const copyError = new Error('command failed');
      jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(copyError);
      mockPreserver.preserve.mockImplementation(async (fn) => fn());

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'copy-command-failed', error: copyError });
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_TERMINAL_COPY_COMMAND_FAILED');
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination',
          terminalName: 'zsh',
          error: copyError,
        },
        'executeCommand(terminal.copySelection) threw',
      );
    });

    it('returns clipboard-read-failed when readTextFromClipboard throws', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
      const readError = new Error('clipboard read failed');
      jest.spyOn(mockAdapter, 'readTextFromClipboard').mockRejectedValue(readError);
      mockPreserver.preserve.mockImplementation(async (fn) => fn());

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'clipboard-read-failed', error: readError });
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_TERMINAL_CLIPBOARD_READ_FAILED');
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination',
          terminalName: 'zsh',
          error: readError,
        },
        'readTextFromClipboard() threw',
      );
    });

    it('returns no-text-selected when clipboard roundtrip yields empty string', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      mockPreserver.preserve.mockResolvedValue('');

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'no-text-selected' });
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_NO_TERMINAL_TEXT_SELECTED');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination' },
        'No terminal text after clipboard roundtrip',
      );
    });

    it('returns picker-cancelled when resolveDestinationBehavior returns undefined', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      mockPreserver.preserve.mockResolvedValue('selected text');
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(undefined);

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'picker-cancelled' });
      expect(mockClipboardRouter.copyAndSendToDestination).not.toHaveBeenCalled();
    });

    it('sends content to destination and returns success', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      mockPreserver.preserve.mockResolvedValue('selected text');
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
        DestinationBehavior.BoundDestination,
      );

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'success' });
      expect(mockClipboardRouter.copyAndSendToDestination).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination',
          contentLength: 13,
        },
        'Read 13 chars from terminal selection',
      );
    });
  });

  describe('terminalLinkBridge', () => {
    it('shows info tip when paste succeeds', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      mockPreserver.preserve.mockResolvedValue('text');
      mockClipboardRouter.resolveDestinationBehavior.mockResolvedValue(
        DestinationBehavior.BoundDestination,
      );

      await service.terminalLinkBridge();

      expect(formatMessageSpy).toHaveBeenCalledWith('INFO_TERMINAL_LINK_BRIDGE_TIP');
      expect(mockShowInformationMessage).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'TerminalSelectionService.terminalLinkBridge' },
        'Bridging R-L to pasteTerminalSelectionToDestination',
      );
    });

    it('does not show info tip when paste fails', async () => {
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => undefined });

      await service.terminalLinkBridge();

      expect(mockShowInformationMessage).not.toHaveBeenCalled();
    });
  });

  describe('terminalCopyLinkGuard', () => {
    it('shows error explaining R-C is not supported in terminal', () => {
      service.terminalCopyLinkGuard();

      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_TERMINAL_COPY_LINK_NOT_SUPPORTED');
      expect(mockShowErrorMessage).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'TerminalSelectionService.terminalCopyLinkGuard' },
        'R-C pressed in terminal context',
      );
    });
  });
});
