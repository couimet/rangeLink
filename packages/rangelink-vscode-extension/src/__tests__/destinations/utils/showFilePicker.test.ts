import * as vscode from 'vscode';
import { createMockLogger } from 'barebone-logger-testing';

import type { FilePickerHandlers } from '../../../destinations/types';
import { showFilePicker } from '../../../destinations/utils';
import type { EligibleFile, FileBindableQuickPickItem } from '../../../types';
import { createMockEligibleFile } from '../../helpers/createMockEligibleFile';
import { createMockQuickPickProvider } from '../../helpers';

const separator = (label: string): vscode.QuickPickItem => ({
  label,
  kind: vscode.QuickPickItemKind.Separator,
});

const createFileItems = (count: number): FileBindableQuickPickItem[] =>
  Array.from({ length: count }, (_, i) => {
    const fileInfo = createMockEligibleFile({ filename: `file-${i + 1}.ts`, isCurrentInGroup: true });
    return {
      label: fileInfo.filename,
      displayName: fileInfo.filename,
      description: undefined,
      bindOptions: { kind: 'text-editor', uri: fileInfo.uri, viewColumn: fileInfo.viewColumn },
      itemKind: 'bindable',
      fileInfo,
      boundState: fileInfo.boundState,
    };
  });

const withActiveSeparator = (
  items: FileBindableQuickPickItem[],
): (FileBindableQuickPickItem | vscode.QuickPickItem)[] => [separator('Active Files'), ...items];

describe('showFilePicker', () => {
  const identityCallback = (file: EligibleFile): EligibleFile => file;

  const createHandlers = <T>(
    onSelected: (file: EligibleFile) => T | Promise<T>,
    overrides: Partial<FilePickerHandlers<T>> = {},
  ): FilePickerHandlers<T> => ({
    onSelected,
    getPlaceholder: () => 'Choose a file to bind to',
    ...overrides,
  });

  describe('validation', () => {
    it('throws when called with empty file items', async () => {
      const quickPickProvider = createMockQuickPickProvider();
      const logger = createMockLogger();

      await expect(() =>
        showFilePicker([], quickPickProvider, createHandlers(identityCallback), logger),
      ).toThrowRangeLinkExtensionErrorAsync('FILE_PICKER_EMPTY_ITEMS', {
        message: 'showFilePicker called with no file items',
        functionName: 'showFilePicker',
      });
      expect(quickPickProvider.showQuickPick).not.toHaveBeenCalled();
    });
  });

  describe('file selection', () => {
    it('shows QuickPick with sectioned items and calls onSelected handler', async () => {
      const items = createFileItems(3);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(items[1]);
      const logger = createMockLogger();

      const result = await showFilePicker(
        items,
        quickPickProvider,
        createHandlers(identityCallback),
        logger,
      );

      expect(result).toStrictEqual(items[1].fileInfo);
      expect(quickPickProvider.showQuickPick).toHaveBeenCalledWith(withActiveSeparator(items), {
        title: 'RangeLink',
        placeHolder: 'Choose a file to bind to',
      });
      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showFilePicker', fileCount: 3, itemCount: 4 },
        'Showing file picker',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showFilePicker', selected: items[1] },
        'File selected',
      );
    });

    it('passes handler return value through as result', async () => {
      const items = createFileItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(items[0]);
      const logger = createMockLogger();

      const result = await showFilePicker(
        items,
        quickPickProvider,
        createHandlers((file) => ({ kind: 'text-editor' as const, name: file.filename })),
        logger,
      );

      expect(result).toStrictEqual({ kind: 'text-editor', name: 'file-1.ts' });
    });

    it('supports async onSelected handler', async () => {
      const items = createFileItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(items[0]);
      const logger = createMockLogger();

      const result = await showFilePicker(
        items,
        quickPickProvider,
        createHandlers(async (file) => `bound-${file.filename}`),
        logger,
      );

      expect(result).toBe('bound-file-1.ts');
    });

    it('uses placeholder from getPlaceholder handler', async () => {
      const items = createFileItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(items[0]);
      const logger = createMockLogger();

      await showFilePicker(
        items,
        quickPickProvider,
        createHandlers(identityCallback, {
          getPlaceholder: () => 'Custom file placeholder',
        }),
        logger,
      );

      expect(quickPickProvider.showQuickPick).toHaveBeenCalledWith(withActiveSeparator(items), {
        title: 'RangeLink',
        placeHolder: 'Custom file placeholder',
      });
    });

    it('returns undefined when a non-file item is selected', async () => {
      const items = createFileItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(
        separator('Active Files') as unknown as FileBindableQuickPickItem,
      );
      const logger = createMockLogger();

      const result = await showFilePicker(
        items,
        quickPickProvider,
        createHandlers(identityCallback),
        logger,
      );

      expect(result).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showFilePicker', fileCount: 2 },
        'User cancelled file picker',
      );
    });
  });

  describe('dismiss handling', () => {
    it('returns undefined when user dismisses and no onDismissed handler', async () => {
      const items = createFileItems(3);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showFilePicker(
        items,
        quickPickProvider,
        createHandlers(identityCallback),
        logger,
      );

      expect(result).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith(
        { fn: 'showFilePicker', fileCount: 3 },
        'User cancelled file picker',
      );
    });

    it('calls onDismissed handler when provided and user dismisses', async () => {
      const items = createFileItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showFilePicker(
        items,
        quickPickProvider,
        createHandlers((file) => file.filename, {
          onDismissed: () => 'dismissed-value',
        }),
        logger,
      );

      expect(result).toBe('dismissed-value');
      expect(logger.debug).not.toHaveBeenCalledWith(
        { fn: 'showFilePicker', fileCount: 2 },
        'User cancelled file picker',
      );
    });

    it('supports async onDismissed handler', async () => {
      const items = createFileItems(2);
      const quickPickProvider = createMockQuickPickProvider();
      quickPickProvider.showQuickPick.mockResolvedValueOnce(undefined);
      const logger = createMockLogger();

      const result = await showFilePicker(
        items,
        quickPickProvider,
        createHandlers(async (file) => file.filename, {
          onDismissed: async () => 'async-dismissed',
        }),
        logger,
      );

      expect(result).toBe('async-dismissed');
    });
  });
});
