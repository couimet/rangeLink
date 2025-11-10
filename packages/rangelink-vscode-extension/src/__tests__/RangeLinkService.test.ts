import type { DelimiterConfig } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { IdeAdapter } from '../ide/IdeAdapter';
import { RangeLinkService } from '../RangeLinkService';

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
      };

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

        expect(mockDestinationManager.sendToDestination).not.toHaveBeenCalled();
      });
    });

    describe('when destination is bound and paste succeeds', () => {
      beforeEach(() => {
        const mockDestination = {
          displayName: 'bash',
        };

        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        (mockDestinationManager.sendToDestination as jest.Mock).mockResolvedValue(true);
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(mockDestination);
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

        expect(mockDestinationManager.sendToDestination).toHaveBeenCalledWith(link);
        expect(mockDestinationManager.sendToDestination).toHaveBeenCalledTimes(1);
      });

      it('should show status message with destination name', async () => {
        const link = 'src/auth.ts#L10';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to bash',
          2000,
        );
      });

      it('should use destination displayName from getBoundDestination()', async () => {
        const customDestination = { displayName: 'Terminal' };
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(
          customDestination,
        );

        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to Terminal',
          2000,
        );
      });

      it('should use "destination" as fallback when destination has no displayName', async () => {
        const unknownDestination = {};
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue(
          unknownDestination,
        );

        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard & sent to destination',
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
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        (mockDestinationManager.sendToDestination as jest.Mock).mockResolvedValue(false);
      });

      it('should copy link to clipboard', async () => {
        const link = 'src/auth.ts#L10-L20';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockIdeAdapter.writeTextToClipboard).toHaveBeenCalledWith(link);
      });

      it('should attempt to send to terminal', async () => {
        const link = 'src/auth.ts#L10-L20';

        await (service as any).copyAndNotify(link, 'RangeLink');

        expect(mockDestinationManager.sendToDestination).toHaveBeenCalledWith(link);
      });

      it('should show warning message about paste failure', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledWith(
          '✓ RangeLink copied to clipboard; BUT failed to send to bound destination.',
        );
        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledTimes(1);
      });

      it('should include link type name in warning message', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'Portable RangeLink');

        expect(mockIdeAdapter.showWarningMessage).toHaveBeenCalledWith(
          '✓ Portable RangeLink copied to clipboard; BUT failed to send to bound destination.',
        );
      });

      it('should not call setStatusBarMessage when paste fails', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(false);
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
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(false);
      });

      it('should pass 2000ms timeout to setStatusBarMessage', async () => {
        await (service as any).copyAndNotify('src/file.ts#L1', 'RangeLink');

        expect(mockIdeAdapter.setStatusBarMessage).toHaveBeenCalledWith(
          expect.any(String),
          2000,
        );
      });

      it('should pass 2000ms timeout when destination is bound and succeeds', async () => {
        (mockDestinationManager.isBound as jest.Mock).mockReturnValue(true);
        (mockDestinationManager.sendToDestination as jest.Mock).mockReturnValue(true);
        (mockDestinationManager.getBoundDestination as jest.Mock).mockReturnValue({
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
