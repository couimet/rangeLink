import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import {
  type AIAssistantDestinationKind,
  type DestinationKind,
  isAnyAiAssistantKind,
  MessageCode,
} from '../types';
import { formatMessage } from '../utils';

import type { BindingFeedback } from './BindingFeedback';
import type { LifecycleFeedbackProvider } from './LifecycleFeedbackProvider';
import type { AutoUnbindReason, PasteContext, PasteSendOutcome } from './types';

const AI_ASSISTANT_ERROR_CODES: Record<AIAssistantDestinationKind, MessageCode> = {
  'claude-code': MessageCode.ERROR_CLAUDE_CODE_NOT_AVAILABLE,
  'cursor-ai': MessageCode.ERROR_CURSOR_AI_NOT_AVAILABLE,
  'gemini-code-assist': MessageCode.ERROR_GEMINI_CODE_ASSIST_NOT_AVAILABLE,
  'github-copilot-chat': MessageCode.ERROR_GITHUB_COPILOT_CHAT_NOT_AVAILABLE,
} as const;

export class OperationFeedbackProvider implements LifecycleFeedbackProvider, BindingFeedback {
  constructor(private readonly vscodeAdapter: VscodeAdapter) {}

  notifyAutoUnbind(destinationName: string, reason: AutoUnbindReason): void {
    let messageCode: MessageCode;
    switch (reason) {
      case 'terminal-closed':
        messageCode = MessageCode.STATUS_BAR_DESTINATION_UNBOUND_TERMINAL_CLOSED;
        break;
      case 'editor-closed':
        messageCode = MessageCode.STATUS_BAR_DESTINATION_UNBOUND_EDITOR_CLOSED;
        break;
      default:
        throw RangeLinkExtensionError.forUnexpected(
          'auto-unbind reason',
          reason,
          'OperationFeedbackProvider.notifyAutoUnbind',
        );
    }
    this.vscodeAdapter.setStatusBarMessage(formatMessage(messageCode, { destinationName }));
  }

  notifyDuplicateTabWarning(): void {
    void this.vscodeAdapter.showWarningMessage(
      formatMessage(MessageCode.WARN_TEXT_EDITOR_DUPLICATE_TAB_GROUPS),
    );
  }

  notifyBound(destinationName: string, replacedName?: string): void {
    const message = replacedName
      ? formatMessage(MessageCode.STATUS_BAR_DESTINATION_REBOUND, {
          previousDestination: replacedName,
          newDestination: destinationName,
        })
      : formatMessage(MessageCode.STATUS_BAR_DESTINATION_BOUND, { destinationName });
    this.vscodeAdapter.setSuccessfulStatusBarMessage(message);
  }

  notifyAlreadyBound(destinationName: string): void {
    void this.vscodeAdapter.showInformationMessage(
      formatMessage(MessageCode.ALREADY_BOUND_TO_DESTINATION, { destinationName }),
    );
  }

  notifyBindFailedEditor(messageCode: MessageCode, params: Record<string, string>): void {
    this.vscodeAdapter.showErrorMessage(formatMessage(messageCode, params));
  }

