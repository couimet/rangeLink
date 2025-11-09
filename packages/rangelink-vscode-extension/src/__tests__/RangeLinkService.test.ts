import type { DelimiterConfig } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { IdeAdapter } from '../ide/IdeAdapter';
import { RangeLinkService } from '../RangeLinkService';
import type { TerminalBindingManager } from '../TerminalBindingManager';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    activeTextEditor: undefined,
    showErrorMessage: jest.fn(),
  },
  workspace: {
    getWorkspaceFolder: jest.fn(),
    asRelativePath: jest.fn(),
  },
}));

describe('RangeLinkService', () => {
  describe('copyAndNotify', () => {
    let service: RangeLinkService;
    let mockIdeAdapter: IdeAdapter;
    let mockTerminalBindingManager: TerminalBindingManager;
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
      };

      // Create mock terminal binding manager
      mockTerminalBindingManager = {
        isBound: jest.fn().mockReturnValue(false),
        sendToTerminal: jest.fn(),
        getBoundTerminal: jest.fn(),
      } as unknown as TerminalBindingManager;

      // Create service
      service = new RangeLinkService(delimiters, mockIdeAdapter, mockTerminalBindingManager);

      jest.clearAllMocks();
    });

    describe('when no destination is bound', () => {
      beforeEach(() => {
        (mockTerminalBindingManager.isBound as jest.Mock).mockReturnValue(false);
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';

        // Access private method via any cast for testing
        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
      });

      it('should show status message with "copied to clipboard"', async () => {
        const link = 'src/auth.ts#L10-L20';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledTimes(1);
      });

      it('should use link type name in status message (RangeLink)', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard',
          2000,
        );
      });

      it('should use link type name in status message (Portable RangeLink)', async () => {
        const link = 'src/auth.ts#L10{L:LINE,C:COL}';

        await (service as any).copyAndNotify(link, 'Portable RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Portable RangeLink copied to clipboard',
          2000,
        );
      });

      it('should not call showWarningMessage', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockIdeAdapter.showWarningMessage).not.toHaveBeenCalled();
      });

      it('should not send to terminal', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockTerminalBindingManager.sendToTerminal).not.toHaveBeenCalled();
      });
    });

    describe('when destination is bound and paste succeeds', () => {
      let mockTerminal: vscode.Terminal;

      beforeEach(() => {
        mockTerminal = {
          name: 'bash',
          sendText: jest.fn(),
          show: jest.fn(),
        } as unknown as vscode.Terminal;

        (mockTerminalBindingManager.isBound as jest.Mock).mockReturnValue(true);
        (mockTerminalBindingManager.sendToTerminal as jest.Mock).mockReturnValue(true);
        (mockTerminalBindingManager.getBoundTerminal as jest.Mock).mockReturnValue(mockTerminal);
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledTimes(1);
      });

      it('should send link to terminal', async () => {
        const link = 'src/auth.ts#L10-L20';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockTerminalBindingManager.sendToTerminal).toHaveBeenCalledWith(link);
        expect(mockTerminalBindingManager.sendToTerminal).toHaveBeenCalledTimes(1);
      });

      it('should show status message with terminal name', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to bash',
          2000,
        );
      });

      it('should use terminal name from getBoundTerminal()', async () => {
        const customTerminal = { name: 'zsh' } as vscode.Terminal;
        (mockTerminalBindingManager.getBoundTerminal as jest.Mock).mockReturnValue(customTerminal);

        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to zsh',
          2000,
        );
      });

      it('should use "terminal" as fallback when terminal has no name', async () => {
        const unnamedTerminal = {} as vscode.Terminal;
        (mockTerminalBindingManager.getBoundTerminal as jest.Mock).mockReturnValue(
          unnamedTerminal,
        );

        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to terminal',
          2000,
        );
      });

      it('should not call showWarningMessage on success', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.showWarningMessage).not.toHaveBeenCalled();
      });

      it('should call methods in correct order: clipboard then terminal then status', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyAndNotify(link, 'RangeLink');

        // Verify call order
        const clipboardCall = (mockIdeAdapter.writeTextToClipboard as jest.Mock).mock
          .invocationCallOrder[0];
        const terminalCall = (mockTerminalBindingManager.sendToTerminal as jest.Mock).mock
          .invocationCallOrder[0];
        const statusCall = (mockIdeAdapter.setStatusBarMessage as jest.Mock).mock
          .invocationCallOrder[0];

        expect(clipboardCall).toBeLessThan(terminalCall);
        expect(terminalCall).toBeLessThan(statusCall);
      });
    });

    describe('when destination is bound but paste fails', () => {
      beforeEach(() => {
        (mockTerminalBindingManager.isBound as jest.Mock).mockReturnValue(true);
        (mockTerminalBindingManager.sendToTerminal as jest.Mock).mockReturnValue(false);
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
      });

      it('should attempt to send to terminal', async () => {
        const link = 'src/auth.ts#L10-L20';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockTerminalBindingManager.sendToTerminal).toHaveBeenCalledWith(link);
      });

      it('should show warning message about paste failure', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard; BUT failed to send to bound terminal.',
        );
        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledTimes(1);
      });

      it('should include link type name in warning message', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'Portable RangeLink');

        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledWith(
          '✓ Portable RangeLink copied to clipboard; BUT failed to send to bound terminal.',
        );
      });

      it('should not call setStatusBarMessage when paste fails', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        (mockTerminalBindingManager.isBound as jest.Mock).mockReturnValue(false);
      });

      it('should handle empty link string', async () => {
        await (service as any).copyAndNotify('', 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith('');
        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalled();
      });

      it('should handle very long link strings', async () => {
        const longLink = 'src/' + 'a'.repeat(500) + '.ts#L1000-L2000';

        await (service as any).copyAndNotify(longLink, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(longLink);
      });

      it('should handle special characters in link', async () => {
        const specialLink = 'src/file#123.ts##L10C5-L20C10';

        await (service as any).copyAndNotify(specialLink, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(specialLink);
      });

      it('should handle special characters in link type name', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'Custom <Type> Name');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ Custom <Type> Name copied to clipboard',
          2000,
        );
      });
    });

    describe('timeout parameter', () => {
      beforeEach(() => {
        (mockTerminalBindingManager.isBound as jest.Mock).mockReturnValue(false);
      });

      it('should pass 2000ms timeout to setStatusBarMessage', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.any(String),
          2000,
        );
      });

      it('should pass 2000ms timeout when destination is bound and succeeds', async () => {
        (mockTerminalBindingManager.isBound as jest.Mock).mockReturnValue(true);
        (mockTerminalBindingManager.sendToTerminal as jest.Mock).mockReturnValue(true);
        (mockTerminalBindingManager.getBoundTerminal as jest.Mock).mockReturnValue({
          name: 'bash',
        });

        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.any(String),
          2000,
        );
      });
    });
  });
});
