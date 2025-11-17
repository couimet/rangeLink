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

  describe('pasteSelectedTextToDestination', () => {
    let service: RangeLinkService;
    let mockIdeAdapter: VscodeAdapter;
    let mockDestinationManager: PasteDestinationManager;
    let mockEditor: any;
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };

    beforeEach(() => {
      // Create mock editor with selections
      mockEditor = {
        document: {
          getText: jest.fn((selection) => {
            // Default behavior: return text based on selection mock data
            if (selection._mockText) {
              return selection._mockText;
            }
            return 'selected text';
          }),
        },
        selections: [],
      };

      // Create mock IDE adapter
      mockIdeAdapter = {
        activeTextEditor: mockEditor,
        writeTextToClipboard: jest.fn().mockResolvedValue(undefined),
        setStatusBarMessage: jest.fn().mockReturnValue({ dispose: jest.fn() }),
        showWarningMessage: jest.fn().mockResolvedValue(undefined),
        showErrorMessage: jest.fn().mockResolvedValue(undefined),
        showInformationMessage: jest.fn().mockResolvedValue(undefined),
      } as any;

      // Create mock destination manager
      mockDestinationManager = {
        isBound: jest.fn().mockReturnValue(false),
        sendTextToDestination: jest.fn().mockResolvedValue(true),
        getBoundDestination: jest.fn(),
      } as unknown as PasteDestinationManager;

      // Create service
      service = new RangeLinkService(delimiters, mockIdeAdapter, mockDestinationManager);
    });

    describe('when no active editor', () => {
      beforeEach(() => {
        (mockIdeAdapter as any).activeTextEditor = undefined;
      });

      it('should show error message', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledWith('RangeLink: No active editor');
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
      });

      it('should not attempt to send to destination', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).not.toHaveBeenCalled();
      });
    });

    describe('when no selections', () => {
      beforeEach(() => {
        mockEditor.selections = [];
      });

      it('should show error message', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No text selected. Select text and try again.',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
      });
    });

    describe('when all selections are empty', () => {
      beforeEach(() => {
        mockEditor.selections = [{ isEmpty: true }, { isEmpty: true }];
      });

      it('should show error message', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledWith(
          'RangeLink: No text selected. Select text and try again.',
        );
      });

      it('should not copy to clipboard', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
      });
    });

    describe('with single selection', () => {
      beforeEach(() => {
        const selection = {
          isEmpty: false,
          _mockText: 'const foo = "bar";',
        };
        mockEditor.selections = [selection];
      });

      describe('when no destination bound', () => {
        beforeEach(() => {
          (mockDestinationManager.isBound as jest.Mock).mockReturnValue(false);
        });

        it('should copy selected text to clipboard', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
        });

        it('should show clipboard fallback message with character count', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text copied to clipboard (18 chars)',
            2000,
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
          mockDestination = createMockDestination({
            id: 'terminal' as any,
            displayName: 'Terminal',
          });
          (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
          (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(
            mockDestination,
          );
        });

        it('should copy text to clipboard first (always available fallback)', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith('const foo = "bar";');
        });

        it('should send selected text to bound destination', async () => {
          await service.pasteSelectedTextToDestination();

          expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
            'const foo = "bar";',
          );
        });

        it('should show success message with destination name and character count', async () => {
          (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(true);

          await service.pasteSelectedTextToDestination();

          expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
            '✓ Selected text sent to Terminal (18 chars)',
            2000,
          );
        });

        it('should show warning when paste fails', async () => {
          (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(false);

          await service.pasteSelectedTextToDestination();

          expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalled();
        });
      });
    });

    describe('with multi-selection', () => {
      beforeEach(() => {
        const selection1 = {
          isEmpty: false,
          _mockText: 'first line',
        };
        const selection2 = {
          isEmpty: false,
          _mockText: 'second line',
        };
        const selection3 = {
          isEmpty: false,
          _mockText: 'third line',
        };
        mockEditor.selections = [selection1, selection2, selection3];
      });

      it('should concatenate selections with newlines', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(
          'first line\nsecond line\nthird line',
        );
      });

      it('should send concatenated text to destination', async () => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        const mockDestination = createMockDestination({
          id: 'terminal' as any,
          displayName: 'Terminal',
        });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith(
          'first line\nsecond line\nthird line',
        );
      });

      it('should show correct character count for concatenated text', async () => {
        await service.pasteSelectedTextToDestination();

        // "first line\nsecond line\nthird line" = 33 chars
        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('(33 chars)'),
          2000,
        );
      });
    });

    describe('with mixed empty and non-empty selections', () => {
      beforeEach(() => {
        const selection1 = { isEmpty: true };
        const selection2 = {
          isEmpty: false,
          _mockText: 'valid text',
        };
        const selection3 = { isEmpty: true };
        mockEditor.selections = [selection1, selection2, selection3];
      });

      it('should filter out empty selections', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith('valid text');
      });

      it('should send only non-empty selections to destination', async () => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        const mockDestination = createMockDestination({
          id: 'terminal' as any,
          displayName: 'Terminal',
        });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);

        await service.pasteSelectedTextToDestination();

        expect(mockDestinationManager.sendTextToDestination).toHaveBeenCalledWith('valid text');
      });
    });

    describe('edge cases', () => {
      it('should handle very long selection', async () => {
        const longText = 'a'.repeat(10000);
        const selection = {
          isEmpty: false,
          _mockText: longText,
        };
        mockEditor.selections = [selection];

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(longText);
        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('(10000 chars)'),
          2000,
        );
      });

      it('should handle special characters in selection', async () => {
        const specialText = 'const regex = /\\d+/g;\n"quotes" & <tags>';
        const selection = {
          isEmpty: false,
          _mockText: specialText,
        };
        mockEditor.selections = [selection];

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(specialText);
      });

      it('should handle unicode characters in selection', async () => {
        const unicodeText = '你好世界 🚀 émojis';
        const selection = {
          isEmpty: false,
          _mockText: unicodeText,
        };
        mockEditor.selections = [selection];

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(unicodeText);
      });
    });

    describe('destination-specific behaviors', () => {
      beforeEach(() => {
        const selection = {
          isEmpty: false,
          _mockText: 'test content',
        };
        mockEditor.selections = [selection];
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
      });

      it('should show destination displayName in success message (Terminal)', async () => {
        const mockDestination = createMockDestination({
          id: 'terminal' as any,
          displayName: 'Terminal',
        });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
        (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(true);

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('Terminal'),
          2000,
        );
      });

      it('should show destination displayName in success message (Text Editor)', async () => {
        const mockDestination = createMockDestination({
          id: 'text-editor' as any,
          displayName: 'Text Editor',
        });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
        (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(true);

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('Text Editor'),
          2000,
        );
      });

      it('should show destination displayName in success message (Claude Code)', async () => {
        const mockDestination = createMockDestination({
          id: 'claude-code' as any,
          displayName: 'Claude Code Chat',
        });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
        (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(true);

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('Claude Code Chat'),
          2000,
        );
      });

      it('should show destination displayName in success message (Cursor AI)', async () => {
        const mockDestination = createMockDestination({
          id: 'cursor-ai' as any,
          displayName: 'Cursor AI Assistant',
        });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
        (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(true);

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.stringContaining('Cursor AI Assistant'),
          2000,
        );
      });
    });

    describe('failure handling', () => {
      beforeEach(() => {
        const selection = {
          isEmpty: false,
          _mockText: 'test content',
        };
        mockEditor.selections = [selection];
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
      });

      it('should show warning when paste fails', async () => {
        const mockDestination = createMockDestination({
          id: 'terminal' as any,
          displayName: 'Terminal',
          pasteContent: jest.fn().mockResolvedValue(false),
        });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
        (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(false);

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalled();
      });

      it('should include terminal guidance in failure message for terminal destination', async () => {
        const mockDestination = createMockDestination({
          id: 'terminal' as any,
          displayName: 'Terminal',
          pasteContent: jest.fn().mockResolvedValue(false),
        });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
        (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(false);

        await service.pasteSelectedTextToDestination();

        const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
        expect(warningCall).toContain('Terminal');
      });

      it('should include text editor guidance in failure message for text editor destination', async () => {
        const mockDestination: any = createMockDestination({
          id: 'text-editor' as any,
          displayName: 'Text Editor',
          pasteContent: jest.fn().mockResolvedValue(false),
        });
        // Mock getBoundDocumentUri for text editor
        mockDestination.getBoundDocumentUri = jest
          .fn()
          .mockReturnValue({ path: '/path/to/file.txt' });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
        (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(false);

        await service.pasteSelectedTextToDestination();

        const warningCall = (mockIdeAdapter.showWarningMessage as jest.Mock).mock.calls[0][0];
        expect(warningCall).toContain('editor');
      });

      it('should handle failure when destination is undefined', async () => {
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(undefined);
        (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(false);

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledWith(
          'RangeLink: Copied to clipboard. Could not send to destination.',
        );
      });
    });

    describe('timeout parameter', () => {
      beforeEach(() => {
        const selection = {
          isEmpty: false,
          _mockText: 'test',
        };
        mockEditor.selections = [selection];
      });

      it('should pass 2000ms timeout to setStatusBarMessage (no destination)', async () => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(false);

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expect.any(String), 2000);
      });

      it('should pass 2000ms timeout to setStatusBarMessage (destination success)', async () => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        const mockDestination = createMockDestination({
          id: 'terminal' as any,
          displayName: 'Terminal',
        });
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
        (mockDestinationManager.sendTextToDestination as jest.Mock).mockResolvedValue(true);

        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(expect.any(String), 2000);
      });
    });
  });

  describe('validateActiveTextEditor', () => {
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

    describe('when active text editor exists', () => {
      it('should return the active editor', () => {
        const mockEditor = {
          document: { uri: { fsPath: '/path/to/file.ts' } },
          selections: [],
        };
        (mockIdeAdapter as any).activeTextEditor = mockEditor;

        const result = (service as any).validateActiveTextEditor();

        expect(result).toBe(mockEditor);
      });

      it('should not show error message', () => {
        const mockEditor = {
          document: { uri: { fsPath: '/path/to/file.ts' } },
          selections: [],
        };
        (mockIdeAdapter as any).activeTextEditor = mockEditor;

        (service as any).validateActiveTextEditor();

        expect(mockIdeAdapter.showErrorMessage).not.toHaveBeenCalled();
      });
    });

    describe('when no active text editor exists', () => {
      beforeEach(() => {
        (mockIdeAdapter as any).activeTextEditor = undefined;
      });

      it('should return undefined', () => {
        const result = (service as any).validateActiveTextEditor();

        expect(result).toBeUndefined();
      });

      it('should show error message with "RangeLink: No active editor"', () => {
        (service as any).validateActiveTextEditor();

        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledWith('RangeLink: No active editor');
        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('integration with generateLinkFromSelection', () => {
      beforeEach(() => {
        // Mock all dependencies for generateLinkFromSelection
        (mockIdeAdapter as any).activeTextEditor = undefined;
        mockIdeAdapter.showErrorMessage = jest.fn().mockResolvedValue(undefined);
      });

      it('should show consistent error message when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(result).toBeNull();
        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledWith('RangeLink: No active editor');
        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });

      it('should return null early when no editor', async () => {
        const result = await (service as any).generateLinkFromSelection('workspace-relative', false);

        expect(result).toBeNull();
        // Verify we bailed early (no other adapter methods called)
        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('integration with pasteSelectedTextToDestination', () => {
      beforeEach(() => {
        // Mock all dependencies
        (mockIdeAdapter as any).activeTextEditor = undefined;
        mockIdeAdapter.showErrorMessage = jest.fn().mockResolvedValue(undefined);
        mockIdeAdapter.writeTextToClipboard = jest.fn().mockResolvedValue(undefined);
      });

      it('should show consistent error message when no editor', async () => {
        await service.pasteSelectedTextToDestination();

        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledWith('RangeLink: No active editor');
        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });

      it('should return early when no editor', async () => {
        await service.pasteSelectedTextToDestination();

        // Verify we bailed early (no clipboard or destination operations)
        expect(mockIdeAdapter.writeTextToClipboard).not.toHaveBeenCalled();
        expect(mockIdeAdapter.showErrorMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('error message consistency', () => {
      it('should use identical error message across all methods', () => {
        (mockIdeAdapter as any).activeTextEditor = undefined;

        // Call validateActiveTextEditor directly
        (service as any).validateActiveTextEditor();
        const directCall = (mockIdeAdapter.showErrorMessage as jest.Mock).mock.calls[0][0];

        // Reset mock
        (mockIdeAdapter.showErrorMessage as jest.Mock).mockClear();

        // Call via generateLinkFromSelection
        (service as any).generateLinkFromSelection('workspace-relative', false);
        const viaGenerateLink = (mockIdeAdapter.showErrorMessage as jest.Mock).mock.calls[0][0];

        // Reset mock
        (mockIdeAdapter.showErrorMessage as jest.Mock).mockClear();

        // Call via pasteSelectedTextToDestination
        service.pasteSelectedTextToDestination();
        const viaPasteText = (mockIdeAdapter.showErrorMessage as jest.Mock).mock.calls[0][0];

        // All three should be identical
        expect(directCall).toBe('RangeLink: No active editor');
        expect(viaGenerateLink).toBe('RangeLink: No active editor');
        expect(viaPasteText).toBe('RangeLink: No active editor');
        expect(directCall).toStrictEqual(viaGenerateLink);
        expect(viaGenerateLink).toStrictEqual(viaPasteText);
      });
    });
  });
});
