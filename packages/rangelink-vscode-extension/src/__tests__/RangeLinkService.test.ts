import type { Logger } from 'barebone-logger';
import * as loggerModule from 'barebone-logger';
import type { DelimiterConfig } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import { messagesEn } from '../i18n/messages.en';
import { PathFormat, RangeLinkService } from '../RangeLinkService';
import { MessageCode } from '../types/MessageCode';
import * as formatMessageModule from '../utils/formatMessage';

import { createMockAsRelativePath } from './helpers/createMockAsRelativePath';
import { createMockClaudeCodeDestination } from './helpers/createMockClaudeCodeDestination';
import { createMockCursorAIDestination } from './helpers/createMockCursorAIDestination';
import { createMockDestinationManager } from './helpers/createMockDestinationManager';
import { createMockDocument } from './helpers/createMockDocument';
import { createMockEditor } from './helpers/createMockEditor';
import { createMockEditorWithSelection } from './helpers/createMockEditorWithSelection';
import { createMockFormattedLink } from './helpers/createMockFormattedLink';
import { createMockGetWorkspaceFolder } from './helpers/createMockGetWorkspaceFolder';
import { createMockPasteDestination } from './helpers/createMockPasteDestination';
import { createMockPosition } from './helpers/createMockPosition';
import { createMockSelection } from './helpers/createMockSelection';
import { createMockTerminalDestination } from './helpers/createMockTerminalDestination';
import { createMockText } from './helpers/createMockText';
import { createMockTextEditorDestination } from './helpers/createMockTextEditorDestination';
import { createMockUri } from './helpers/createMockUri';
import { createWindowOptionsForEditor } from './helpers/createWindowOptionsForEditor';
import { createMockVscodeAdapter, type VscodeAdapterWithTestHooks } from './helpers/mockVSCode';

