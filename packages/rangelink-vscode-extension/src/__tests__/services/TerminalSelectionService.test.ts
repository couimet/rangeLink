import { createMockLogger } from '@couimet/logger-contract-testing';
import { Result } from 'rangelink-core-ts';

import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import { TerminalSelectionService } from '../../services/TerminalSelectionService';
import {
  createMockClipboardService,
  createMockConfigReader,
  createMockDestinationManager,
  createMockTerminal,
  createMockVscodeAdapter,
  spyOnFormatMessage,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

describe('TerminalSelectionService', () => {
  let service: TerminalSelectionService;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockClipboardService: ReturnType<typeof createMockClipboardService>;
  let mockConfigReader: ReturnType<typeof createMockConfigReader>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockShowErrorMessage: jest.Mock;
  let mockShowInformationMessage: jest.Mock;
  let formatMessageSpy: jest.SpyInstance;
  let mockSendRouter: {
    resolveDestination: jest.Mock;
    sendToDestination: jest.Mock;
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockClipboardService = createMockClipboardService();
    mockConfigReader = createMockConfigReader();
    mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
    mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
    mockAdapter = createMockVscodeAdapter({
      windowOptions: {
        showErrorMessage: mockShowErrorMessage,
        showInformationMessage: mockShowInformationMessage,
      },
    });
    mockDestinationManager = createMockDestinationManager();
    mockSendRouter = {
      resolveDestination: jest.fn(),
      sendToDestination: jest.fn(),
    };
    service = new TerminalSelectionService(
      mockAdapter,
      mockDestinationManager,
      mockConfigReader,
      mockClipboardService,
      mockSendRouter as any,
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

    it('returns clipboard-read-failed when clipboard capture fails', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      const captureError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.CLIPBOARD_READ_FAILED,
        message: 'Failed to read clipboard',
        functionName: 'ClipboardService::capture::read',
      });
      mockClipboardService.capture.mockResolvedValue(Result.err(captureError));

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'clipboard-read-failed', error: captureError });
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_TERMINAL_CLIPBOARD_READ_FAILED');
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination',
          terminalName: 'zsh',
          error: captureError,
          isCopyFailure: false,
        },
        'Clipboard read failed during capture',
      );
    });

    it('returns copy-command-failed when capture producer throws', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      const commandError = new Error('command failed');
      const captureError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.CLIPBOARD_CAPTURE_EXECUTION_FAILED,
        message: 'The producer callback threw an error',
        functionName: 'ClipboardService::capture',
        details: { error: commandError },
      });
      mockClipboardService.capture.mockResolvedValue(Result.err(captureError));

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'copy-command-failed', error: captureError });
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_TERMINAL_COPY_COMMAND_FAILED');
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination',
          terminalName: 'zsh',
          error: captureError,
          isCopyFailure: true,
        },
        'executeCommand(terminal.copySelection) threw',
      );
    });

    it('returns no-text-selected when clipboard roundtrip yields empty string', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      mockClipboardService.capture.mockResolvedValue(
        Result.ok({ clipboard: '', produced: undefined }),
      );

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'no-text-selected' });
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_NO_TERMINAL_TEXT_SELECTED');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination', terminalName: 'zsh' },
        'No terminal text after clipboard roundtrip',
      );
    });

    it('returns picker-cancelled when resolveDestination returns undefined', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      mockClipboardService.capture.mockResolvedValue(
        Result.ok({ clipboard: 'selected text', produced: undefined }),
      );
      mockSendRouter.resolveDestination.mockResolvedValue(false);

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'picker-cancelled' });
      expect(mockSendRouter.sendToDestination).not.toHaveBeenCalled();
    });

    it('sends content to destination and returns success', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      mockClipboardService.capture.mockResolvedValue(
        Result.ok({ clipboard: 'selected text', produced: undefined }),
      );
      mockSendRouter.resolveDestination.mockResolvedValue(true);
      mockConfigReader.getPaddingMode.mockReturnValue('both');

      const result = await service.pasteTerminalSelectionToDestination();

      expect(result).toStrictEqual({ outcome: 'success' });
      expect(mockSendRouter.sendToDestination).toHaveBeenCalledTimes(1);
      expect(mockSendRouter.sendToDestination).toHaveBeenCalledWith({
        control: {
          contentType: 'Text',
        },
        content: {
          clipboard: ' selected text ',
          send: ' selected text ',
        },
        strategies: {
          sendFn: expect.any(Function) as unknown,
          isEligibleFn: expect.any(Function) as unknown,
        },
        contentNameCode: 'CONTENT_NAME_SELECTED_TEXT',
        fnName: 'pasteTerminalSelectionToDestination',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'TerminalSelectionService.pasteTerminalSelectionToDestination',
          contentLength: 13,
          terminalName: 'zsh',
        },
        'Read 13 chars from terminal selection',
      );
    });
  });

  describe('terminalLinkBridge', () => {
    it('shows info tip when paste succeeds', async () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      Object.defineProperty(mockAdapter, 'activeTerminal', { get: () => terminal });
      mockClipboardService.capture.mockResolvedValue(
        Result.ok({ clipboard: 'text', produced: undefined }),
      );
      mockSendRouter.resolveDestination.mockResolvedValue(true);

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
