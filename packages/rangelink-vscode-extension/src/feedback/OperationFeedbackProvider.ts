import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { type DestinationKind, isAnyAiAssistantKind, MessageCode } from '../types';
import { formatMessage } from '../utils';

import type { DestinationInfo, PasteContext, PasteSendOutcome } from './types';

export type { DestinationInfo, PasteContext, PasteSendOutcome };

export class OperationFeedbackProvider {
  constructor(private readonly vscodeAdapter: VscodeAdapter) {}

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
        const message = formatMessage(MessageCode.STATUS_BAR_LINK_SENT_TO_DESTINATION, {
          linkTypeName,
          destinationName,
        });
        this.vscodeAdapter.setSuccessfulStatusBarMessage(message);
        break;
      }
      case 'sent-manual': {
        const message = formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, {
          linkTypeName,
        });
        this.vscodeAdapter.setSuccessfulStatusBarMessage(message);
        void this.vscodeAdapter.showInformationMessage(outcome.instruction);
        break;
      }
      case 'failed-manual': {
        const message = formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, {
          linkTypeName,
        });
        this.vscodeAdapter.setSuccessfulStatusBarMessage(message);
        void this.vscodeAdapter.showWarningMessage(outcome.instruction);
        break;
      }
      case 'failed-automatic': {
        const errorMsg = this.buildPasteFailureMessage(outcome.destinationKind);
        void this.vscodeAdapter.showWarningMessage(errorMsg);
        break;
      }
      case 'self-paste-blocked': {
        void this.vscodeAdapter.showInformationMessage(outcome.toastMessage);
        if (outcome.clipboardWritten) {
          const message = formatMessage(MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD, {
            linkTypeName,
          });
          this.vscodeAdapter.setSuccessfulStatusBarMessage(message);
        }
        break;
      }
      case 'clipboard-preservation-failed': {
        const errorMsg = formatMessage(MessageCode.WARN_CLIPBOARD_PRESERVATION_FAILED);
        void this.vscodeAdapter.showWarningMessage(errorMsg);
        break;
      }
      default: {
        const _exhaustiveCheck: never = outcome;
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: `Unexpected paste send outcome: ${JSON.stringify(_exhaustiveCheck)}`,
          functionName: 'OperationFeedbackProvider.provideSendFeedback',
        });
      }
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
        throw new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
          message: `Chat assistant destination '${destinationKind}' should provide getUserInstruction() and never reach buildPasteFailureMessage()`,
          functionName: 'OperationFeedbackProvider.buildPasteFailureMessage',
          details: { destinationKind },
        });
      default:
        if (isAnyAiAssistantKind(destinationKind as DestinationKind)) {
          throw new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.UNEXPECTED_CODE_PATH,
            message: `AI assistant destination '${destinationKind}' should provide getUserInstruction() and never reach buildPasteFailureMessage()`,
            functionName: 'OperationFeedbackProvider.buildPasteFailureMessage',
            details: { destinationKind },
          });
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