let service: RangeLinkService;
let mockVscodeAdapter: VscodeAdapterWithTestHooks;
let mockDestinationManager: PasteDestinationManager;
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
    // Create fresh mock IDE adapter for all tests
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

      // Create service
      service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
    });

    describe('when no destination is bound', () => {
      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        // Access private method via any cast for testing
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
      });

      it('should show status message with "copied to clipboard"', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
      });

      it('should use link type name in status message (RangeLink)', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyToClipboardAndDestination(link, 'RangeLink');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
      });

      it('should use link type name in status message (Portable RangeLink)', async () => {
        const link = 'src/auth.ts#L10{L:LINE,C:COL}';

        await (service as any).copyToClipboardAndDestination(link, 'Portable RangeLink');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Portable RangeLink copied to clipboard',
        );
      });

      it('should not call showWarningMessage', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyToClipboardAndDestination(link, 'RangeLink');

        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
      });

      it('should not send to terminal', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyToClipboardAndDestination(link, 'RangeLink');

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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
      });

      it('should send link to terminal', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(formattedLink);
        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledTimes(1);
      });

      it('should show status message with destination name', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to bash',
        );
      });

      it('should use destination displayName from getBoundDestination()', async () => {
        const customDestination = createMockTerminalDestination({ displayName: 'Terminal' });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendLinkToDestinationResult: true,
          boundDestination: customDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to Terminal',
        );
      });

      it('should use "destination" as fallback when destination has no displayName', async () => {
        const unknownDestination = createMockPasteDestination();
        // Remove displayName to test fallback
        delete (unknownDestination as any).displayName;
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendLinkToDestinationResult: true,
          boundDestination: unknownDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to destination',
        );
      });

      it('should not call showWarningMessage on success', async () => {
        await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

        expect(mockVscodeAdapter.showWarningMessage).not.toHaveBeenCalled();
      });

      it('should call methods in correct order: clipboard then terminal then status', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyToClipboardAndDestination(link, 'RangeLink');

        // Verify call order
        const clipboardCall = (mockVscodeAdapter.writeTextToClipboard as jest.Mock).mock
          .invocationCallOrder[0];
        const terminalCall = (mockDestinationManager.sendLinkToDestination as jest.Mock).mock
          .invocationCallOrder[0];
        const statusCall = (mockVscodeAdapter.setStatusBarMessage as jest.Mock).mock
          .invocationCallOrder[0];

        expect(clipboardCall).toBeLessThan(terminalCall);
        expect(terminalCall).toBeLessThan(statusCall);
      });
    });

    describe('when destination is bound but paste fails', () => {
      beforeEach(() => {
        // Use generic destination for backward compatibility tests
        const genericDest = createMockPasteDestination({
          id: 'generic' as any,
          displayName: 'Some Destination',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendLinkToDestinationResult: false,
          boundDestination: genericDest,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
      });

      it('should attempt to send to destination', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockDestinationManager.sendLinkToDestination).toHaveBeenCalledWith(formattedLink);
      });

      it('should show generic warning message with displayName', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.showWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Copied to clipboard. Could not send to Some Destination.',
        );
        expect(mockVscodeAdapter.showWarningMessage).toHaveBeenCalledTimes(1);
      });

      it('should show same warning structure for all link types', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'Portable RangeLink');

        const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
        expect(warningCall).toContain('RangeLink: Copied to clipboard.');
        expect(warningCall).toContain('Some Destination');
      });

      it('should not call setStatusBarMessage when paste fails', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockVscodeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
      });
    });

    describe('paste failure with different destination types', () => {
      beforeEach(() => {
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendLinkToDestinationResult: false,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
      });

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

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          expect(mockVscodeAdapter.showWarningMessage).toHaveBeenCalledWith(
            'RangeLink: Copied to clipboard. Bound editor is hidden behind other tabs - make it active to resume auto-paste.',
          );
        });
      });

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

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

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

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

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

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

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

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).toContain('Future Destination');
        });
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

      // Create service
      service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
    });

    describe('when no active editor', () => {
      beforeEach(() => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
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
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
        });

        it('should copy text to clipboard first (always available fallback)', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
        });

        it('should send selected text to bound destination', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should show success message with destination name', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard & sent to Terminal',
          );
        });

        it('should show warning when paste fails', async () => {
          mockDestinationManager = createMockDestinationManager({
            isBound: true,
            sendTextToDestinationResult: false,
            boundDestination: mockDestination,
          });
          service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

          await service.pasteSelectedTextToDestination();

          expect(mockVscodeAdapter.showWarningMessage).toHaveBeenCalled();
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'first line\nsecond line\nthird line',
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith('valid text');
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(unicodeText);
      });
    });

    describe('destination-specific behaviors', () => {
      beforeEach(() => {
        const { adapter } = createMockEditorWithSelection({
          content: 'test content',
          selections: [[0, 0, 0, 12]],
        });
        mockVscodeAdapter = adapter;
        jest
          .spyOn(mockVscodeAdapter, 'setStatusBarMessage')
          .mockReturnValue({ dispose: jest.fn() });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
      });

      it('should show destination displayName in success message (Terminal)', async () => {
        const mockDestination = createMockTerminalDestination({
          displayName: 'Terminal',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('Terminal'),
        );
      });

      it('should show destination displayName in success message (Text Editor)', async () => {
        const mockDestination = createMockTextEditorDestination({
          displayName: 'Text Editor',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('Text Editor'),
        );
      });

      it('should show destination displayName in success message (Claude Code)', async () => {
        const mockDestination = createMockClaudeCodeDestination({
          displayName: 'Claude Code Chat',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('Claude Code Chat'),
        );
      });

      it('should show destination displayName in success message (Cursor AI)', async () => {
        const mockDestination = createMockCursorAIDestination({
          displayName: 'Cursor AI Assistant',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('Cursor AI Assistant'),
        );
      });
    });

    describe('failure handling', () => {
      beforeEach(() => {
        const { adapter } = createMockEditorWithSelection({
          content: 'test content',
          selections: [[0, 0, 0, 12]],
        });
        mockVscodeAdapter = adapter;
        jest.spyOn(mockVscodeAdapter, 'showWarningMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
      });

      it('should show warning when paste fails', async () => {
        const mockDestination = createMockTerminalDestination({
          displayName: 'Terminal',
          pasteContent: jest.fn().mockResolvedValue(false),
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: false,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.showWarningMessage).toHaveBeenCalled();
      });

      it('should include terminal guidance in failure message for terminal destination', async () => {
        const mockDestination = createMockTerminalDestination({
          displayName: 'Terminal',
          pasteContent: jest.fn().mockResolvedValue(false),
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: false,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
        expect(warningCall).toContain('Terminal');
      });

      it('should include text editor guidance in failure message for text editor destination', async () => {
        const mockDestination: any = createMockTextEditorDestination({
          displayName: 'Text Editor',
          pasteContent: jest.fn().mockResolvedValue(false),
        });
        // Mock getBoundDocumentUri for text editor
        mockDestination.getBoundDocumentUri = jest
          .fn()
          .mockReturnValue({ path: '/path/to/file.txt' });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: false,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        const warningCall = (mockVscodeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
        expect(warningCall).toContain('editor');
      });
    });

    describe('timeout parameter', () => {
      beforeEach(() => {
        const { adapter } = createMockEditorWithSelection({
          content: 'test',
          selections: [[0, 0, 0, 4]],
        });
        mockVscodeAdapter = adapter;
        jest
          .spyOn(mockVscodeAdapter, 'setStatusBarMessage')
          .mockReturnValue({ dispose: jest.fn() });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
      });

      it('should pass 2000ms timeout to setStatusBarMessage (no destination)', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expect.any(String));
      });

      it('should pass 2000ms timeout to setStatusBarMessage (destination success)', async () => {
        const mockDestination = createMockTerminalDestination({
          displayName: 'Terminal',
        });
        mockDestinationManager = createMockDestinationManager({
          isBound: true,
          sendTextToDestinationResult: true,
          boundDestination: mockDestination,
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.pasteSelectedTextToDestination();

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expect.any(String));
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

      // Create service
      service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
    });

    describe('integration with generateLinkFromSelection', () => {
      beforeEach(() => {
        // Mock all dependencies for generateLinkFromSelection
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
      });

      it('should show consistent error message when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection(
          'workspace-relative',
          false,
        );

        expect(result).toBeNull();
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });

      it('should return null early when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection(
          'workspace-relative',
          false,
        );

        expect(result).toBeNull();
        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('integration with pasteSelectedTextToDestination', () => {
      beforeEach(() => {
        // Mock all dependencies
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
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
      it('should use identical error message across all public methods', async () => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        // Call via generateLinkFromSelection
        await (service as any).generateLinkFromSelection('workspace-relative', false);
        const viaGenerateLink = (mockVscodeAdapter.showErrorMessage as jest.Mock).mock.calls[0][0];

        // Reset mock
        (mockVscodeAdapter.showErrorMessage as jest.Mock).mockClear();

        // Call via pasteSelectedTextToDestination
        await service.pasteSelectedTextToDestination();
        const viaPasteText = (mockVscodeAdapter.showErrorMessage as jest.Mock).mock.calls[0][0];

        // Both should be identical
        expect(viaGenerateLink).toBe('RangeLink: No active editor');
        expect(viaPasteText).toBe('RangeLink: No active editor');
        expect(viaGenerateLink).toStrictEqual(viaPasteText);
      });
    });

    describe('DEBUG logging for empty selection edge case', () => {
      let mockLogger: jest.Mocked<Logger>;

      beforeEach(() => {
        // Get the actual logger instance used by RangeLinkService
        mockLogger = {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        } as unknown as jest.Mocked<Logger>;
        // Override getLogger to return our mock
        jest.spyOn(loggerModule, 'getLogger').mockReturnValue(mockLogger);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should log DEBUG message when no editor exists', async () => {
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

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

      it('should include correct context in DEBUG log (hasEditor flag)', async () => {
        // Scenario 1: No editor
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const call1 = mockLogger.debug.mock.calls[0][0] as any;
        expect(call1.hasEditor).toBe(false);

        // Reset mock
        mockLogger.debug.mockClear();

        // Scenario 2: Editor exists but empty selection
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const call2 = mockLogger.debug.mock.calls[0][0] as any;
        expect(call2.hasEditor).toBe(true);
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
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

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

  describe('createLinkOnly (clipboard-only commands - Issue #117)', () => {
    beforeEach(() => {
      // Create mock editor with selection (lines 10-20, 1-indexed in display)
      const mockUri = createMockUri('/workspace/src/file.ts');
      const mockDocument = createMockDocument({
        getText: createMockText('line content'),
        uri: mockUri,
        lineCount: 100,
        lineAt: jest.fn((line: number) => ({
          text: 'line content',
          range: {
            start: { line, character: 0 },
            end: { line, character: 12 }, // 'line content'.length
          },
          rangeIncludingLineBreak: {
            start: { line, character: 0 },
            end: { line, character: 13 },
          },
          lineNumber: line,
          firstNonWhitespaceCharacterIndex: 0,
          isEmptyOrWhitespace: false,
        })) as any,
      });
      // Full-line selection: start at column 0, end at end of line 19
      // Line 19 has 'line content' (12 chars), so end is at character 12
      // This generates clean line-only format: #L10-L20 (no columns)
      const selection = mockSelection(9, 0, 19, 12); // 0-indexed: lines 9-19 = display L10-L20
      const mockEditor = createMockEditor({
        document: mockDocument,
        selections: [selection],
      });

      // Configure workspace and active editor
      const workspaceUri = createMockUri('/workspace');
      mockVscodeAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTextEditor: mockEditor,
        },
        workspaceOptions: {
          workspaceFolders: [
            {
              uri: workspaceUri,
              name: 'workspace',
              index: 0,
            },
          ],
          getWorkspaceFolder: createMockGetWorkspaceFolder('/workspace'),
          asRelativePath: createMockAsRelativePath('src/file.ts'),
        },
      });

      // Spy on adapter methods
      jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);
      jest.spyOn(mockVscodeAdapter, 'setStatusBarMessage').mockReturnValue({ dispose: jest.fn() });
      jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
    });

    describe('with workspace-relative path', () => {
      it('should copy link to clipboard', async () => {
        // Unbound destination
        mockDestinationManager = createMockDestinationManager({ isBound: false });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

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
      });
    });

    describe('with absolute path', () => {
      it('should copy absolute path link to clipboard', async () => {
        mockDestinationManager = createMockDestinationManager({ isBound: false });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.createLinkOnly(PathFormat.Absolute);

        expect(mockVscodeAdapter.writeTextToClipboard).toHaveBeenCalledWith(
          '/workspace/src/file.ts#L10-L20',
        );
      });

      it('should show same status message for absolute paths', async () => {
        mockDestinationManager = createMockDestinationManager({ isBound: false });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.createLinkOnly(PathFormat.Absolute);

        expect(mockVscodeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
        );
      });
    });

    describe('edge cases', () => {
      it('should show error when no editor is active', async () => {
        // No active editor
        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: { activeTextEditor: undefined },
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);

        mockDestinationManager = createMockDestinationManager({ isBound: false });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.createLinkOnly(PathFormat.WorkspaceRelative);

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No active editor',
        );
        expect(mockVscodeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
      });

      it('should show error when selection is empty', async () => {
        // Empty selection (same start and end)
        const mockUri = createMockUri('/workspace/src/file.ts');
        const mockDocument = createMockDocument({
          getText: createMockText('line content'),
          uri: mockUri,
        });
        const emptySelection = mockSelection(5, 10, 5, 10); // Same position
        const mockEditor = createMockEditor({
          document: mockDocument,
          selections: [emptySelection],
        });

        mockVscodeAdapter = createMockVscodeAdapter({
          windowOptions: createWindowOptionsForEditor(mockEditor),
        });
        jest.spyOn(mockVscodeAdapter, 'showErrorMessage').mockResolvedValue(undefined);
        jest.spyOn(mockVscodeAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);

        mockDestinationManager = createMockDestinationManager({ isBound: false });
        service = new RangeLinkService(delimiters, mockVscodeAdapter, mockDestinationManager);

        await service.createLinkOnly(PathFormat.WorkspaceRelative);

        expect(mockVscodeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No text selected. Select text and try again.',
        );
        expect(mockVscodeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
      });
    });
  });
});
