import os from 'node:os';

import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import { DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { FilePathDocumentProvider } from '../../navigation/FilePathDocumentProvider';
import type { FilePathNavigationHandler } from '../../navigation/FilePathNavigationHandler';
import type { FilePathClickArgs } from '../../types';
import {
  createMockDocument,
  createMockFilePathNavigationHandler,
  createMockPositionAt,
  createMockText,
  createMockUri,
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

const GET_DELIMITERS = () => DEFAULT_DELIMITERS;

describe('FilePathDocumentProvider', () => {
  let provider: FilePathDocumentProvider;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockLogger: Logger;
  let mockHandler: jest.Mocked<FilePathNavigationHandler>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    mockHandler = createMockFilePathNavigationHandler();
    provider = new FilePathDocumentProvider(GET_DELIMITERS, mockHandler, mockAdapter, mockLogger);
  });

  describe('constructor', () => {
    it('should log initialization', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'FilePathDocumentProvider.constructor' },
        'FilePathDocumentProvider initialized',
      );
    });
  });

  describe('provideDocumentLinks', () => {
    it('should detect absolute path and create document link', () => {
      const document = createMockDocument({
        getText: createMockText('See /path/to/file.ts for details'),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toBe('Open /path/to/file.ts \u2022 RangeLink');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'FilePathDocumentProvider.provideDocumentLinks',
          documentUri: 'file:///test/doc.md',
          linksFound: 1,
        },
        'Found 1 file paths in document',
      );
    });

    it('should encode filePath in command URI', () => {
      const document = createMockDocument({
        getText: createMockText('See /path/to/file.ts for details'),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      const expectedArgs = encodeURIComponent(JSON.stringify([{ filePath: '/path/to/file.ts' }]));
      expect(links[0].target!.toString()).toBe(
        `command:rangelink.handleFilePathClick?${expectedArgs}`,
      );
    });

    it('should strip quotes from double-quoted path in command URI', () => {
      const document = createMockDocument({
        getText: createMockText('Open "/path/with spaces/file.ts" now'),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toBe('Open /path/with spaces/file.ts \u2022 RangeLink');
      const expectedArgs = encodeURIComponent(
        JSON.stringify([{ filePath: '/path/with spaces/file.ts' }]),
      );
      expect(links[0].target!.toString()).toBe(
        `command:rangelink.handleFilePathClick?${expectedArgs}`,
      );
    });

    it('should detect multiple paths in document', () => {
      const document = createMockDocument({
        getText: createMockText('From ./src/a.ts to ./src/b.ts'),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      expect(links).toHaveLength(2);
      expect(links[0].tooltip).toBe('Open /test/src/a.ts \u2022 RangeLink');
      expect(links[1].tooltip).toBe('Open /test/src/b.ts \u2022 RangeLink');
    });

    it('should detect parent-relative path', () => {
      const document = createMockDocument({
        getText: createMockText('Check ../src/file.ts please'),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toBe('Open /src/file.ts \u2022 RangeLink');
      const expectedArgs = encodeURIComponent(JSON.stringify([{ filePath: '../src/file.ts' }]));
      expect(links[0].target!.toString()).toBe(
        `command:rangelink.handleFilePathClick?${expectedArgs}`,
      );
    });

    it('should return empty array when no paths found', () => {
      const document = createMockDocument({
        getText: createMockText('No paths here at all'),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      expect(links).toStrictEqual([]);
    });

    it('should NOT match path inside URL', () => {
      const document = createMockDocument({
        getText: createMockText('See https://example.com/path/file.ts for info'),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      expect(links).toStrictEqual([]);
    });

    it('should detect single-quoted path and strip quotes from tooltip and command URI', () => {
      const document = createMockDocument({
        getText: createMockText("Open '/path/to/file.ts' now"),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toBe('Open /path/to/file.ts \u2022 RangeLink');
      const expectedArgs = encodeURIComponent(JSON.stringify([{ filePath: '/path/to/file.ts' }]));
      expect(links[0].target!.toString()).toBe(
        `command:rangelink.handleFilePathClick?${expectedArgs}`,
      );
    });

    it('should detect tilde path', () => {
      jest.spyOn(os, 'homedir').mockReturnValue('/home/user');

      const document = createMockDocument({
        getText: createMockText('Open ~/projects/app/main.ts now'),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      expect(links).toHaveLength(1);
      expect(links[0].tooltip).toBe('Open /home/user/projects/app/main.ts \u2022 RangeLink');
      const expectedArgs = encodeURIComponent(
        JSON.stringify([{ filePath: '~/projects/app/main.ts' }]),
      );
      expect(links[0].target!.toString()).toBe(
        `command:rangelink.handleFilePathClick?${expectedArgs}`,
      );
    });

    it('should NOT detect file path when path is a RangeLink (coexistence with RangeLinkDocumentProvider)', () => {
      const document = createMockDocument({
        getText: createMockText('./src/file.ts#L10'),
        uri: createMockUri('/test/doc.md'),
        positionAt: createMockPositionAt(),
      });

      const links = provider.provideDocumentLinks(document) as vscode.DocumentLink[];

      expect(links).toStrictEqual([]);
    });
  });

  describe('handleLinkClick', () => {
    it('should delegate to handler.navigateToFile', async () => {
      const args: FilePathClickArgs = { filePath: '/path/to/file.ts' };

      await provider.handleLinkClick(args);

      expect(mockHandler.navigateToFile).toHaveBeenCalledWith('/path/to/file.ts');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'FilePathDocumentProvider.handleLinkClick', filePath: '/path/to/file.ts' },
        'Document link clicked - delegating to handler',
      );
    });

    it('should log debug and swallow error when navigation fails', async () => {
      const navigationError = new Error('Failed to open');
      mockHandler.navigateToFile.mockRejectedValue(navigationError);

      const args: FilePathClickArgs = { filePath: '/path/to/file.ts' };

      await provider.handleLinkClick(args);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'FilePathDocumentProvider.handleLinkClick',
          filePath: '/path/to/file.ts',
          error: navigationError,
        },
        'Document link handling completed with error (already handled by navigation handler)',
      );
    });

    it('should not re-throw handler errors', async () => {
      mockHandler.navigateToFile.mockRejectedValue(new Error('Failed'));

      await expect(
        provider.handleLinkClick({ filePath: '/path/to/file.ts' }),
      ).resolves.toBeUndefined();
    });
  });
});
