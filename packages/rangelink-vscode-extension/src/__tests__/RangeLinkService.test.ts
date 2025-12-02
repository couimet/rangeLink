import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type { DelimiterConfig } from 'rangelink-core-ts';
import {
  RangeLinkError,
  RangeLinkErrorCodes,
  Result,
  SelectionCoverage,
  SelectionType,
} from 'rangelink-core-ts';
import * as rangeLinkCore from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { messagesEn } from '../i18n/messages.en';
import { PathFormat, RangeLinkService } from '../RangeLinkService';
import { MessageCode } from '../types/MessageCode';
import * as formatMessageModule from '../utils/formatMessage';
import * as toInputSelectionModule from '../utils/toInputSelection';

import { createMockAsRelativePath } from './helpers/createMockAsRelativePath';
import { createMockDestinationManager } from './helpers/createMockDestinationManager';
import { createMockDocument } from './helpers/createMockDocument';
import { createMockEditor } from './helpers/createMockEditor';
import { createMockEditorWithSelection } from './helpers/createMockEditorWithSelection';
import { createMockFormattedLink } from './helpers/createMockFormattedLink';
import { createMockGetWorkspaceFolder } from './helpers/createMockGetWorkspaceFolder';
import { createMockInputSelection } from './helpers/createMockInputSelection';
import { createMockPosition } from './helpers/createMockPosition';
import { createMockSelection } from './helpers/createMockSelection';
import { createMockTerminalDestination } from './helpers/createMockTerminalDestination';
import { createMockText } from './helpers/createMockText';
import { createMockUri } from './helpers/createMockUri';
import { createWindowOptionsForEditor } from './helpers/createWindowOptionsForEditor';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from './helpers/mockVSCode';

let service: RangeLinkService;
let mockVscodeAdapter: VscodeAdapterWithTestHooks;
let mockDestinationManager: PasteDestinationManager;
let mockLogger: Logger;
const delimiters: DelimiterConfig = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
};

/**
 * Helper to create a mock selection with simplified syntax.
 * For non-reversed selections, anchor=start and active=end.
 */
const mockSelection = (
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
): vscode.Selection => {
  const anchor = createMockPosition({ line: startLine, character: startChar });
  const active = createMockPosition({ line: endLine, character: endChar });
  const isEmpty = startLine === endLine && startChar === endChar;
  return createMockSelection({
    anchor,
    active,
    start: anchor,
    end: active,
    isReversed: false,
    isEmpty,
  });
};

