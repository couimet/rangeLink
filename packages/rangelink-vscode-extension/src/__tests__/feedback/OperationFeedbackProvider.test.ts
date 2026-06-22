import { OperationFeedbackProvider } from '../../feedback/OperationFeedbackProvider';
import { MessageCode } from '../../types';
import { spyOnFormatMessage } from '../helpers';

const createMockVscodeAdapter = () => ({
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  setStatusBarMessage: jest.fn().mockReturnValue({ dispose: jest.fn() }),
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

    describe('with bindContext', () => {
      const bindContext = { destinationName: 'Terminal ("bash")' };

      it('sent-automatic + bindContext uses merged message code', () => {
        provider.provideSendFeedback(
          createPasteContext() as any,
          { kind: 'sent-automatic' },
          bindContext,
        );

        expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_DESTINATION_BOUND_AND_SENT', {
          destinationName: 'Terminal ("bash")',
          linkTypeName: 'RangeLink',
        });
        expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
          'Bound to Terminal ("bash") — RangeLink sent',
        );
        expect(mockAdapter.showInformationMessage).not.toHaveBeenCalled();
        expect(mockAdapter.showWarningMessage).not.toHaveBeenCalled();
      });

      it('sent-automatic without bindContext uses existing message code', () => {
        provider.provideSendFeedback(createPasteContext() as any, { kind: 'sent-automatic' });

        expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_LINK_SENT_TO_DESTINATION', {
          linkTypeName: 'RangeLink',
          destinationName: 'Terminal ("bash")',
        });
        expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
          'RangeLink sent to Terminal ("bash")',
        );
      });

      it('sent-manual + bindContext prepends bound prefix to clipboard status bar message', () => {
        provider.provideSendFeedback(
          createPasteContext() as any,
          {
            kind: 'sent-manual',
            instruction: 'Press Cmd+V to paste',
          },
          bindContext,
        );

        expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_DESTINATION_BOUND_PREFIX', {
          destinationName: 'Terminal ("bash")',
        });
        expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
          'Bound to Terminal ("bash") — RangeLink copied to clipboard',
        );
        expect(mockAdapter.showInformationMessage).toHaveBeenCalledWith('Press Cmd+V to paste');
      });

      it('failed-manual + bindContext prepends bound prefix to clipboard status bar message', () => {
        provider.provideSendFeedback(
          createPasteContext() as any,
          {
            kind: 'failed-manual',
            instruction: 'Manual paste required',
          },
          bindContext,
        );

        expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
          'Bound to Terminal ("bash") — RangeLink copied to clipboard',
        );
        expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith('Manual paste required');
      });

      it('failed-automatic + bindContext prepends bound prefix to warning message', () => {
        provider.provideSendFeedback(
          createPasteContext({
            destination: { kind: 'text-editor', label: 'file.ts', displayName: 'Text Editor' },
          }) as any,
          { kind: 'failed-automatic', destinationKind: 'text-editor' },
          bindContext,
        );

        expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_DESTINATION_BOUND_PREFIX', {
          destinationName: 'Terminal ("bash")',
        });
        expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith(
          'Bound to Terminal ("bash") — Could not send to editor. Make sure the bound editor is visible and focused.',
        );
        expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
      });

      it('self-paste-blocked + bindContext with clipboard written prepends bound prefix to status bar only', () => {
        provider.provideSendFeedback(
          createPasteContext() as any,
          {
            kind: 'self-paste-blocked',
            destinationKind: 'text-editor',
            clipboardWritten: true,
            toastMessage: 'Cannot auto-paste to same file.',
          },
          bindContext,
        );

        expect(mockAdapter.showInformationMessage).toHaveBeenCalledWith(
          'Cannot auto-paste to same file.',
        );
        expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
          'Bound to Terminal ("bash") — RangeLink copied to clipboard',
        );
      });

      it('self-paste-blocked + bindContext without clipboard written does not show status bar', () => {
        provider.provideSendFeedback(
          createPasteContext() as any,
          {
            kind: 'self-paste-blocked',
            destinationKind: 'text-editor',
            clipboardWritten: false,
            toastMessage: 'Cannot paste when bound editor has an active selection.',
          },
          bindContext,
        );

        expect(mockAdapter.showInformationMessage).toHaveBeenCalledWith(
          'Cannot paste when bound editor has an active selection.',
        );
        expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
      });

      it('clipboard-preservation-failed + bindContext prepends bound prefix to warning', () => {
        provider.provideSendFeedback(
          createPasteContext() as any,
          {
            kind: 'clipboard-preservation-failed',
          },
          bindContext,
        );

        expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith(
          'Bound to Terminal ("bash") — Clipboard preservation failed. Content was not sent.',
        );
        expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
      });
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
        details: { unexpectedValue: { kind: 'unexpected-value' } },
      });
    });
  });

  describe('notifyAutoUnbind', () => {
    it('shows terminal-closed status bar message', () => {
      provider.notifyAutoUnbind('Terminal ("bash")', 'terminal-closed');

      expect(formatMessageSpy).toHaveBeenCalledWith(
        'STATUS_BAR_DESTINATION_UNBOUND_TERMINAL_CLOSED',
        { destinationName: 'Terminal ("bash")' },
      );
      expect(mockAdapter.setStatusBarMessage).toHaveBeenCalledWith(
        'Unbound from Terminal ("bash") — terminal closed',
      );
    });

    it('shows editor-closed status bar message', () => {
      provider.notifyAutoUnbind('Text Editor ("file.ts")', 'editor-closed');

      expect(formatMessageSpy).toHaveBeenCalledWith(
        'STATUS_BAR_DESTINATION_UNBOUND_EDITOR_CLOSED',
        { destinationName: 'Text Editor ("file.ts")' },
      );
      expect(mockAdapter.setStatusBarMessage).toHaveBeenCalledWith(
        'Unbound from Text Editor ("file.ts") — editor closed',
      );
    });

    it('shows file-deleted status bar message and warning toast', () => {
      provider.notifyAutoUnbind('Text Editor ("server.ts")', 'file-deleted');

      expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_DESTINATION_UNBOUND_FILE_DELETED', {
        destinationName: 'Text Editor ("server.ts")',
      });
      expect(mockAdapter.setStatusBarMessage).toHaveBeenCalledWith(
        'Unbound from Text Editor ("server.ts") — file deleted',
      );
      expect(formatMessageSpy).toHaveBeenCalledWith('WARN_DESTINATION_UNBOUND_FILE_DELETED', {
        destinationName: 'Text Editor ("server.ts")',
      });
      expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith(
        'Unbound from Text Editor ("server.ts") — file was deleted from disk',
      );
    });

    it('throws on unexpected reason', () => {
      expect(() =>
        provider.notifyAutoUnbind('Test', 'unknown-reason' as any),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message: 'Unexpected auto-unbind reason: "unknown-reason"',
        functionName: 'OperationFeedbackProvider.notifyAutoUnbind',
        details: { unexpectedValue: 'unknown-reason' },
      });
    });
  });

  describe('notifyDuplicateTabWarning', () => {
    it('shows duplicate tab warning toast', () => {
      provider.notifyDuplicateTabWarning();

      expect(formatMessageSpy).toHaveBeenCalledWith('WARN_TEXT_EDITOR_DUPLICATE_TAB_GROUPS');
      expect(mockAdapter.showWarningMessage).toHaveBeenCalledWith(
        'Bound file is open in multiple editor groups. Paste will not work until the duplicate tab is closed.',
      );
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
        details: { unexpectedValue: 'claude-code' },
      });
    });

    it('throws for custom AI assistant destination', () => {
      expect(() =>
        (provider as any).buildPasteFailureMessage('custom-ai:my-extension'),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
        message:
          "AI assistant destination 'custom-ai:my-extension' should provide getUserInstruction() and never reach buildPasteFailureMessage()",
        functionName: 'OperationFeedbackProvider.buildPasteFailureMessage',
        details: { unexpectedValue: 'custom-ai:my-extension' },
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

  describe('notifyBound', () => {
    it('shows bound status bar message', () => {
      provider.notifyBound('Terminal ("bash")');

      expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_DESTINATION_BOUND', {
        destinationName: 'Terminal ("bash")',
      });
      expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
        'Bound to Terminal ("bash")',
      );
      expect(mockAdapter.showInformationMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyRebound', () => {
    it('shows rebound status bar message with previous and new destination names', () => {
      provider.notifyRebound('Text Editor ("file.ts")', 'Terminal ("bash")');

      expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_DESTINATION_REBOUND', {
        previousDestination: 'Terminal ("bash")',
        newDestination: 'Text Editor ("file.ts")',
      });
      expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
        'Unbound Terminal ("bash"), now bound to Text Editor ("file.ts")',
      );
      expect(mockAdapter.showInformationMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyAlreadyBound', () => {
    it('shows info message that destination is already bound', () => {
      provider.notifyAlreadyBound('Terminal ("bash")');

      expect(formatMessageSpy).toHaveBeenCalledWith('ALREADY_BOUND_TO_DESTINATION', {
        destinationName: 'Terminal ("bash")',
      });
      expect(mockAdapter.showInformationMessage).toHaveBeenCalledWith(
        'Already bound to Terminal ("bash")',
      );
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyBindFailedEditor', () => {
    it('shows error message with formatted code and params', () => {
      provider.notifyBindFailedEditor(MessageCode.ERROR_TEXT_EDITOR_READ_ONLY, {
        scheme: 'output',
      });

      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_TEXT_EDITOR_READ_ONLY', {
        scheme: 'output',
      });
      expect(mockAdapter.showErrorMessage).toHaveBeenCalledWith(
        'Cannot bind to read-only editor (output)',
      );
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyBindFailedNotAvailable', () => {
    it('shows specific error for known AI assistant kind', () => {
      provider.notifyBindFailedNotAvailable('Claude Code', 'claude-code');

      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_CLAUDE_CODE_NOT_AVAILABLE');
      expect(mockAdapter.showErrorMessage).toHaveBeenCalledWith(
        'Cannot bind Claude Code - extension not installed or not active',
      );
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
    });

    it('shows generic error for custom AI assistant kind', () => {
      provider.notifyBindFailedNotAvailable('My Extension', 'custom-ai:my-extension');

      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_CUSTOM_AI_NOT_AVAILABLE', {
        extensionName: 'My Extension',
      });
      expect(mockAdapter.showErrorMessage).toHaveBeenCalledWith(
        'Cannot bind My Extension - extension not installed or not active',
      );
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyBackgroundTabOpened', () => {
    it('shows info message with file name', () => {
      provider.notifyBackgroundTabOpened('file.ts');

      expect(formatMessageSpy).toHaveBeenCalledWith('INFO_BACKGROUND_TAB_OPENED', {
        fileName: 'file.ts',
      });
      expect(mockAdapter.showInformationMessage).toHaveBeenCalledWith(
        '"file.ts" opened at last cursor position. Adjust cursor before pasting.',
      );
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyUnbound', () => {
    it('shows unbound status bar message', () => {
      provider.notifyUnbound('Terminal ("bash")');

      expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_DESTINATION_UNBOUND', {
        destinationName: 'Terminal ("bash")',
      });
      expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
        'Unbound from Terminal ("bash")',
      );
      expect(mockAdapter.showInformationMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyNothingToUnbind', () => {
    it('shows not-bound status bar message', () => {
      provider.notifyNothingToUnbind();

      expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_DESTINATION_NOT_BOUND');
      expect(mockAdapter.setStatusBarMessage).toHaveBeenCalledWith('No destination bound');
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyJumpFocused', () => {
    it('shows provided message as successful status bar message', () => {
      provider.notifyJumpFocused('Focused Terminal ("bash")');

      expect(mockAdapter.setSuccessfulStatusBarMessage).toHaveBeenCalledWith(
        'Focused Terminal ("bash")',
      );
      expect(mockAdapter.showInformationMessage).not.toHaveBeenCalled();
    });
  });

  describe('notifyJumpFailed', () => {
    it('shows info message that jump focus failed', () => {
      provider.notifyJumpFailed('Terminal ("bash")');

      expect(formatMessageSpy).toHaveBeenCalledWith('INFO_JUMP_FOCUS_FAILED', {
        destinationName: 'Terminal ("bash")',
      });
      expect(mockAdapter.showInformationMessage).toHaveBeenCalledWith(
        'Failed to focus Terminal ("bash")',
      );
      expect(mockAdapter.setSuccessfulStatusBarMessage).not.toHaveBeenCalled();
    });
  });
});
