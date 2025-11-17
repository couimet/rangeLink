import type { Logger } from 'barebone-logger';
import * as loggerModule from 'barebone-logger';
import type { DelimiterConfig } from 'rangelink-core-ts';

import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { RangeLinkService } from '../RangeLinkService';
import { createMockDestination, createMockFormattedLink } from './helpers';

describe('RangeLinkService', () => {
  describe('copyToClipboardAndDestination', () => {
    let service: RangeLinkService;
    let mockIdeAdapter: VscodeAdapter;
    let mockDestinationManager: PasteDestinationManager;
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };

    beforeEach(() => {
      // Create mock IDE adapter
      mockIdeAdapter = {
        writeTextToClipboard: jest.fn().mockResolvedValue(undefined),
        setStatusBarMessage: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        showWarningMessage: jest.fn().mockResolvedValue(undefined),
        showErrorMessage: jest.fn().mockResolvedValue(undefined),
        showInformationMessage: jest.fn().mockResolvedValue(undefined),
        showTextDocument: jest.fn(),
      } as any;

      // Create mock destination manager
      mockDestinationManager = {
        isBound: jest.fn().mockReturnValue(false),
        sendToDestination: jest.fn().mockResolvedValue(true),
        getBoundDestination: jest.fn(),
      } as unknown as PasteDestinationManager;

      // Create service
      service = new RangeLinkService(delimiters, mockIdeAdapter, mockDestinationManager);
    });

    describe('when no destination is bound', () => {
      beforeEach(() => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(false);
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        // Access private method via any cast for testing
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
      });

      it('should show status message with "copied to clipboard"', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
      });

      it('should use link type name in status message (RangeLink)', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyToClipboardAndDestination(link, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
      });

      it('should use link type name in status message (Portable RangeLink)', async () => {
        const link = 'src/auth.ts#L10{L:LINE,C:COL}';

        await (service as any).copyToClipboardAndDestination(link, 'Portable RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Portable RangeLink copied to clipboard',
          2000,
        );
      });

      it('should not call showWarningMessage', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyToClipboardAndDestination(link, 'RangeLink');

        expect(mockIdeAdapter.showWarningMessage).not.toHaveBeenCalled();
      });

      it('should not send to terminal', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyToClipboardAndDestination(link, 'RangeLink');

        expect(mockDestinationManager.sendToDestination).not.toHaveBeenCalled();
      });
    });

    describe('when destination is bound and paste succeeds', () => {
      beforeEach(() => {
        const mockDestination = createMockDestination({ displayName: 'bash' });

        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        (mockDestinationManager.sendToDestination as jest.Mock).mockResolvedValue(true);
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
      });

      it('should send link to terminal', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockDestinationManager.sendToDestination).toHaveBeenCalledWith(formattedLink);
        expect(mockDestinationManager.sendToDestination).toHaveBeenCalledTimes(1);
      });

      it('should show status message with destination name', async () => {
        const link = 'src/auth.ts#L10';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to bash',
          2000,
        );
      });

      it('should use destination displayName from getBoundDestination()', async () => {
        const customDestination = createMockDestination({ displayName: 'Terminal' });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(
          customDestination,
        );

        await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to Terminal',
          2000,
        );
      });

      it('should use "destination" as fallback when destination has no displayName', async () => {
        const unknownDestination = createMockDestination();
        // Remove displayName to test fallback
        delete (unknownDestination as any).displayName;
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(
          unknownDestination,
        );

        await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to destination',
          2000,
        );
      });

      it('should not call showWarningMessage on success', async () => {
        await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.showWarningMessage).not.toHaveBeenCalled();
      });

      it('should call methods in correct order: clipboard then terminal then status', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyToClipboardAndDestination(link, 'RangeLink');

        // Verify call order
        const clipboardCall = (mockIdeAdapter.writeTextToClipboard as jest.Mock).mock
          .invocationCallOrder[0];
        const terminalCall = (mockDestinationManager.sendToDestination as jest.Mock).mock
          .invocationCallOrder[0];
        const statusCall = (mockIdeAdapter.setStatusBarMessage as jest.Mock).mock
          .invocationCallOrder[0];

        expect(clipboardCall).toBeLessThan(terminalCall);
        expect(terminalCall).toBeLessThan(statusCall);
      });
    });

    describe('when destination is bound but paste fails', () => {
      beforeEach(() => {
        // Use generic destination for backward compatibility tests
        const genericDest = createMockDestination({
          id: 'generic' as any,
          displayName: 'Some Destination',
        });
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(genericDest);
        (mockDestinationManager.sendToDestination as jest.Mock).mockResolvedValue(false);
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
      });

      it('should attempt to send to destination', async () => {
        const link = 'src/auth.ts#L10-L20';
        const formattedLink = createMockFormattedLink(link);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockDestinationManager.sendToDestination).toHaveBeenCalledWith(formattedLink);
      });

      it('should show generic warning message with displayName', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Copied to clipboard. Could not send to Some Destination.',
        );
        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledTimes(1);
      });

      it('should show same warning structure for all link types', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'Portable RangeLink');

        const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
        expect(warningCall).toContain('RangeLink: Copied to clipboard.');
        expect(warningCall).toContain('Some Destination');
      });

      it('should not call setStatusBarMessage when paste fails', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
      });
    });

    describe('paste failure with different destination types', () => {
      beforeEach(() => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        (mockDestinationManager.sendToDestination as jest.Mock).mockResolvedValue(false);
      });

      describe('text-editor destination', () => {
        it('should show text-editor-specific warning about hidden tabs', async () => {
          const textEditorDest = createMockDestination({
            id: 'text-editor' as any,
            displayName: 'Text Editor',
          });
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(textEditorDest);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledWith(
            'RangeLink: Copied to clipboard. Bound editor is hidden behind other tabs - make it active to resume auto-paste.',
          );
        });
      });

      describe('terminal destination', () => {
        it('should NOT show text-editor-specific warning', async () => {
          const terminalDest = createMockDestination({
            id: 'terminal' as any,
            displayName: 'Terminal',
          });
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(terminalDest);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).not.toContain('editor');
          expect(warningCall).not.toContain('tabs');
        });

        it('should show terminal-specific guidance', async () => {
          const terminalDest = createMockDestination({
            id: 'terminal' as any,
            displayName: 'Terminal',
          });
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(terminalDest);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).toContain('Terminal');
        });
      });

      describe('claude-code destination', () => {
        it('should NOT show text-editor-specific warning', async () => {
          const claudeCodeDest = createMockDestination({
            id: 'claude-code' as any,
            displayName: 'Claude Code Chat',
          });
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(claudeCodeDest);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).not.toContain('editor');
          expect(warningCall).not.toContain('tabs');
        });

        it('should show claude-code-specific guidance', async () => {
          const claudeCodeDest = createMockDestination({
            id: 'claude-code' as any,
            displayName: 'Claude Code Chat',
          });
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(claudeCodeDest);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).toContain('Claude Code');
        });
      });

      describe('cursor-ai destination', () => {
        it('should NOT show text-editor-specific warning', async () => {
          const cursorAIDest = createMockDestination({
            id: 'cursor-ai' as any,
            displayName: 'Cursor AI Assistant',
          });
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(cursorAIDest);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).not.toContain('editor');
          expect(warningCall).not.toContain('tabs');
        });

        it('should show cursor-ai-specific guidance', async () => {
          const cursorAIDest = createMockDestination({
            id: 'cursor-ai' as any,
            displayName: 'Cursor AI Assistant',
          });
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(cursorAIDest);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).toContain('Cursor');
        });
      });

      describe('unknown destination type', () => {
        it('should show generic fallback message with displayName', async () => {
          const unknownDest = createMockDestination({
            id: 'some-future-dest' as any,
            displayName: 'Future Destination',
          });
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(unknownDest);

          await (service as any).copyToClipboardAndDestination('src/file.ts#L1', 'RangeLink');

          const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
          expect(warningCall).toContain('Future Destination');
        });
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(false);
      });

      it('should handle empty link string', async () => {
        const formattedLink = createMockFormattedLink('');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith('');
        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalled();
      });

      it('should handle very long link strings', async () => {
        const longLink = 'src/' + 'a'.repeat(500) + '.ts#L1000-L2000';
        const formattedLink = createMockFormattedLink(longLink);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(longLink);
      });

      it('should handle special characters in link', async () => {
        const specialLink = 'src/file#123.ts##L10C5-L20C10';
        const formattedLink = createMockFormattedLink(specialLink);

        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(specialLink);
      });

      it('should handle special characters in link type name', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'Custom <Type> Name');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Custom <Type> Name copied to clipboard',
          2000,
        );
      });
    });

    describe('timeout parameter', () => {
      beforeEach(() => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(false);
      });

      it('should pass 2000ms timeout to setStatusBarMessage', async () => {
        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expect.any(String), 2000);
      });

      it('should pass 2000ms timeout when destination is bound and succeeds', async () => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        (mockDestinationManager.sendToDestination as jest.Mock).mockReturnValue(true);
        const mockDestination = createMockDestination({ displayName: 'bash' });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);

        const formattedLink = createMockFormattedLink('src/file.ts#L1');
        await (service as any).copyToClipboardAndDestination(formattedLink, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expect.any(String), 2000);
      });
    });
  });

  describe('validateSelectionsAndShowError', () => {
    let service: RangeLinkService;
    let mockIdeAdapter: VscodeAdapter;
    let mockDestinationManager: PasteDestinationManager;
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };

    beforeEach(() => {
      // Create mock IDE adapter with writable activeTextEditor
      mockIdeAdapter = {
        showErrorMessage: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Define activeTextEditor as writable property
      Object.defineProperty(mockIdeAdapter, 'activeTextEditor', {
        writable: true,
        value: undefined,
      });

      // Create mock destination manager
      mockDestinationManager = {
        isBound: jest.fn().mockReturnValue(false),
      } as unknown as PasteDestinationManager;

      // Create service
      service = new RangeLinkService(delimiters, mockIdeAdapter, mockDestinationManager);
    });

    describe('integration with generateLinkFromSelection', () => {
      beforeEach(() => {
        // Mock all dependencies for generateLinkFromSelection
        (mockIdeAdapter as any).activeTextEditor = undefined;
        mockIdeAdapter.showErrorMessage = jest.fn().mockResolvedValue(undefined);
      });

      it('should show consistent error message when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection(
          'workspace-relative',
          false,
        );

        expect(result).toBeNull();
        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledWith('RangeLink: No active editor');
        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });

      it('should return null early when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection(
          'workspace-relative',
          false,
        );

        expect(result).toBeNull();
        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockIdeAdapter as any).activeTextEditor = undefined;

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockIdeAdapter as any).activeTextEditor = {
          document: { uri: { path: '/test/file.ts' } },
          selection: { isEmpty: true },
          selections: [{ isEmpty: true }],
        };

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

      it('should include correct context in DEBUG log (hasEditor flag)', async () => {
        // Scenario 1: No editor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockIdeAdapter as any).activeTextEditor = undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const call1 = mockLogger.debug.mock.calls[0][0] as any;
        expect(call1.hasEditor).toBe(false);

        // Reset mock
        mockLogger.debug.mockClear();

        // Scenario 2: Editor exists but empty selection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockIdeAdapter as any).activeTextEditor = {
          document: { uri: { path: '/test/file.ts' } },
          selection: { isEmpty: true },
          selections: [{ isEmpty: true }],
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const call2 = mockLogger.debug.mock.calls[0][0] as any;
        expect(call2.hasEditor).toBe(true);
      });

      it('should not log DEBUG when validation succeeds', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockIdeAdapter as any).activeTextEditor = {
          document: {
            uri: { path: '/test/file.ts', fsPath: '/test/file.ts' },
            getText: jest.fn(() => 'line content'),
          },
          selection: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 },
            isEmpty: false,
          },
          selections: [
            {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 5 },
              isEmpty: false,
            },
          ],
        };

        mockIdeAdapter.getWorkspaceFolder = jest.fn().mockReturnValue({
          uri: { path: '/test' },
        });
        mockIdeAdapter.asRelativePath = jest.fn().mockReturnValue('file.ts');
        mockIdeAdapter.writeTextToClipboard = jest.fn().mockResolvedValue(undefined);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any).generateLinkFromSelection('workspace-relative', false);

        // Should not log DEBUG when validation succeeds
        expect(mockLogger.debug).not.toHaveBeenCalledWith(
          expect.objectContaining({
            fn: 'validateSelectionsAndShowError',
          }),
          'Empty selection detected - should be prevented by command enablement',
        );
      });
    });
  });
});
