import { createMockLogger } from 'barebone-logger-testing';

import { BindToTextEditorCommand } from '../../commands';
import type { BoundSession } from '../../destinations';
import type { FilePickerHandlers } from '../../destinations/types';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import { ExtensionResult } from '../../types';
import type { FileBindableQuickPickItem } from '../../types';
import {
  createMockDestinationAvailabilityService,
  createMockDestinationManager,
  createMockEditor,
  createMockEditorComposablePasteDestination,
  createMockEligibleFile,
  createMockTab,
  createMockTabGroup,
  createMockTabGroups,
  createMockTextEditorQuickPickItem,
  createMockUri,
  createMockVscodeAdapter,
  spyOnShowFilePicker,
} from '../helpers';
import { createMockBoundSession } from '../helpers';

describe('BindToTextEditorCommand', () => {
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let mockAvailabilityService: ReturnType<typeof createMockDestinationAvailabilityService>;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockSession: jest.Mocked<BoundSession>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let showFilePickerSpy: jest.SpyInstance;
  let command: BindToTextEditorCommand;

  beforeEach(() => {
    mockAdapter = createMockVscodeAdapter();
    mockAvailabilityService = createMockDestinationAvailabilityService();
    mockDestinationManager = createMockDestinationManager();
    mockSession = createMockBoundSession();
    mockLogger = createMockLogger();
    showFilePickerSpy = spyOnShowFilePicker();
    command = new BindToTextEditorCommand(
      mockAdapter,
      mockAvailabilityService,
      mockDestinationManager,
      mockSession,
      mockLogger,
    );
  });

  it('logs initialization in constructor', () => {
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'BindToTextEditorCommand.constructor' },
      'BindToTextEditorCommand initialized',
    );
  });

  describe('executeWithPicker (no URI)', () => {
    it('shows error and returns no-resource when no files are available', async () => {
      mockAvailabilityService.getAllFileItems.mockReturnValue([]);
      const showErrorMessageMock = mockAdapter.__getVscodeInstance().window
        .showErrorMessage as jest.Mock;

      const result = await command.execute();

      expect(result).toStrictEqual({ outcome: 'no-resource' });
      expect(showErrorMessageMock).toHaveBeenCalledWith(
        'No bindable text editor. Open a file and try again.',
      );
      expect(showFilePickerSpy).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTextEditorCommand.executeWithPicker' },
        'No files available',
      );
    });

    it('auto-binds without showing a picker when only 1 file is available', async () => {
      const eligibleFile = createMockEligibleFile({ filename: 'app.ts', viewColumn: 1 });
      const fileItem = createMockTextEditorQuickPickItem(eligibleFile);
      mockAvailabilityService.getAllFileItems.mockReturnValue([fileItem]);
      mockDestinationManager.bind.mockResolvedValue(
        ExtensionResult.ok({ destinationName: 'app.ts', destinationKind: 'text-editor' }),
      );

      const result = await command.execute();

      expect(showFilePickerSpy).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        outcome: 'bound',
        bindInfo: { destinationName: 'app.ts', destinationKind: 'text-editor' },
      });
      expect(mockDestinationManager.bind).toHaveBeenCalledWith(eligibleFile.bindOptions);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTextEditorCommand.executeWithPicker', filename: 'app.ts' },
        'Single file, auto-binding',
      );
    });

    it('returns cancelled when user dismisses the file picker', async () => {
      const eligibleFile1 = createMockEligibleFile({ filename: 'index.ts', viewColumn: 1 });
      const eligibleFile2 = createMockEligibleFile({ filename: 'app.ts', viewColumn: 2 });
      mockAvailabilityService.getAllFileItems.mockReturnValue([
        createMockTextEditorQuickPickItem(eligibleFile1),
        createMockTextEditorQuickPickItem(eligibleFile2),
      ]);
      showFilePickerSpy.mockResolvedValue(undefined);

      const result = await command.execute();

      expect(result).toStrictEqual({ outcome: 'cancelled' });
      expect(mockDestinationManager.bind).not.toHaveBeenCalled();
    });

    it('returns bound when user selects a file from the picker and bind succeeds', async () => {
      const eligibleFile1 = createMockEligibleFile({ filename: 'main.ts', viewColumn: 1 });
      const eligibleFile2 = createMockEligibleFile({ filename: 'utils.ts', viewColumn: 2 });
      mockAvailabilityService.getAllFileItems.mockReturnValue([
        createMockTextEditorQuickPickItem(eligibleFile1),
        createMockTextEditorQuickPickItem(eligibleFile2),
      ]);
      mockDestinationManager.bind.mockResolvedValue(
        ExtensionResult.ok({ destinationName: 'utils.ts', destinationKind: 'text-editor' }),
      );
      showFilePickerSpy.mockImplementation(
        async (
          _files: readonly FileBindableQuickPickItem[],
          _provider: unknown,
          handlers: FilePickerHandlers<unknown>,
          _logger: unknown,
        ) => handlers.onSelected(eligibleFile2),
      );

      const result = await command.execute();

      expect(result).toStrictEqual({
        outcome: 'bound',
        bindInfo: { destinationName: 'utils.ts', destinationKind: 'text-editor' },
      });
      expect(mockDestinationManager.bind).toHaveBeenCalledWith(eligibleFile2.bindOptions);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTextEditorCommand.executeWithPicker', fileCount: 2 },
        'Starting bind to text editor command',
      );
    });

    it('returns bind-failed when bind fails after selection from the picker', async () => {
      const eligibleFile1 = createMockEligibleFile({ filename: 'a.ts', viewColumn: 1 });
      const eligibleFile2 = createMockEligibleFile({ filename: 'b.ts', viewColumn: 2 });
      mockAvailabilityService.getAllFileItems.mockReturnValue([
        createMockTextEditorQuickPickItem(eligibleFile1),
        createMockTextEditorQuickPickItem(eligibleFile2),
      ]);
      const bindError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
        message: 'Bind failed',
        functionName: 'PasteDestinationManager.bind',
      });
      mockDestinationManager.bind.mockResolvedValue(ExtensionResult.err(bindError));
      showFilePickerSpy.mockImplementation(
        async (
          _files: readonly FileBindableQuickPickItem[],
          _provider: unknown,
          handlers: FilePickerHandlers<unknown>,
          _logger: unknown,
        ) => handlers.onSelected(eligibleFile1),
      );

      const result = await command.execute();

      expect(result).toStrictEqual({ outcome: 'bind-failed', error: bindError });
    });

    it('passes bound editor uri and viewColumn to getAllFileItems when an editor is bound', async () => {
      const mockUri = createMockUri('/workspace/src/bound.ts');
      const boundEditorDest = createMockEditorComposablePasteDestination({
        uri: mockUri,
        viewColumn: 3,
      });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(boundEditorDest);
      mockAvailabilityService.getAllFileItems.mockReturnValue([]);
      command = new BindToTextEditorCommand(
        mockAdapter,
        mockAvailabilityService,
        mockDestinationManager,
        mockSession,
        mockLogger,
      );

      await command.execute();

      expect(mockAvailabilityService.getAllFileItems).toHaveBeenCalledWith(
        'file:///workspace/src/bound.ts',
        3,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTextEditorCommand.executeWithPicker', fileCount: 0 },
        'Starting bind to text editor command',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTextEditorCommand.executeWithPicker' },
        'No files available',
      );
    });

    it('passes no bound state to getAllFileItems when nothing is bound', async () => {
      mockAvailabilityService.getAllFileItems.mockReturnValue([]);

      await command.execute();

      expect(mockAvailabilityService.getAllFileItems).toHaveBeenCalledWith(undefined, undefined);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTextEditorCommand.executeWithPicker', fileCount: 0 },
        'Starting bind to text editor command',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTextEditorCommand.executeWithPicker' },
        'No files available',
      );
    });

    it('invokes getPlaceholder callback when multiple files trigger the picker', async () => {
      const eligibleFile1 = createMockEligibleFile({ filename: 'a.ts', viewColumn: 1 });
      const eligibleFile2 = createMockEligibleFile({ filename: 'b.ts', viewColumn: 2 });
      mockAvailabilityService.getAllFileItems.mockReturnValue([
        createMockTextEditorQuickPickItem(eligibleFile1),
        createMockTextEditorQuickPickItem(eligibleFile2),
      ]);
      showFilePickerSpy.mockImplementation(
        async (
          _files: readonly FileBindableQuickPickItem[],
          _provider: unknown,
          handlers: FilePickerHandlers<unknown>,
        ) => {
          const placeholder = handlers.getPlaceholder();
          expect(placeholder).toBe('Select file to bind to');
          return undefined;
        },
      );

      await command.execute();

      expect(showFilePickerSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeWithUri (explorer context menu)', () => {
    it('opens file and binds when file is not in any tab group', async () => {
      const uri = createMockUri('/workspace/src/new-file.ts');
      const mockEditor = createMockEditor({ viewColumn: 1 });
      const showTextDocSpy = jest
        .spyOn(mockAdapter, 'showTextDocument')
        .mockResolvedValue(mockEditor);
      const vscodeInstance = mockAdapter.__getVscodeInstance();
      vscodeInstance.window.tabGroups = createMockTabGroups({ all: [] });
      mockDestinationManager.bind.mockResolvedValue(
        ExtensionResult.ok({ destinationName: 'new-file.ts', destinationKind: 'text-editor' }),
      );

      const result = await command.execute(uri);

      expect(result).toStrictEqual({
        outcome: 'bound',
        bindInfo: { destinationName: 'new-file.ts', destinationKind: 'text-editor' },
      });
      expect(showTextDocSpy).toHaveBeenCalledWith(uri, undefined);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTextEditorCommand.executeWithUri', matchCount: 0 },
        'Found tab groups containing URI',
      );
    });

    it('focuses existing tab group when file is in exactly one group', async () => {
      const uri = createMockUri('/workspace/src/existing.ts');
      const tab = createMockTab(uri);
      const group = createMockTabGroup([tab], { viewColumn: 2 });
      const mockEditor = createMockEditor({ viewColumn: 2 });
      const showTextDocSpy = jest
        .spyOn(mockAdapter, 'showTextDocument')
        .mockResolvedValue(mockEditor);
      const vscodeInstance = mockAdapter.__getVscodeInstance();
      vscodeInstance.window.tabGroups = createMockTabGroups({ all: [group] });
      mockDestinationManager.bind.mockResolvedValue(
        ExtensionResult.ok({ destinationName: 'existing.ts', destinationKind: 'text-editor' }),
      );

      const result = await command.execute(uri);

      expect(result).toStrictEqual({
        outcome: 'bound',
        bindInfo: { destinationName: 'existing.ts', destinationKind: 'text-editor' },
      });
      expect(showTextDocSpy).toHaveBeenCalledWith(uri, { viewColumn: 2 });
    });

    it('shows tab group picker when file is in multiple groups', async () => {
      const uri = createMockUri('/workspace/src/shared.ts');
      const tab1 = createMockTab(uri);
      const tab2 = createMockTab(uri);
      const group1 = createMockTabGroup([tab1], { viewColumn: 1 });
      const group2 = createMockTabGroup([tab2], { viewColumn: 3 });
      const vscodeInstance = mockAdapter.__getVscodeInstance();
      vscodeInstance.window.tabGroups = createMockTabGroups({ all: [group1, group2] });
      const showQuickPickSpy = jest.spyOn(mockAdapter, 'showQuickPick').mockResolvedValue({
        label: 'Group 3',
        viewColumn: 3,
      } as any);
      mockDestinationManager.bind.mockResolvedValue(
        ExtensionResult.ok({ destinationName: 'shared.ts', destinationKind: 'text-editor' }),
      );

      const result = await command.execute(uri);

      expect(result).toStrictEqual({
        outcome: 'bound',
        bindInfo: { destinationName: 'shared.ts', destinationKind: 'text-editor' },
      });
      expect(showQuickPickSpy).toHaveBeenCalledTimes(1);
      expect(mockDestinationManager.bind).toHaveBeenCalledWith({
        kind: 'text-editor',
        uri,
        viewColumn: 3,
      });
    });

    it('returns cancelled when user dismisses tab group picker', async () => {
      const uri = createMockUri('/workspace/src/shared.ts');
      const tab1 = createMockTab(uri);
      const tab2 = createMockTab(uri);
      const group1 = createMockTabGroup([tab1], { viewColumn: 1 });
      const group2 = createMockTabGroup([tab2], { viewColumn: 2 });
      const vscodeInstance = mockAdapter.__getVscodeInstance();
      vscodeInstance.window.tabGroups = createMockTabGroups({ all: [group1, group2] });
      jest.spyOn(mockAdapter, 'showQuickPick').mockResolvedValue(undefined as any);

      const result = await command.execute(uri);

      expect(result).toStrictEqual({ outcome: 'cancelled' });
      expect(mockDestinationManager.bind).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'BindToTextEditorCommand.executeWithUri' },
        'User cancelled tab group picker',
      );
    });
  });
});
