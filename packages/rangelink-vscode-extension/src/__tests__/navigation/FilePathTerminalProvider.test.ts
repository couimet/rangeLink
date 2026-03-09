import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import type { FilePathNavigationHandler } from '../../navigation/FilePathNavigationHandler';
import { FilePathTerminalProvider } from '../../navigation/FilePathTerminalProvider';
import type { FilePathTerminalLink } from '../../types';
import { createMockFilePathNavigationHandler } from '../helpers';

const createMockTerminalContext = (line: string): vscode.TerminalLinkContext =>
  ({ line }) as vscode.TerminalLinkContext;

describe('FilePathTerminalProvider', () => {
  let provider: FilePathTerminalProvider;
  let mockLogger: Logger;
  let mockHandler: jest.Mocked<FilePathNavigationHandler>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockHandler = createMockFilePathNavigationHandler();
    provider = new FilePathTerminalProvider(mockHandler, mockLogger);
  });

  describe('constructor', () => {
    it('should log initialization', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'FilePathTerminalProvider.constructor' },
        'FilePathTerminalProvider initialized',
      );
    });
  });

  describe('provideTerminalLinks', () => {
    it('should detect absolute path', () => {
      const context = createMockTerminalContext('See /path/to/file.ts for details');
      const links = provider.provideTerminalLinks(context) as FilePathTerminalLink[];

      expect(links).toStrictEqual([
        {
          startIndex: 4,
          length: 16,
          tooltip: 'Open /path/to/file.ts \u2022 RangeLink',
          data: '/path/to/file.ts',
        },
      ]);
    });

    it('should detect relative path', () => {
      const context = createMockTerminalContext('Check ./src/file.ts please');
      const links = provider.provideTerminalLinks(context) as FilePathTerminalLink[];

      expect(links).toStrictEqual([
        {
          startIndex: 6,
          length: 13,
          tooltip: 'Open ./src/file.ts \u2022 RangeLink',
          data: './src/file.ts',
        },
      ]);
    });

    it('should detect double-quoted path and strip quotes from data', () => {
      const context = createMockTerminalContext('Open "/path/with spaces/file.ts" now');
      const links = provider.provideTerminalLinks(context) as FilePathTerminalLink[];

      expect(links).toStrictEqual([
        {
          startIndex: 5,
          length: 27,
          tooltip: 'Open /path/with spaces/file.ts \u2022 RangeLink',
          data: '/path/with spaces/file.ts',
        },
      ]);
    });

    it('should detect multiple paths in one line', () => {
      const context = createMockTerminalContext('From ./src/a.ts to ./src/b.ts');
      const links = provider.provideTerminalLinks(context) as FilePathTerminalLink[];

      expect(links).toHaveLength(2);
      expect(links[0].data).toBe('./src/a.ts');
      expect(links[1].data).toBe('./src/b.ts');
    });

    it('should return empty array when no paths found', () => {
      const context = createMockTerminalContext('No paths here at all');
      const links = provider.provideTerminalLinks(context) as FilePathTerminalLink[];

      expect(links).toStrictEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'FilePathTerminalProvider.provideTerminalLinks',
          lineLength: 20,
          linksFound: 0,
        },
        'Scanned terminal line for file paths',
      );
    });

    it('should log scan result', () => {
      const context = createMockTerminalContext('See /path/to/file.ts');
      provider.provideTerminalLinks(context);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'FilePathTerminalProvider.provideTerminalLinks',
          lineLength: 20,
          linksFound: 1,
        },
        'Scanned terminal line for file paths',
      );
    });

    it('should NOT match path inside URL', () => {
      const context = createMockTerminalContext('See https://example.com/path/file.ts for info');
      const links = provider.provideTerminalLinks(context) as FilePathTerminalLink[];

      expect(links).toStrictEqual([]);
    });
  });

  describe('handleTerminalLink', () => {
    it('should delegate to handler.navigateToFile', async () => {
      const link: FilePathTerminalLink = {
        startIndex: 0,
        length: 16,
        tooltip: 'Open /path/file.ts • RangeLink',
        data: '/path/file.ts',
      };

      await provider.handleTerminalLink(link);

      expect(mockHandler.navigateToFile).toHaveBeenCalledWith('/path/file.ts');
    });

    it('should log debug and swallow error when navigation fails', async () => {
      const navigationError = new Error('Failed to open');
      mockHandler.navigateToFile.mockRejectedValue(navigationError);

      const link: FilePathTerminalLink = {
        startIndex: 0,
        length: 13,
        tooltip: 'Open /path/file.ts • RangeLink',
        data: '/path/file.ts',
      };

      await provider.handleTerminalLink(link);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'FilePathTerminalProvider.handleTerminalLink', error: navigationError },
        'Terminal link handling completed with error (already handled by navigation handler)',
      );
    });
  });
});