describe('RangeLinkService', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();

    mockVscodeAdapter = createMockVscodeAdapter();
  });

  describe('copyToClipboardAndDestination', () => {
    beforeEach(() => {
      // Spy on adapter methods used in these tests
      jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'setStatusBarMessage').mockReturnValue({ dispose: jest.fn() });
      jest.spyOn(mockVscodeAdapter, 'showWarningMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showInformationMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showTextDocument');

      // Create mock destination manager
      mockDestinationManager = createMockDestinationManager({
        isBound: false,
        sendLinkToDestinationResult: true,
      });

      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockLogger,
      );
    });

    describe('when no destination is bound', () => {
      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        // Access private method via any cast for testing
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should show status message with "copied to clipboard"', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should use link type name in status message (RangeLink)', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should use link type name in status message (Portable RangeLink)', async () => {
        const link = 'src/auth.ts#L10{L:LINE,C:COL}';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'Portable RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Portable RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should not call showWarningMessage', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });

      it('should not send to terminal', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
      });
    });

    describe('when destination is bound and paste succeeds', () => {
      beforeEach(() => {
        const mockDestination = createMockTerminalDestination({ displayName: 'bash' });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendLinkToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should send link to terminal with basicStatusMessage', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should call methods in correct order: clipboard then manager', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
        );
        // Verify call order (service handles clipboard, manager handles destination + feedback)
        const clipboardCall = (mockVscodeAdapter.writeTextToClipboard as jest.Mock).mock
          .invocationCallOrder[0];
        const managerCall = (mockDestinationManager.sendLinkToDestination as jest.Mock).mock
          .invocationCallOrder[0];
        expect(clipboardCall).toBeLessThan(managerCall);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });
    });

    describe('when destination is bound but paste fails', () => {
      beforeEach(() => {
        const terminalDest = createMockTerminalDestination({
          displayName: 'Terminal',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendLinkToDestinationResult: false,
<<<<<<< HEAD
          boundDestination: terminalDest,
=======
          boundDestination: genericDest,
>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should attempt to send to destination with basicStatusMessage', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

<<<<<<< HEAD
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ RangeLink copied to clipboard',
=======
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(formattedLink);
      });

      it('should show generic warning message with displayName', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.showWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Copied to clipboard. Could not send to Some Destination.',
>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });

      it('should pass correct basicStatusMessage for Portable RangeLink', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'Portable RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('src/file.ts#L1');
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(
          formattedLink,
          '✓ Portable RangeLink copied to clipboard',
        );
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });
    });

    describe('when destination is bound but content not eligible', () => {
      beforeEach(() => {
        const mockDestination = createMockTerminalDestination({
          displayName: 'Terminal',
          isEligibleForPasteLink: jest.fn().mockResolvedValue(false),
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
<<<<<<< HEAD
          boundDestination: mockDestination,
=======
          sendLinkToDestinationResult: false,
>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

<<<<<<< HEAD
      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);
=======
      describe('text-editor destination', () => {
        it('should show text-editor-specific warning about hidden tabs', async () => {
          const textEditorDest = createMockTextEditorDestination({
            displayName: 'Text Editor',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendLinkToDestinationResult: false,
            boundDestination: textEditorDest,
          });
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        const mockDestination = mockDestinationManager.getBoundDestination()!;
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledTimes(1);
      });

<<<<<<< HEAD
      it('should NOT send to destination when link not eligible', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);
=======
      describe('terminal destination', () => {
        it('should NOT show text-editor-specific warning', async () => {
          const terminalDest = createMockTerminalDestination({
            displayName: 'Terminal',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendLinkToDestinationResult: false,
            boundDestination: terminalDest,
          });
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

<<<<<<< HEAD
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        const mockDestination = mockDestinationManager.getBoundDestination()!;
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
      });

      it('should show clipboard-only status message', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);
=======
          const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).not.toContain('editor');
          expect(warningCall).not.toContain('tabs');
        });

        it('should show terminal-specific guidance', async () => {
          const terminalDest = createMockTerminalDestination({
            displayName: 'Terminal',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendLinkToDestinationResult: false,
            boundDestination: terminalDest,
          });
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).toContain('Terminal');
        });
      });

      describe('claude-code destination', () => {
        it('should NOT show text-editor-specific warning', async () => {
          const claudeCodeDest = createMockClaudeCodeDestination({
            displayName: 'Claude Code Chat',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendLinkToDestinationResult: false,
            boundDestination: claudeCodeDest,
          });
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

<<<<<<< HEAD
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        const mockDestination = mockDestinationManager.getBoundDestination()!;
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
      });

      it('should log debug message about skipping auto-paste', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);
=======
          const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).not.toContain('editor');
          expect(warningCall).not.toContain('tabs');
        });

        it('should show claude-code-specific guidance', async () => {
          const claudeCodeDest = createMockClaudeCodeDestination({
            displayName: 'Claude Code Chat',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendLinkToDestinationResult: false,
            boundDestination: claudeCodeDest,
          });
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).toContain('Claude Code');
        });
      });

      describe('cursor-ai destination', () => {
        it('should NOT show text-editor-specific warning', async () => {
          const cursorAIDest = createMockCursorAIDestination({
            displayName: 'Cursor AI Assistant',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendLinkToDestinationResult: false,
            boundDestination: cursorAIDest,
          });
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

<<<<<<< HEAD
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        const mockDestination = mockDestinationManager.getBoundDestination()!;
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
      });

      it('should verify isEligibleForPasteLink was called with correct link', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);
        const mockDestination = mockDestinationManager.getBoundDestination()!;
=======
          const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).not.toContain('editor');
          expect(warningCall).not.toContain('tabs');
        });

        it('should show cursor-ai-specific guidance', async () => {
          const cursorAIDest = createMockCursorAIDestination({
            displayName: 'Cursor AI Assistant',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendLinkToDestinationResult: false,
            boundDestination: cursorAIDest,
          });
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).toContain('Cursor');
        });
      });

      describe('unknown destination type', () => {
        it('should show generic fallback message with displayName', async () => {
          const unknownDest = createMockPasteDestination({
            id: 'some-future-dest' as any,
            displayName: 'Future Destination',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendLinkToDestinationResult: false,
            boundDestination: unknownDest,
          });
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'copyToClipboardAndDestination', boundDestination: 'Terminal' },
          'Content not eligible for paste - skipping auto-paste',
        );
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledWith(formattedLink);
        expect(mockDestination.isEligibleForPasteLink).toHaveBeenCalledTimes(1);
      });
    });

    describe('edge cases', () => {
      it('should handle empty link string', async () => {
        const formattedLink = createMockFormattedLink('');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('');
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalled();
      });

      it('should handle very long link strings', async () => {
        const longLink = 'src/' + 'a'.repeat(500) + '.ts#L1000-L2000';
        const formattedLink = createMockFormattedLink(longLink);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(longLink);
      });

      it('should handle special characters in link', async () => {
        const specialLink = 'src/file#123.ts##L10C5-L20C10';
        const formattedLink = createMockFormattedLink(specialLink);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(specialLink);
      });

      it('should handle special characters in link type name', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'Custom <Type> Name');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Custom <Type> Name copied to clipboard',
        );
      });
    });

