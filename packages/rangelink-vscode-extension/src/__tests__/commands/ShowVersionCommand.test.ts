import { createMockLogger } from 'barebone-logger-testing';

import { ShowVersionCommand } from '../../commands/ShowVersionCommand';
import type { VersionInfo } from '../../types';
import { createMockClipboard, createMockVscodeAdapter } from '../helpers';

describe('ShowVersionCommand', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  const CLEAN_VERSION_INFO: VersionInfo = {
    version: '1.0.0',
    commit: 'abc123',
    commitFull: 'abc123def456789',
    branch: 'main',
    buildDate: '2025-01-16',
    isDirty: false,
  };

  const DIRTY_VERSION_INFO: VersionInfo = {
    ...CLEAN_VERSION_INFO,
    isDirty: true,
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      const mockAdapter = createMockVscodeAdapter();

      new ShowVersionCommand(mockAdapter, mockLogger, CLEAN_VERSION_INFO);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ShowVersionCommand.constructor' },
        'ShowVersionCommand initialized',
      );
    });
  });

  describe('execute()', () => {
    describe('when version info is not available', () => {
      it('shows error message', async () => {
        const mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showErrorMessage: mockShowErrorMessage,
          },
        });
        const command = new ShowVersionCommand(mockAdapter, mockLogger, undefined);

        await command.execute();

        expect(mockShowErrorMessage).toHaveBeenCalledWith('Version information not available');
        expect(mockLogger.error).toHaveBeenCalledWith(
          { fn: 'ShowVersionCommand.execute' },
          'Failed to load version info',
        );
      });
    });

    describe('when version info is available (clean build)', () => {
      it('shows version info message with copy button', async () => {
        const mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInformationMessage: mockShowInformationMessage,
          },
        });
        const command = new ShowVersionCommand(mockAdapter, mockLogger, CLEAN_VERSION_INFO);

        await command.execute();

        expect(mockShowInformationMessage).toHaveBeenCalledWith(
          'RangeLink v1.0.0\nCommit: abc123\nBranch: main\nBuild: 2025-01-16',
          'Copy Commit Hash',
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'ShowVersionCommand.execute',
            version: '1.0.0',
            commit: 'abc123',
            buildDate: '2025-01-16',
          },
          'Version info displayed',
        );
      });
    });

    describe('when version info is available (dirty build)', () => {
      it('shows version info with dirty indicator', async () => {
        const mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInformationMessage: mockShowInformationMessage,
          },
        });
        const command = new ShowVersionCommand(mockAdapter, mockLogger, DIRTY_VERSION_INFO);

        await command.execute();

        expect(mockShowInformationMessage).toHaveBeenCalledWith(
          'RangeLink v1.0.0\nCommit: abc123 (with uncommitted changes)\nBranch: main\nBuild: 2025-01-16',
          'Copy Commit Hash',
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'ShowVersionCommand.execute',
            version: '1.0.0',
            commit: 'abc123',
            buildDate: '2025-01-16',
          },
          'Version info displayed',
        );
      });
    });

    describe('when user clicks copy button', () => {
      it('copies full commit hash to clipboard and shows confirmation', async () => {
        const mockShowInformationMessage = jest
          .fn()
          .mockResolvedValueOnce('Copy Commit Hash')
          .mockResolvedValueOnce(undefined);
        const mockClipboard = createMockClipboard();
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInformationMessage: mockShowInformationMessage,
          },
          envOptions: {
            clipboard: mockClipboard,
          },
        });
        const command = new ShowVersionCommand(mockAdapter, mockLogger, CLEAN_VERSION_INFO);

        await command.execute();

        expect(mockClipboard.writeText).toHaveBeenCalledWith('abc123def456789');
        expect(mockShowInformationMessage).toHaveBeenCalledWith('Commit hash copied to clipboard');
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'ShowVersionCommand.execute',
            version: '1.0.0',
            commit: 'abc123',
            buildDate: '2025-01-16',
          },
          'Version info displayed',
        );
      });
    });

    describe('when user dismisses dialog', () => {
      it('does not copy to clipboard', async () => {
        const mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
        const mockClipboard = createMockClipboard();
        const mockAdapter = createMockVscodeAdapter({
          windowOptions: {
            showInformationMessage: mockShowInformationMessage,
          },
          envOptions: {
            clipboard: mockClipboard,
          },
        });
        const command = new ShowVersionCommand(mockAdapter, mockLogger, CLEAN_VERSION_INFO);

        await command.execute();

        expect(mockClipboard.writeText).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'ShowVersionCommand.execute',
            version: '1.0.0',
            commit: 'abc123',
            buildDate: '2025-01-16',
          },
          'Version info displayed',
        );
      });
    });
  });
});
