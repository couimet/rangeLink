import { createMockLogger } from 'barebone-logger-testing';

import { BindToTextEditorCommand } from '../../commands';
import type { FilePickerHandlers } from '../../destinations/types';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import type { FileBindableQuickPickItem } from '../../types';
import { ExtensionResult } from '../../types';
import {
  createMockDestinationAvailabilityService,
  createMockDestinationManager,
  createMockEditorComposablePasteDestination,
  createMockEligibleFile,
  createMockTextEditorQuickPickItem,
  createMockUri,
  createMockVscodeAdapter,
  spyOnShowFilePicker,
} from '../helpers';

describe('BindToTextEditorCommand', () => {
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let mockAvailabilityService: ReturnType<typeof createMockDestinationAvailabilityService>;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let showFilePickerSpy: jest.SpyInstance;
  let command: BindToTextEditorCommand;

  beforeEach(() => {
    mockAdapter = createMockVscodeAdapter();
    mockAvailabilityService = createMockDestinationAvailabilityService();
    mockDestinationManager = createMockDestinationManager();
    mockLogger = createMockLogger();
    showFilePickerSpy = spyOnShowFilePicker();
    command = new BindToTextEditorCommand(
      mockAdapter,
      mockAvailabilityService,
      mockDestinationManager,
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
        'RangeLink: No active text editor. Open a file and try again.',
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
      expect(mockDestinationManager.bind).toHaveBeenCalledWith({
        kind: 'text-editor',
        uri: eligibleFile.uri,
        viewColumn: 1,
      });
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
      expect(mockDestinationManager.bind).toHaveBeenCalledWith({
        kind: 'text-editor',
        uri: eligibleFile2.uri,
        viewColumn: 2,
      });
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
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: boundEditorDest,
      });
      mockAvailabilityService.getAllFileItems.mockReturnValue([]);
      command = new BindToTextEditorCommand(
        mockAdapter,
        mockAvailabilityService,
        mockDestinationManager,
        mockLogger,
      );

      await command.execute();

      expect(mockAvailabilityService.getAllFileItems).toHaveBeenCalledWith(
        'file:///workspace/src/bound.ts',
        3,
      );
    });

    it('passes no bound state to getAllFileItems when nothing is bound', async () => {
      mockAvailabilityService.getAllFileItems.mockReturnValue([]);

      await command.execute();

      expect(mockAvailabilityService.getAllFileItems).toHaveBeenCalledWith(undefined, undefined);
    });
  });
});
