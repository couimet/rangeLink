import os from 'node:os';

import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import { DEFAULT_DELIMITERS, buildFilePathPattern, extractFilePath } from 'rangelink-core-ts';

import { FilePathNavigationHandler } from '../../navigation/FilePathNavigationHandler';
import {
  createMockUri,
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

describe('FilePathNavigationHandler', () => {
  let handler: FilePathNavigationHandler;
  let mockLogger: Logger;
  let mockAdapter: VscodeAdapterWithTestHooks;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    handler = new FilePathNavigationHandler(mockAdapter, mockLogger);
  });

  describe('constructor', () => {
    it('should log initialization', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'FilePathNavigationHandler.constructor' },
        'FilePathNavigationHandler initialized',
      );
    });
  });

  describe('buildFilePathPattern', () => {
    const matchesPattern = (text: string): string[] => {
      const pattern = buildFilePathPattern(DEFAULT_DELIMITERS);
      const results: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        results.push(extractFilePath(match));
      }
      return results;
    };

    describe('quoted paths', () => {
      it('should match double-quoted path', () => {
        expect(matchesPattern('Check "/path/to/file.ts" for details')).toStrictEqual([
          '/path/to/file.ts',
        ]);
      });

      it('should match single-quoted path', () => {
        expect(matchesPattern("Check '/path/to/file.ts' for details")).toStrictEqual([
          '/path/to/file.ts',
        ]);
      });

      it('should match double-quoted path with spaces', () => {
        expect(matchesPattern('Open "/path/with spaces/file.ts" now')).toStrictEqual([
          '/path/with spaces/file.ts',
        ]);
      });
    });

    describe('absolute paths', () => {
      it('should match absolute path', () => {
        expect(matchesPattern('See /path/to/file.ts for details')).toStrictEqual([
          '/path/to/file.ts',
        ]);
      });

      it('should match absolute path with hyphens and dots', () => {
        expect(matchesPattern('/path/to/my-file.test.ts')).toStrictEqual([
          '/path/to/my-file.test.ts',
        ]);
      });

      it('should NOT match absolute path inside a URL', () => {
        expect(matchesPattern('See https://example.com/path/file.ts for info')).toStrictEqual([]);
      });
    });

    describe('relative paths', () => {
      it('should match ./ relative path', () => {
        expect(matchesPattern('Check ./src/file.ts please')).toStrictEqual(['./src/file.ts']);
      });

      it('should match ../ relative path', () => {
        expect(matchesPattern('Check ../lib/util.ts please')).toStrictEqual(['../lib/util.ts']);
      });
    });

    describe('tilde paths', () => {
      it('should match ~/path', () => {
        expect(matchesPattern('Open ~/projects/app/main.ts now')).toStrictEqual([
          '~/projects/app/main.ts',
        ]);
      });
    });

    describe('non-matching patterns', () => {
      it('should NOT match bare relative path (no ./ prefix)', () => {
        expect(matchesPattern('Check src/file.ts#L10 for the bug')).toStrictEqual([]);
      });

      it('should NOT match RangeLink format', () => {
        expect(matchesPattern('src/auth.ts#L42-L50')).toStrictEqual([]);
      });

      it('should NOT match plain text without extension', () => {
        expect(matchesPattern('no paths here at all')).toStrictEqual([]);
      });
    });

    describe('multiple matches', () => {
      it('should match multiple paths in one line', () => {
        expect(matchesPattern('From ./src/a.ts to ./src/b.ts')).toStrictEqual([
          './src/a.ts',
          './src/b.ts',
        ]);
      });
    });
  });

  describe('navigateToFile', () => {
    it('should resolve path and open file', async () => {
      const fileUri = createMockUri('/resolved/file.ts');
      const resolveWorkspacePathSpy = jest
        .spyOn(mockAdapter, 'resolveWorkspacePath')
        .mockResolvedValue(fileUri);
      const showTextDocumentSpy = jest
        .spyOn(mockAdapter, 'showTextDocument')
        .mockResolvedValue(undefined as any);

      await handler.navigateToFile('/resolved/file.ts');

      expect(resolveWorkspacePathSpy).toHaveBeenCalledWith('/resolved/file.ts');
      expect(showTextDocumentSpy).toHaveBeenCalledWith(fileUri);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'FilePathNavigationHandler.navigateToFile', rawPath: '/resolved/file.ts' },
        'Navigation completed successfully',
      );
    });

    it('should show warning when file cannot be resolved', async () => {
      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(undefined);
      const showWarningMessageSpy = jest
        .spyOn(mockAdapter, 'showWarningMessage')
        .mockResolvedValue(undefined);

      await handler.navigateToFile('/nonexistent/file.ts');

      expect(showWarningMessageSpy).toHaveBeenCalledWith(
        'RangeLink: Cannot find file: /nonexistent/file.ts',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'FilePathNavigationHandler.navigateToFile',
          rawPath: '/nonexistent/file.ts',
          expandedPath: '/nonexistent/file.ts',
        },
        'Cannot resolve file path',
      );
    });

    it('should expand tilde and resolve expanded path', async () => {
      const homeDir = os.homedir();
      const fileUri = createMockUri(`${homeDir}/projects/file.ts`);
      const resolveWorkspacePathSpy = jest
        .spyOn(mockAdapter, 'resolveWorkspacePath')
        .mockResolvedValue(fileUri);
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(undefined as any);

      await handler.navigateToFile('~/projects/file.ts');

      expect(resolveWorkspacePathSpy).toHaveBeenCalledWith(`${homeDir}/projects/file.ts`);
    });

    it('should show error message and rethrow on showTextDocument failure', async () => {
      const fileUri = createMockUri('/path/file.ts');
      jest.spyOn(mockAdapter, 'resolveWorkspacePath').mockResolvedValue(fileUri);
      const navigationError = new Error('Failed to open document');
      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(navigationError);
      const showErrorMessageSpy = jest
        .spyOn(mockAdapter, 'showErrorMessage')
        .mockResolvedValue(undefined);

      await expect(handler.navigateToFile('/path/file.ts')).rejects.toThrow(navigationError);

      expect(showErrorMessageSpy).toHaveBeenCalledWith(
        'RangeLink: Failed to open file /path/file.ts: Failed to open document',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'FilePathNavigationHandler.navigateToFile',
          rawPath: '/path/file.ts',
          error: navigationError,
        },
        'Navigation failed',
      );
    });
  });
});