  notifyBindFailedNotAvailable(displayName: string, kind: DestinationKind): void {
    const messageCode = AI_ASSISTANT_ERROR_CODES[kind as AIAssistantDestinationKind];
    if (messageCode !== undefined) {
      this.vscodeAdapter.showErrorMessage(formatMessage(messageCode));
    } else {
      this.vscodeAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_CUSTOM_AI_NOT_AVAILABLE, { extensionName: displayName }),
      );
    }
  }

  notifyBackgroundTabOpened(fileName: string): void {
    void this.vscodeAdapter.showInformationMessage(
      formatMessage(MessageCode.INFO_BACKGROUND_TAB_OPENED, { fileName }),
    );
  }

  notifyUnbound(destinationName: string): void {
    this.vscodeAdapter.setSuccessfulStatusBarMessage(
      formatMessage(MessageCode.STATUS_BAR_DESTINATION_UNBOUND, { destinationName }),
    );
  }

  notifyNothingToUnbind(): void {
    this.vscodeAdapter.setStatusBarMessage(
      formatMessage(MessageCode.STATUS_BAR_DESTINATION_NOT_BOUND),
    );
  }

  notifyJumpFocused(message: string): void {
    this.vscodeAdapter.setSuccessfulStatusBarMessage(message);
  }

  notifyJumpFailed(destinationName: string): void {
    void this.vscodeAdapter.showInformationMessage(
      formatMessage(MessageCode.INFO_JUMP_FOCUS_FAILED, { destinationName }),
    );
  }

  showError(message: string): void {
    void this.vscodeAdapter.showErrorMessage(message);
  }

  provideCopyFeedback(contentType: MessageCode): void {
    const message = formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, {
      linkTypeName: formatMessage(contentType),
    });
    this.vscodeAdapter.setSuccessfulStatusBarMessage(message);
  }

  provideSendFeedback(context: PasteContext, outcome: PasteSendOutcome): void {
    const linkTypeName = formatMessage(context.contentType);
    switch (outcome.kind) {
      case 'sent-automatic': {
        const destinationName = context.destination.displayName;
        this.vscodeAdapter.setSuccessfulStatusBarMessage(
          formatMessage(MessageCode.STATUS_BAR_LINK_SENT_TO_DESTINATION, {
            linkTypeName,
            destinationName,
          }),
        );
        break;
      }
      case 'sent-manual': {
        this.vscodeAdapter.setSuccessfulStatusBarMessage(
          formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, { linkTypeName }),
        );
        void this.vscodeAdapter.showInformationMessage(outcome.instruction);
        break;
      }
      case 'failed-manual': {
        this.vscodeAdapter.setSuccessfulStatusBarMessage(
          formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, { linkTypeName }),
        );
        void this.vscodeAdapter.showWarningMessage(outcome.instruction);
        break;
      }
      case 'failed-automatic': {
        void this.vscodeAdapter.showWarningMessage(
          this.buildPasteFailureMessage(outcome.destinationKind),
        );
        break;
      }
      case 'self-paste-blocked': {
        void this.vscodeAdapter.showInformationMessage(outcome.toastMessage);
        if (outcome.clipboardWritten) {
          this.vscodeAdapter.setSuccessfulStatusBarMessage(
            formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, { linkTypeName }),
          );
        }
        break;
      }
      case 'clipboard-preservation-failed': {
        void this.vscodeAdapter.showWarningMessage(
          formatMessage(MessageCode.WARN_CLIPBOARD_PRESERVATION_FAILED),
        );
        break;
      }
      default:
        throw RangeLinkExtensionError.forUnexpected(
          'paste send outcome',
          outcome,
          'OperationFeedbackProvider.provideSendFeedback',
        );
    }
  }

  private buildPasteFailureMessage(destinationKind: string): string {
    switch (destinationKind) {
      case 'text-editor':
        return formatMessage(MessageCode.WARN_PASTE_FAILED_EDITOR_HIDDEN);
      case 'terminal':
        return formatMessage(MessageCode.WARN_PASTE_FAILED_TERMINAL);
      case 'claude-code':
      case 'cursor-ai':
      case 'gemini-code-assist':
      case 'github-copilot-chat':
        throw RangeLinkExtensionError.forUnexpected(
          'paste failure destination kind',
          destinationKind,
          'OperationFeedbackProvider.buildPasteFailureMessage',
          {
            message: `Chat assistant destination '${destinationKind}' should provide getUserInstruction() and never reach buildPasteFailureMessage()`,
          },
        );
      default:
        if (isAnyAiAssistantKind(destinationKind as DestinationKind)) {
          throw RangeLinkExtensionError.forUnexpected(
            'paste failure destination kind',
            destinationKind,
            'OperationFeedbackProvider.buildPasteFailureMessage',
            {
              message: `AI assistant destination '${destinationKind}' should provide getUserInstruction() and never reach buildPasteFailureMessage()`,
            },
          );
        }
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_IMPLEMENTED,
          message: `Unknown destination kind '${destinationKind}' - missing case in buildPasteFailureMessage()`,
          functionName: 'OperationFeedbackProvider.buildPasteFailureMessage',
          details: { destinationKind },
        });
    }
  }
}
