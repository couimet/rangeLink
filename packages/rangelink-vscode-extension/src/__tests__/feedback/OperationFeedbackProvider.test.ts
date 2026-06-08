import { OperationFeedbackProvider } from '../../feedback/OperationFeedbackProvider';
import { MessageCode } from '../../types';
import { spyOnFormatMessage } from '../helpers';

const createMockVscodeAdapter = () => ({
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  setSuccessfulStatusBarMessage: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  showInformationMessage: jest.fn().mockResolvedValue(undefined),
  showWarningMessage: jest.fn().mockResolvedValue(undefined),
});

const createPasteContext = (overrides: Record<string, unknown> = {}) => ({
  contentType: MessageCode.CONTENT_NAME_RANGELINK,
  destination: {
    kind: 'terminal',
    label: 'bash',
    displayName: 'Terminal ("bash")',
  },
  ...overrides,
});

describe('OperationFeedbackProvider', () => {
  let provider: OperationFeedbackProvider;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let formatMessageSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAdapter = createMockVscodeAdapter();
    formatMessageSpy = spyOnFormatMessage();
    provider = new OperationFeedbackProvider(mockAdapter as any);
  });

  // ── showError ─────────────────────────────────────────────

  describe('showError', () => {
    it('delegates to vscodeAdapter.showErrorMessage', () => {
      provider.showError('Test error message');

      expect(mockAdapter.showErrorMessage).toHaveBeenCalledWith('Test error message');
    });
  });

  // ── provideCopyFeedback ───────────────────────────────────

  describe('provideCopyFeedback', () => {
    it('calls formatMessage with LINK_COPIED_TO_CLIPBOARD and sets status bar message', () => {
      provider.provideCopyFeedback(MessageCode.CONTENT_NAME_RANGELINK);

      expect(formatMessageSpy).toHaveBeenCalledWith('CONTENT_NAME_RANGELINK');
      expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_LINK_COPIED_TO_CLIPBOARD', {
        linkTypeName: 'RangeLink',
      });
      expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
        'RangeLink copied to clipboard',
      );
    });
  });

  // ── provideSendFeedback ───────────────────────────────────

  describe('provideSendFeedback', () => {
    it('handles sent-automatic by showing success with destination name', () => {
      provider.provideSendFeedback(createPasteContext() as any, { kind: 'sent-automatic' });

      expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_LINK_SENT_TO_DESTINATION', {
        linkTypeName: 'RangeLink',
        destinationName: 'Terminal ("bash")',
      });
      expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
        'RangeLink sent to Terminal ("bash")',
      );
      expect(mockAdapter.showInformationMessage).not.toHaveBeenCalled();
      expect(mockAdapter.showWarningMessage).not.toHaveBeenCalled();
    });

    it('handles sent-manual by showing success and information message with instruction', () => {
      provider.provideSendFeedback(createPasteContext() as any, {
        kind: 'sent-manual',
        instruction: 'Press Cmd+V to paste',
      });

      expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
        'RangeLink copied to clipboard',
      );
      expect(mockAdapter.showInformationMessage).toHaveBeenCalledWith('Press Cmd+V to paste');
      expect(mockAdapter.showWarningMessage).not.toHaveBeenCalled();
    });

    it('handles failed-manual by showing success and warning message with instruction', () => {
      provider.provideSendFeedback(createPasteContext() as any, {
        kind: 'failed-manual',
        instruction: 'Manual paste required',
      });

      expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
        'RangeLink copied to clipboard',
      );
      expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith('Manual paste required');
      expect(mockAdapter.showInformationMessage).not.toHaveBeenCalled();
    });

    it('handles failed-automatic by showing warning via buildPasteFailureMessage', () => {
      provider.provideSendFeedback(
        createPasteContext({
          destination: {
            kind: 'text-editor',
            label: 'file.ts',
            displayName: 'Text Editor',
          },
        }) as any,
        { kind: 'failed-automatic', destinationKind: 'text-editor' },
      );

      expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith(
        'Could not send to editor. Make sure the bound editor is visible and focused.',
      );
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
    });

    it('shows toast and status bar for self-paste-blocked with clipboard written', () => {
      provider.provideSendFeedback(createPasteContext() as any, {
        kind: 'self-paste-blocked',
        destinationKind: 'text-editor',
        clipboardWritten: true,
        toastMessage:
          'Cannot auto-paste to same file. Link copied to clipboard. Tip: Use R-C for clipboard-only links.',
      });

      expect(mockAdapter.showInformationMessage).toHaveBeenCalledWith(
        'Cannot auto-paste to same file. Link copied to clipboard. Tip: Use R-C for clipboard-only links.',
      );
      expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_LINK_COPIED_TO_CLIPBOARD', {
        linkTypeName: 'RangeLink',
      });
      expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
        'RangeLink copied to clipboard',
      );
      expect(mockAdapter.showWarningMessage).not.toHaveBeenCalled();
    });

    it('shows toast only for self-paste-blocked with clipboard not written', () => {
      provider.provideSendFeedback(createPasteContext() as any, {
        kind: 'self-paste-blocked',
        destinationKind: 'text-editor',
        clipboardWritten: false,
        toastMessage: 'Cannot paste when bound editor has an active selection.',
      });

      expect(mockAdapter.showInformationMessage).toHaveBeenCalledWith(
        'Cannot paste when bound editor has an active selection.',
      );
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
      expect(mockAdapter.showWarningMessage).not.toHaveBeenCalled();
    });

    it('shows warning for clipboard-preservation-failed', () => {
      provider.provideSendFeedback(createPasteContext() as any, {
        kind: 'clipboard-preservation-failed',
      });

      expect(formatMessageSpy).toHaveBeenCalledWith('WARN_CLIPBOARD_PRESERVATION_FAILED');
      expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith(
        'Clipboard preservation failed. Content was not sent.',
      );
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
      expect(mockAdapter.showInformationMessage).not.toHaveBeenCalled();
    });

    it('throws RangeLinkExtensionError on unexpected outcome kind', () => {
      expect(() =>
        provider.provideSendFeedback(
          createPasteContext() as any,
          { kind: 'unexpected-value' } as any,
        ),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected paste send outcome: {"kind":"unexpected-value"}',
        functionName: 'OperationFeedbackProvider.provideSendFeedback',
      });
    });
  });

  // ── buildPasteFailureMessage ─────────────────────────────

  describe('buildPasteFailureMessage', () => {
    it('returns formatted message for text-editor destination', () => {
      const result = (provider as any).buildPasteFailureMessage('text-editor');

      expect(formatMessageSpy).toHaveBeenCalledWith('WARN_PASTE_FAILED_EDITOR_HIDDEN');
      expect(result).toBe(
        'Could not send to editor. Make sure the bound editor is visible and focused.',
      );
    });

    it('returns formatted message for terminal destination', () => {
      const result = (provider as any).buildPasteFailureMessage('terminal');

      expect(formatMessageSpy).toHaveBeenCalledWith('WARN_PASTE_FAILED_TERMINAL');
      expect(result).toBe(
        'Could not send to terminal. Terminal may be closed or not accepting input.',
      );
    });

    it('throws for claude-code chat assistant destination', () => {
      expect(() =>
        (provider as any).buildPasteFailureMessage('claude-code'),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message:
          "Chat assistant destination 'claude-code' should provide getUserInstruction() and never reach buildPasteFailureMessage()",
        functionName: 'OperationFeedbackProvider.buildPasteFailureMessage',
        details: { destinationKind: 'claude-code' },
      });
    });

    it('throws for custom AI assistant destination', () => {
      expect(() =>
        (provider as any).buildPasteFailureMessage('custom-ai:my-extension'),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message:
          "AI assistant destination 'custom-ai:my-extension' should provide getUserInstruction() and never reach buildPasteFailureMessage()",
        functionName: 'OperationFeedbackProvider.buildPasteFailureMessage',
        details: { destinationKind: 'custom-ai:my-extension' },
      });
    });

    it('throws DESTINATION_NOT_IMPLEMENTED for unknown destination kind', () => {
      expect(() =>
        (provider as any).buildPasteFailureMessage('unknown-kind'),
      ).toThrowRangeLinkExtensionError('DESTINATION_NOT_IMPLEMENTED', {
        message:
          "Unknown destination kind 'unknown-kind' - missing case in buildPasteFailureMessage()",
        functionName: 'OperationFeedbackProvider.buildPasteFailureMessage',
        details: { destinationKind: 'unknown-kind' },
      });
    });
  });
});