<<<<<<< HEAD
=======
    describe('timeout parameter', () => {
      it('should pass 2000ms timeout to setStatusBarMessage', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expect.any(String));
      });

      it('should pass 2000ms timeout when destination is bound and succeeds', async () => {
        const mockDestination = createMockTerminalDestination();
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendLinkToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expect.any(String));
      });
    });

>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)
    describe('i18n integration', () => {
      let formatMessageSpy: jest.SpyInstance;

      beforeEach(() => {
        formatMessageSpy = jest.spyOn(formatMessageModule, 'formatMessage');
      });

      it('should call formatMessage with STATUS_BAR_LINK_COPIED_TO_CLIPBOARD and linkTypeName parameter', async () => {
        const mockSendFn = jest.fn().mockResolvedValue(true);
        const mockIsEligibleFn = jest.fn().mockResolvedValue(true);

        await (service as any).copyAndSendToDestination(
          'src/file.ts#L1',
          'src/file.ts#L1',
          mockSendFn,
          mockIsEligibleFn,
          'RangeLink',
          'test',
        );

        expect(formatMessageSpy).toHaveBeenCalledWith(
          MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD,
          { linkTypeName: 'RangeLink' },
        );
      });

      it('should produce correct status message with "RangeLink" parameter', async () => {
        const mockSendFn = jest.fn().mockResolvedValue(true);
        const mockIsEligibleFn = jest.fn().mockResolvedValue(true);

        await (service as any).copyAndSendToDestination(
          'src/file.ts#L1',
          'src/file.ts#L1',
          mockSendFn,
          mockIsEligibleFn,
          'RangeLink',
          'test',
        );

        const expectedMessage = messagesEn[MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD].replace(
          '{linkTypeName}',
          'RangeLink',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expectedMessage);
      });

      it('should produce correct status message with "Portable RangeLink" parameter', async () => {
        const mockSendFn = jest.fn().mockResolvedValue(true);
        const mockIsEligibleFn = jest.fn().mockResolvedValue(true);

        await (service as any).copyAndSendToDestination(
          'src/file.ts#L1',
          'src/file.ts#L1',
          mockSendFn,
          mockIsEligibleFn,
          'Portable RangeLink',
          'test',
        );

        const expectedMessage = messagesEn[MessageCode.STATUS_BAR_LINK_COPIED_TO_CLIPBOARD].replace(
          '{linkTypeName}',
          'Portable RangeLink',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expectedMessage);
      });
    });
  });

  describe('pasteSelectedTextToDestination', () => {
    beforeEach(() => {
      // Spy on adapter methods used in these tests
      jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'setStatusBarMessage').mockReturnValue({ dispose: jest.fn() });
      jest.spyOn(mockVscodeAdapter, 'showWarningMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'showInformationMessage').mockResolvedValue(undefined);

      // Create mock destination manager
      mockDestinationManager = createMockDestinationManager({
        isBound: false,
        sendTextToDestinationResult: true,
      });

      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockLogger,
      );
    });

    describe('when no active editor', () => {
      beforeEach(() => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should show error message', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
      });

      it('should not attempt to send to destination', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
      });
    });

    describe('when no selections', () => {
      beforeEach(() => {
        const mockDocument = createMockDocument({
          getText: createMockText(''),
          uri: createMockUri('/test/file.ts'),
        });
        const mockEditor = createMockEditor({ document: mockDocument, selections: [] });
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should show error message', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No text selected. Select text and try again.',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
      });
    });

    describe('when all selections are empty', () => {
      beforeEach(() => {
        const selection1 = mockSelection(0, 0, 0, 0); // empty
        const selection2 = mockSelection(1, 0, 1, 0); // empty
        const mockDocument = createMockDocument({
          getText: createMockText(''),
        });
        const mockEditor = createMockEditor({
          document: mockDocument,
          selections: [selection1, selection2],
        });
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should show error message', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No text selected. Select text and try again.',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
      });
    });

    describe('with single selection', () => {
      beforeEach(() => {
        const { adapter } = createMockEditorWithSelection({
          content: 'const foo = "bar";',
          selections: [[0, 0, 0, 18]],
        });
        mockVscodeAdapter = adapter;
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        jest
          .spyOn(mockVscodeAdapter, 'setStatusBarMessage')
          .mockReturnValue({ dispose: jest.fn() });
        jest.spyOn(mockVscodeAdapter, 'showWarningMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      describe('when no destination bound', () => {
        it('should copy selected text to clipboard', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
        });

        it('should show clipboard fallback message', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
        });

        it('should not attempt to send to destination', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
        });
      });

      describe('when destination is bound', () => {
        let mockDestination: any;

        beforeEach(() => {
          mockDestination = createMockTerminalDestination({
            displayName: 'Terminal',
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendTextToDestinationResult: true,
            boundDestination: mockDestination,
          });
          service = new RangeLinkService(
            delimiters,
            mockVscodeAdapter,
            mockDestinationManager,
            mockLogger,
          );
        });

        it('should copy text to clipboard first (always available fallback)', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
        });

        it('should send selected text to bound destination with basicStatusMessage', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
            'const foo = "bar";',
            '✓ Selected text copied to clipboard',
          );
        });
      });

      describe('when destination is bound but text content not eligible', () => {
        let mockDestination: any;

        beforeEach(() => {
          mockDestination = createMockTerminalDestination({
            displayName: 'Terminal',
            isEligibleForPasteContent: jest.fn().mockResolvedValue(false),
          });
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            boundDestination: mockDestination,
          });
          service = new RangeLinkService(
            delimiters,
            mockVscodeAdapter,
            mockDestinationManager,
            mockLogger,
          );
        });

        it('should copy text to clipboard', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should NOT send to destination when text content not eligible', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should show clipboard-only status message', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should log debug message about skipping auto-paste', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should verify isEligibleForPasteContent was called with correct text', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
          expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard',
          );
          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
          expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
          expect(mockLogger.debug).toHaveBeenCalledWith(
            { fn: 'pasteSelectedTextToDestination', boundDestination: 'Terminal' },
            'Content not eligible for paste - skipping auto-paste',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
          expect(mockDestination.isEligibleForPasteContent).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe('with multi-selection', () => {
      beforeEach(() => {
        // Note: Multi-selection with custom getText behavior - need to override document.getText
        const { adapter, document } = createMockEditorWithSelection({
          content: 'first line\nsecond line\nthird line',
          selections: [
            [0, 0, 0, 10],
            [1, 0, 1, 11],
            [2, 0, 2, 10],
          ],
        });

        // Override getText to return different text per selection (test requirement)
        const selection1 = adapter.activeTextEditor!.selections[0];
        const selection2 = adapter.activeTextEditor!.selections[1];
        const selection3 = adapter.activeTextEditor!.selections[2];
        document.getText = jest.fn((selection) => {
          if (selection === selection1) return 'first line';
          if (selection === selection2) return 'second line';
          if (selection === selection3) return 'third line';
          return '';
        }) as any;

        mockVscodeAdapter = adapter;
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        jest
          .spyOn(mockVscodeAdapter, 'setStatusBarMessage')
          .mockReturnValue({ dispose: jest.fn() });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should concatenate selections with newlines', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(
          'first line\nsecond line\nthird line',
        );
      });

      it('should send concatenated text to destination', async () => {
        const mockDestination = createMockTerminalDestination({
          displayName: 'Terminal',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'first line\nsecond line\nthird line',
          '✓ Selected text copied to clipboard',
        );
      });

      it('should show status message for concatenated text', async () => {
        await service.pasteSelectedTextToDestination();

        // "first line\nsecond line\nthird line" = 33 chars total
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Selected text copied to clipboard',
        );
      });
    });

    describe('with mixed empty and non-empty selections', () => {
      beforeEach(() => {
        // Create selections: 2 empty, 1 with text
        const { adapter, document } = createMockEditorWithSelection({
          content: 'valid text',
          selections: [
            [0, 0, 0, 0], // empty (collapsed)
            [1, 0, 1, 10],
            [2, 0, 2, 0], // empty (collapsed)
          ],
        });

        // Override getText to return text only for second selection (test requirement)
        const selection2 = adapter.activeTextEditor!.selections[1];
        document.getText = jest.fn((selection) => {
          if (selection === selection2) return 'valid text';
          return '';
        }) as any;

        mockVscodeAdapter = adapter;
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should filter out empty selections', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('valid text');
      });

      it('should send only non-empty selections to destination', async () => {
        const mockDestination = createMockTerminalDestination({
          displayName: 'Terminal',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'valid text',
          '✓ Selected text copied to clipboard',
        );
      });
    });

    describe('edge cases', () => {
      it('should handle very long selection', async () => {
        const longText = 'a'.repeat(10000);
        const { adapter } = createMockEditorWithSelection({
          content: longText,
          selections: [[0, 0, 0, 10000]],
        });
        mockVscodeAdapter = adapter;
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        jest
          .spyOn(mockVscodeAdapter, 'setStatusBarMessage')
          .mockReturnValue({ dispose: jest.fn() });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(longText);
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Selected text copied to clipboard',
        );
      });

      it('should handle special characters in selection', async () => {
        const specialText = 'const regex = /\\d+/g;\n"quotes" & <tags>';
        const { adapter } = createMockEditorWithSelection({
          content: specialText,
          selections: [[0, 0, 0, 40]],
        });
        mockVscodeAdapter = adapter;
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(specialText);
      });

      it('should handle unicode characters in selection', async () => {
        const unicodeText = '你好世界 🚀 émojis';
        const { adapter } = createMockEditorWithSelection({
          content: unicodeText,
          selections: [[0, 0, 0, 20]],
        });
        mockVscodeAdapter = adapter;
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(unicodeText);
      });
    });
  });

  describe('validateSelectionsAndShowError', () => {
    beforeEach(() => {
      // Configure adapter state for this describe block
      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: undefined },
      });

      // Spy on adapter methods used in these tests
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);

      // Create mock destination manager
      mockDestinationManager = createMockDestinationManager({
        isBound: false,
      });

      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockLogger,
      );
    });

    describe('integration with generateLinkFromSelection', () => {
      beforeEach(() => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should show consistent error message when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection(
          'workspace-relative',
          false,
        );

        expect(result).toBeUndefined();
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });

      it('should return undefined early when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection(
          'workspace-relative',
          false,
        );

        expect(result).toBeUndefined();
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('integration with pasteSelectedTextToDestination', () => {
      beforeEach(() => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should show consistent error message when no editor', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });

      it('should return early when no editor', async () => {
        await service.pasteSelectedTextToDestination();

        // Verify we bailed early (no clipboard or destination operations)
        expect(mockVscodeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('error message consistency', () => {
      beforeEach(() => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );
      });

      it('should show "No active editor" via generateLinkFromSelection', async () => {
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
      });

      it('should show "No active editor" via pasteSelectedTextToDestination', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
      });
    });

    describe('DEBUG logging for empty selection edge case', () => {
      it('should log DEBUG message when no editor exists', async () => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: false,
            errorMsg: 'RangeLink: No active editor',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should log DEBUG message when editor exists but selections are empty', async () => {
        const mockEditor = createMockEditor({
          document: createMockDocument({
            getText: createMockText(''),
            uri: createMockUri('/test/file.ts'),
          }),
          selection: { isEmpty: true } as any,
          selections: [{ isEmpty: true } as any],
        });
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: true,
            errorMsg: 'RangeLink: No text selected. Select text and try again.',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should log DEBUG via pasteSelectedTextToDestination', async () => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        await service.pasteSelectedTextToDestination();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: false,
            errorMsg: 'RangeLink: No active editor',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should include hasEditor:false in DEBUG log when no editor', async () => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: false,
            errorMsg: 'RangeLink: No active editor',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should include hasEditor:true in DEBUG log when editor exists with empty selection', async () => {
        const mockEditor = createMockEditor({
          document: createMockDocument({
            getText: createMockText(''),
            uri: createMockUri('/test/file.ts'),
          }),
          selection: { isEmpty: true } as any,
          selections: [{ isEmpty: true } as any],
        });
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: true,
            errorMsg: 'RangeLink: No text selected. Select text and try again.',
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });

      it('should not log DEBUG when validation succeeds', async () => {
        const mockDocument = createMockDocument({
          getText: createMockText('line content'),
          uri: createMockUri('/test/file.ts'),
        });

        const mockEditor = createMockEditor({
          document: mockDocument,
          selection: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 },
            isEmpty: false,
          } as any,
          selections: [
            {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 5 },
              isEmpty: false,
            } as any,
          ],
        });

        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        jest
          .spyOn(mockVscodeAdapter, 'getWorkspaceFolder')
          .mockImplementation(createMockGetWorkspaceFolder('/test'));
        jest
          .spyOn(mockVscodeAdapter, 'asRelativePath')
          .mockImplementation(createMockAsRelativePath('file.ts'));
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(
          delimiters,
          mockVscodeAdapter,
          mockDestinationManager,
          mockLogger,
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        // Should not log DEBUG when validation succeeds
        // Verify neither possible context was logged (hasEditor: true or false)
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: true,
            errorMsg: expect.any(String),
          },
          'Empty selection detected - should be prevented by command enablement',
        );
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          {
            fn: 'validateSelectionsAndShowError',
            hasEditor: false,
            errorMsg: expect.any(String),
          },
          'Empty selection detected - should be prevented by command enablement',
        );
      });
    });
  });

  describe('createLink()', () => {
    let mockGenerateLink: jest.SpyInstance;
    let mockCopyToClipboard: jest.SpyInstance;

    beforeEach(() => {
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockLogger,
      );

      // Spy on private methods (auto-restored by jest.config.js restoreMocks: true)
      mockGenerateLink = jest.spyOn(service as any, 'generateLinkFromSelection');
      mockCopyToClipboard = jest.spyOn(service as any, 'copyToClipboardAndDestination');
    });

    it('should call generateLinkFromSelection with WorkspaceRelative and portable=false', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, false);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should call generateLinkFromSelection with Absolute and portable=false', async () => {
      const mockFormattedLink = createMockFormattedLink('/workspace/src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(PathFormat.Absolute);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.Absolute, false);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should use default PathFormat.WorkspaceRelative when not specified', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(); // No argument

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, false);
    });

    it('should call copyToClipboardAndDestination when link generated', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockCopyToClipboard).toHaveBeenCalledWith(mockFormattedLink, 'RangeLink');
      expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    });

    it('should not call copyToClipboardAndDestination when generateLinkFromSelection returns null', async () => {
      mockGenerateLink.mockResolvedValue(null);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createLink(PathFormat.WorkspaceRelative);

      expect(mockCopyToClipboard).not.toHaveBeenCalled();
    });
  });

  describe('createPortableLink()', () => {
    let mockGenerateLink: jest.SpyInstance;
    let mockCopyToClipboard: jest.SpyInstance;

    beforeEach(() => {
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockLogger,
      );

      // Spy on private methods (auto-restored by jest.config.js restoreMocks: true)
      mockGenerateLink = jest.spyOn(service as any, 'generateLinkFromSelection');
      mockCopyToClipboard = jest.spyOn(service as any, 'copyToClipboardAndDestination');
    });

    it('should call generateLinkFromSelection with WorkspaceRelative and portable=true', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20{L:LINE,C:COL}');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(PathFormat.WorkspaceRelative);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, true);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should call generateLinkFromSelection with Absolute and portable=true', async () => {
      const mockFormattedLink = createMockFormattedLink(
        '/workspace/src/file.ts#L10-L20{L:LINE,C:COL}',
      );
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(PathFormat.Absolute);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.Absolute, true);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should use default PathFormat.WorkspaceRelative when not specified', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10{L:LINE,C:COL}');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(); // No argument

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, true);
    });

    it('should call copyToClipboardAndDestination with Portable RangeLink label', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20{L:LINE,C:COL}');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(PathFormat.WorkspaceRelative);

      expect(mockCopyToClipboard).toHaveBeenCalledWith(mockFormattedLink, 'Portable RangeLink');
      expect(mockCopyToClipboard).toHaveBeenCalledTimes(1);
    });

    it('should not call copyToClipboardAndDestination when generateLinkFromSelection returns null', async () => {
      mockGenerateLink.mockResolvedValue(null);
      mockCopyToClipboard.mockResolvedValue(undefined);

      await service.createPortableLink(PathFormat.WorkspaceRelative);

      expect(mockCopyToClipboard).not.toHaveBeenCalled();
    });
  });

  describe('generateLinkFromSelection() - happy path integration', () => {
    let mockToInputSelection: jest.SpyInstance;

    beforeEach(() => {
      // Use same setup as formatLink error tests, but let formatLink succeed
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/test/file.ts') }),
        selections: [createMockSelection({ isEmpty: false })],
      });

      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: mockEditor },
        workspaceOptions: {
          getWorkspaceFolder: jest
            .fn()
            .mockReturnValue({ uri: createMockUri('/test'), index: 0, name: 'test' }),
          asRelativePath: jest.fn().mockReturnValue('file.ts'),
        },
      });

      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockLogger,
      );

      // Mock toInputSelection to return valid input (like formatLink error tests do)
      mockToInputSelection = jest.spyOn(toInputSelectionModule, 'toInputSelection');
      mockToInputSelection.mockReturnValue(
        createMockInputSelection({
          selections: [
            {
              start: { line: 10, char: 0 },
              end: { line: 20, char: 0 },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        }),
      );
    });

    it('should successfully generate regular link and return FormattedLink', async () => {
      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

<<<<<<< HEAD
      expect(result).toStrictEqual({
        link: expect.stringMatching(/file\.ts#L\d+/),
        linkType: 'regular',
        selectionType: 'Normal',
        rangeFormat: 'WithPositions',
        delimiters: expect.any(Object),
        computedSelection: expect.any(Object),
=======
        await service.createLinkOnly(PathFormat.WorkspaceRelative);

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('src/file.ts#L10-L20');
      });

      it('should show clipboard-only status message', async () => {
        mockDestinationManager = createMockDestinationManager({ isBound: false });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.createLinkOnly(PathFormat.WorkspaceRelative);

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
      });

      it('should NOT send to destination even when bound', async () => {
        // Bound destination (terminal)
        const mockDestination = createMockTerminalDestination({ displayName: 'bash' });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          boundDestination: mockDestination,
          sendLinkToDestinationResult: true,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.createLinkOnly(PathFormat.WorkspaceRelative);

        // Key assertion: destination should NOT be called for clipboard-only
        expect(mockDestinationManager.sendLinkToDestination).not.toHaveBeenCalled();
        // But clipboard should still be called
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('src/file.ts#L10-L20');
>>>>>>> 8c00a818 (Rename `sendToDestination` to `sendLinkToDestination`)
      });
    });

    it('should successfully generate portable link and return FormattedLink', async () => {
      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        true, // isPortable
      );

      expect(result).toStrictEqual({
        link: expect.stringMatching(/file\.ts#L\d+.*~.*~.*~.*~/),
        linkType: 'portable',
        selectionType: 'Normal',
        rangeFormat: 'WithPositions',
        delimiters: expect.any(Object),
        computedSelection: expect.any(Object),
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', formattedLink: result },
        `Generated link: ${result.link}`,
      );
    });

    it('should return FormattedLink with all required fields', async () => {
      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(result).toStrictEqual({
        link: expect.stringMatching(/file\.ts#L\d+/),
        linkType: 'regular',
        selectionType: 'Normal',
        rangeFormat: 'WithPositions',
        delimiters: expect.any(Object),
        computedSelection: expect.any(Object),
      });
    });
  });

  describe('generateLinkFromSelection() - error handling', () => {
    let mockToInputSelection: jest.SpyInstance;

    beforeEach(() => {
      // Minimal editor setup: just needs non-empty selection
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/test/file.ts') }),
        selections: [createMockSelection({ isEmpty: false })],
      });

      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: mockEditor },
      });
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockLogger,
      );

      // Mock toInputSelection to throw errors (auto-restored by jest.config.js)
      mockToInputSelection = jest.spyOn(toInputSelectionModule, 'toInputSelection');

      // Spy on error methods
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
    });

    it('should handle toInputSelection throwing Error with message', async () => {
      const testError = new Error('Invalid rectangular selection');
      mockToInputSelection.mockImplementation(() => {
        throw testError;
      });

      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(result).toBeUndefined();
      expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Invalid rectangular selection',
      );
    });

    it('should handle toInputSelection throwing non-Error exception', async () => {
      mockToInputSelection.mockImplementation(() => {
        throw 'string error'; // Non-Error exception
      });

      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(result).toBeUndefined();
      expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Failed to process selection',
      );
    });

    it('should log error with correct function name and context', async () => {
      const testError = new Error('Test error');
      mockToInputSelection.mockImplementation(() => {
        throw testError;
      });

      await (service as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, false);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', error: testError },
        'Failed to convert selections to InputSelection',
      );
    });
  });

  describe('generateLinkFromSelection() - formatLink error handling', () => {
    let mockFormatLink: jest.SpyInstance;
    let mockToInputSelection: jest.SpyInstance;

    beforeEach(() => {
      // Minimal editor setup: just needs non-empty selection
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/test/file.ts') }),
        selections: [createMockSelection({ isEmpty: false })],
      });

      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: mockEditor },
        workspaceOptions: {
          getWorkspaceFolder: jest
            .fn()
            .mockReturnValue({ uri: createMockUri('/test'), index: 0, name: 'test' }),
          asRelativePath: jest.fn().mockReturnValue('file.ts'),
        },
      });
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockLogger,
      );

      // Mock toInputSelection to return valid input (bypass validation - tested in Gap 3)
      mockToInputSelection = jest.spyOn(toInputSelectionModule, 'toInputSelection');
      mockToInputSelection.mockReturnValue(
        createMockInputSelection({
          selections: [
            {
              start: { line: 10, char: 0 },
              end: { line: 20, char: 0 },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        }),
      );

      // Mock formatLink to return error (the focus of this test)
      mockFormatLink = jest.spyOn(rangeLinkCore, 'formatLink');

      // Spy on error methods (what we're verifying)
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
    });

    it('should handle formatLink failure for regular link', async () => {
      const testError = new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_EMPTY,
        message: 'Test error from formatLink',
        functionName: 'formatLink',
      });
      mockFormatLink.mockReturnValue(Result.err(testError));

      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        false,
      );

      expect(result).toBeUndefined();
      expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Failed to generate link',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', errorCode: testError },
        'Failed to generate link',
      );
      expect(mockFormatLink).toHaveBeenCalledTimes(1);
    });

    it('should handle formatLink failure for portable link', async () => {
      const testError = new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_EMPTY,
        message: 'Test error from formatLink',
        functionName: 'formatLink',
      });
      mockFormatLink.mockReturnValue(Result.err(testError));

      const result = await (service as any).generateLinkFromSelection(
        PathFormat.WorkspaceRelative,
        true, // isPortable = true
      );

      expect(result).toBeUndefined();
      expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Failed to generate portable link',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelection', errorCode: testError },
        'Failed to generate portable link',
      );
      expect(mockFormatLink).toHaveBeenCalledTimes(1);
    });

    it('should use "link" in error message for regular link', async () => {
      const testError = new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_EMPTY,
        message: 'Test error',
        functionName: 'formatLink',
      });
      mockFormatLink.mockReturnValue(Result.err(testError));

      await (service as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, false);

      expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Failed to generate link',
      );
    });

    it('should use "portable link" in error message for portable link', async () => {
      const testError = new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_EMPTY,
        message: 'Test error',
        functionName: 'formatLink',
      });
      mockFormatLink.mockReturnValue(Result.err(testError));

      await (service as any).generateLinkFromSelection(PathFormat.WorkspaceRelative, true);

      expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
        'RangeLink: Failed to generate portable link',
      );
    });
  });

  describe('createLinkOnly (clipboard-only commands - Issue #117)', () => {
    let mockGenerateLink: jest.SpyInstance;
    let mockCopyAndSend: jest.SpyInstance;

    beforeEach(() => {
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      service = new RangeLinkService(
        delimiters,
        mockVscodeAdapter,
        mockDestinationManager,
        mockLogger,
      );

      // Spy on private methods (auto-restored by jest.config.js restoreMocks: true)
      mockGenerateLink = jest.spyOn(service as any, 'generateLinkFromSelection');
      mockCopyAndSend = jest.spyOn(service as any, 'copyAndSendToDestination');
    });

    it('should call generateLinkFromSelection with correct parameters', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyAndSend.mockResolvedValue(undefined);

      await service.createLinkOnly(PathFormat.WorkspaceRelative);

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, false);
      expect(mockGenerateLink).toHaveBeenCalledTimes(1);
    });

    it('should call copyAndSendToDestination with ClipboardOnly behavior', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10-L20');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyAndSend.mockResolvedValue(undefined);

      await service.createLinkOnly(PathFormat.WorkspaceRelative);

      expect(mockCopyAndSend).toHaveBeenCalledWith(
        mockFormattedLink.link, // content
        mockFormattedLink, // formattedLink
        expect.any(Function), // isEligibleFn (no-op callback)
        expect.any(Function), // sendFn (no-op callback)
        'RangeLink', // linkTypeName
        'createLinkOnly', // functionName
        'clipboard-only', // DestinationBehavior.ClipboardOnly
      );
      expect(mockCopyAndSend).toHaveBeenCalledTimes(1);
    });

    it('should not call copyAndSendToDestination when generateLinkFromSelection returns undefined', async () => {
      mockGenerateLink.mockResolvedValue(undefined);
      mockCopyAndSend.mockResolvedValue(undefined);

      await service.createLinkOnly(PathFormat.WorkspaceRelative);

      expect(mockCopyAndSend).not.toHaveBeenCalled();
    });

    it('should use default PathFormat.WorkspaceRelative when not specified', async () => {
      const mockFormattedLink = createMockFormattedLink('src/file.ts#L10');
      mockGenerateLink.mockResolvedValue(mockFormattedLink);
      mockCopyAndSend.mockResolvedValue(undefined);

      await service.createLinkOnly(); // No argument

      expect(mockGenerateLink).toHaveBeenCalledWith(PathFormat.WorkspaceRelative, false);
    });
  });
});
