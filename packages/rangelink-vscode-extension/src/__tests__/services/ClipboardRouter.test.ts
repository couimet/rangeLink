import { createMockLogger } from 'barebone-logger-testing';
import { Result } from 'rangelink-core-ts';

import * as resolveBoundTerminalProcessIdModule from '../../destinations/utils/resolveBoundTerminalProcessId';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import { ClipboardRouter } from '../../services/ClipboardRouter';
import { DestinationBehavior, PasteContentType } from '../../types';
import type { CopyAndSendOptions } from '../../types';
import * as isSameFileDestinationModule from '../../utils/isSameFileDestination';
import {
  createMockClipboardPreserver,
  createMockDestinationManager,
  createMockDestinationPicker,
  createMockEditorComposablePasteDestination,
  createMockTerminalPasteDestination,
  createMockUri,
  createMockVscodeAdapter,
  spyOnFormatMessage,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

const buildOptions = <T>(
  overrides: Partial<CopyAndSendOptions<T>> = {},
): CopyAndSendOptions<T> => ({
  control: {
    contentType: PasteContentType.Link,
    destinationBehavior: DestinationBehavior.BoundDestination,
  },
  content: {
    clipboard: 'src/file.ts#L1',
    send: 'src/file.ts#L1' as T,
  },
  strategies: {
    sendFn: jest.fn().mockResolvedValue(true),
    isEligibleFn: jest.fn().mockResolvedValue(true),
  },
  contentName: 'RangeLink',
  fnName: 'test',
  ...overrides,
});

describe('ClipboardRouter', () => {
  let router: ClipboardRouter;
  let mockAdapter: VscodeAdapterWithTestHooks;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockPicker: ReturnType<typeof createMockDestinationPicker>;
  let mockPreserver: ReturnType<typeof createMockClipboardPreserver>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let formatMessageSpy: jest.SpyInstance;
  let mockSetStatusBarMessage: jest.Mock;
  let mockShowInformationMessage: jest.Mock;
  let mockShowErrorMessage: jest.Mock;

  beforeEach(() => {
    jest
      .spyOn(resolveBoundTerminalProcessIdModule, 'resolveBoundTerminalProcessId')
      .mockResolvedValue(undefined);
    jest.spyOn(isSameFileDestinationModule, 'isSameFileDestination').mockReturnValue(false);

    mockLogger = createMockLogger();
    mockPicker = createMockDestinationPicker();
    mockPreserver = createMockClipboardPreserver();
    mockSetStatusBarMessage = jest.fn().mockReturnValue({ dispose: jest.fn() });
    mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
    mockShowErrorMessage = jest.fn().mockResolvedValue(undefined);
    mockAdapter = createMockVscodeAdapter({
      windowOptions: {
        setStatusBarMessage: mockSetStatusBarMessage,
        showErrorMessage: mockShowErrorMessage,
        showInformationMessage: mockShowInformationMessage,
      },
    });
    mockDestinationManager = createMockDestinationManager({
      isBound: false,
    });
    jest.spyOn(mockAdapter, 'writeTextToClipboard');
    router = new ClipboardRouter(
      mockAdapter,
      mockDestinationManager,
      mockPicker,
      mockPreserver,
      mockLogger,
    );
    formatMessageSpy = spyOnFormatMessage();
  });

  describe('copyAndSendToDestination', () => {
    it('preserves clipboard when destination is BoundDestination and manager is bound', async () => {
      const dest = createMockTerminalPasteDestination({ displayName: 'Terminal' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );

      const options = buildOptions({
        control: {
          contentType: PasteContentType.Link,
          destinationBehavior: DestinationBehavior.BoundDestination,
        },
      });

      await router.copyAndSendToDestination(options);

      expect(mockPreserver.preserve).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', boundDestination: 'Terminal' },
        'Attempting to send content to bound destination: Terminal',
      );
    });

    it('passes shouldRestore callback that delegates to isClipboardRestorationApplicable', async () => {
      const dest = createMockTerminalPasteDestination({ displayName: 'Terminal' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      mockDestinationManager.isClipboardRestorationApplicable.mockReturnValue(false);

      let capturedShouldRestore: (() => boolean) | undefined;
      mockPreserver.preserve.mockImplementation(
        async (fn: () => Promise<unknown>, shouldRestore?: () => boolean) => {
          capturedShouldRestore = shouldRestore;
          return fn();
        },
      );

      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );

      const options = buildOptions();

      await router.copyAndSendToDestination(options);

      expect(mockPreserver.preserve).toHaveBeenCalledTimes(1);
      expect(capturedShouldRestore?.()).toBe(false);
      expect(mockDestinationManager.isClipboardRestorationApplicable).toHaveBeenCalledTimes(1);
    });

    it('skips preservation when destinationBehavior is ClipboardOnly', async () => {
      const dest = createMockTerminalPasteDestination({ displayName: 'Terminal' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );

      const options = buildOptions({
        control: {
          contentType: PasteContentType.Link,
          destinationBehavior: DestinationBehavior.ClipboardOnly,
        },
      });

      await router.copyAndSendToDestination(options);

      expect(mockPreserver.preserve).not.toHaveBeenCalled();
      expect(mockAdapter.writeTextToClipboard).toHaveBeenCalledWith('src/file.ts#L1');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test' },
        'Skipping destination (clipboard-only command)',
      );
    });

    it('skips preservation when destination manager is not bound', async () => {
      const options = buildOptions();

      await router.copyAndSendToDestination(options);

      expect(mockPreserver.preserve).not.toHaveBeenCalled();
      expect(mockAdapter.writeTextToClipboard).toHaveBeenCalledWith('src/file.ts#L1');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test' },
        'No destination bound - copied to clipboard only',
      );
    });
  });

  describe('executeCopyAndSend (via copyAndSendToDestination)', () => {
    it('writes to clipboard and shows status bar for ClipboardOnly', async () => {
      const options = buildOptions({
        control: {
          contentType: PasteContentType.Link,
          destinationBehavior: DestinationBehavior.ClipboardOnly,
        },
      });

      await router.copyAndSendToDestination(options);

      expect(mockAdapter.writeTextToClipboard).toHaveBeenCalledWith('src/file.ts#L1');
      expect(formatMessageSpy).toHaveBeenCalledWith('STATUS_BAR_LINK_COPIED_TO_CLIPBOARD', {
        linkTypeName: 'RangeLink',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test' },
        'Skipping destination (clipboard-only command)',
      );
    });

    it('writes to clipboard and shows status bar when not bound', async () => {
      const options = buildOptions({
        control: {
          contentType: PasteContentType.Link,
          destinationBehavior: DestinationBehavior.BoundDestination,
        },
      });

      await router.copyAndSendToDestination(options);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test' },
        'No destination bound - copied to clipboard only',
      );
    });

    it('skips send when content is not eligible', async () => {
      const dest = createMockTerminalPasteDestination({ displayName: 'Terminal' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );

      const sendFn = jest.fn();
      const options = buildOptions({
        strategies: {
          sendFn,
          isEligibleFn: jest.fn().mockResolvedValue(false),
        },
      });

      await router.copyAndSendToDestination(options);

      expect(sendFn).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', boundDestination: 'Terminal' },
        'Content not eligible for paste - skipping auto-paste',
      );
    });

    it('detects self-paste for Link content type and shows info message', async () => {
      const sourceUri = createMockUri('/workspace/file.ts');
      const dest = createMockTerminalPasteDestination({ displayName: 'Terminal' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );

      jest.spyOn(isSameFileDestinationModule, 'isSameFileDestination').mockReturnValue(true);

      const sendFn = jest.fn();
      const options = buildOptions({
        content: { clipboard: 'link', send: 'link', sourceUri },
        strategies: { sendFn, isEligibleFn: jest.fn().mockResolvedValue(true) },
        control: {
          contentType: PasteContentType.Link,
          destinationBehavior: DestinationBehavior.BoundDestination,
        },
      });

      await router.copyAndSendToDestination(options);

      expect(sendFn).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test' },
        'Self-paste detected - skipping auto-paste',
      );
      expect(formatMessageSpy).toHaveBeenCalledWith('INFO_SELF_PASTE_LINK_SKIPPED');
      expect(mockShowInformationMessage).toHaveBeenCalledTimes(1);
    });

    it('detects self-paste for Text content type and shows info message', async () => {
      const sourceUri = createMockUri('/workspace/file.ts');
      const dest = createMockTerminalPasteDestination({ displayName: 'Terminal' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );

      jest.spyOn(isSameFileDestinationModule, 'isSameFileDestination').mockReturnValue(true);

      const options = buildOptions({
        content: { clipboard: 'text', send: 'text', sourceUri },
        control: {
          contentType: PasteContentType.Text,
          destinationBehavior: DestinationBehavior.BoundDestination,
        },
      });

      await router.copyAndSendToDestination(options);

      expect(formatMessageSpy).toHaveBeenCalledWith('INFO_SELF_PASTE_CONTENT_SKIPPED');
    });

    it('sends content when eligible and not self-paste', async () => {
      const dest = createMockTerminalPasteDestination({ displayName: 'Terminal' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );

      const sendFn = jest.fn().mockResolvedValue(true);
      const options = buildOptions({
        strategies: { sendFn, isEligibleFn: jest.fn().mockResolvedValue(true) },
      });

      await router.copyAndSendToDestination(options);

      expect(sendFn).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', boundDestination: 'Terminal' },
        'Attempting to send content to bound destination: Terminal',
      );
    });

    it('falls back to "destination" when displayName is undefined', async () => {
      const dest = createMockTerminalPasteDestination({
        displayName: undefined as unknown as string,
      });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );

      const options = buildOptions({
        strategies: { sendFn: jest.fn(), isEligibleFn: jest.fn().mockResolvedValue(false) },
      });

      await router.copyAndSendToDestination(options);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', boundDestination: 'destination' },
        'Content not eligible for paste - skipping auto-paste',
      );
    });
  });

  describe('resolveDestinationBehavior', () => {
    const logCtx = { fn: 'test' };

    it('returns BoundDestination when already bound', async () => {
      const dest = createMockTerminalPasteDestination({ displayName: 'Terminal' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );

      const result = await router.resolveDestinationBehavior(logCtx);

      expect(result).toBe('bound-destination');
      expect(mockPicker.pick).not.toHaveBeenCalled();
    });

    it('returns BoundDestination when picker binds successfully', async () => {
      mockPicker.pick.mockResolvedValue({
        outcome: 'selected',
        bindOptions: { type: 'terminal' },
      } as any);
      mockDestinationManager.bind.mockResolvedValue(
        Result.ok({ destinationName: 'Terminal', destinationKind: 'terminal' }),
      );

      const result = await router.resolveDestinationBehavior(logCtx);

      expect(result).toBe('bound-destination');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        logCtx,
        'No destination bound, showing quick pick',
      );
    });

    it('returns ClipboardOnly when picker binds with suppressAutoPaste', async () => {
      mockPicker.pick.mockResolvedValue({
        outcome: 'selected',
        bindOptions: { type: 'terminal' },
      } as any);
      mockDestinationManager.bind.mockResolvedValue(
        Result.ok({
          suppressAutoPaste: true,
          destinationName: 'Background Tab',
          destinationKind: 'text-editor',
        }),
      );

      const result = await router.resolveDestinationBehavior(logCtx);

      expect(result).toBe('clipboard-only');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ClipboardRouter.showPickerAndBind' },
        'Bind requested auto-paste suppression — returning bound-no-paste',
      );
    });

    it('returns undefined when picker is cancelled', async () => {
      mockPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      const result = await router.resolveDestinationBehavior(logCtx);

      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { ...logCtx, outcome: 'cancelled' },
        'Picker did not bind, aborting',
      );
    });

    it('returns undefined when no destinations available', async () => {
      mockPicker.pick.mockResolvedValue({ outcome: 'no-resource' });

      const result = await router.resolveDestinationBehavior(logCtx);

      expect(result).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'ClipboardRouter.showPickerAndBind' },
        'No destinations available - no action taken',
      );
    });
  });

  describe('showPickerAndBind (via resolveDestinationBehavior)', () => {
    it('returns no-resource when picker shows no destinations', async () => {
      mockPicker.pick.mockResolvedValue({ outcome: 'no-resource' });

      const result = await router.resolveDestinationBehavior({ fn: 'test' });

      expect(result).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'ClipboardRouter.showPickerAndBind' },
        'No destinations available - no action taken',
      );
    });

    it('returns cancelled when user cancels picker', async () => {
      mockPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      const result = await router.resolveDestinationBehavior({ fn: 'test' });

      expect(result).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'ClipboardRouter.showPickerAndBind' },
        'User cancelled quick pick - no action taken',
      );
    });

    it('shows error message when bind fails', async () => {
      mockPicker.pick.mockResolvedValue({
        outcome: 'selected',
        bindOptions: { type: 'terminal' },
      } as any);
      const bindError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_BIND_FAILED,
        message: 'bind error',
        functionName: 'test',
      });
      mockDestinationManager.bind.mockResolvedValue(Result.err(bindError));

      const result = await router.resolveDestinationBehavior({ fn: 'test' });

      expect(result).toBeUndefined();
      expect(mockShowErrorMessage).toHaveBeenCalledTimes(1);
      expect(formatMessageSpy).toHaveBeenCalledWith('ERROR_BIND_FAILED');
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'ClipboardRouter.showPickerAndBind', error: bindError },
        'Binding failed - no action taken',
      );
    });

    it('logs suppression when bind requests auto-paste suppression', async () => {
      mockPicker.pick.mockResolvedValue({
        outcome: 'selected',
        bindOptions: { type: 'terminal' },
      } as any);
      mockDestinationManager.bind.mockResolvedValue(
        Result.ok({
          suppressAutoPaste: true,
          destinationName: 'Background',
          destinationKind: 'text-editor',
        }),
      );

      await router.resolveDestinationBehavior({ fn: 'test' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ClipboardRouter.showPickerAndBind' },
        'Bind requested auto-paste suppression — returning bound-no-paste',
      );
    });

    it('passes editor uri and viewColumn to picker when editor is bound', async () => {
      const editorUri = createMockUri('/workspace/editor.ts');
      const editorDest = createMockEditorComposablePasteDestination({
        uri: editorUri,
        viewColumn: 2,
      });
      mockDestinationManager = createMockDestinationManager({ isBound: false });
      mockDestinationManager.getBoundDestination.mockReturnValue(editorDest);
      jest
        .spyOn(resolveBoundTerminalProcessIdModule, 'resolveBoundTerminalProcessId')
        .mockResolvedValue(undefined);
      router = new ClipboardRouter(
        mockAdapter,
        mockDestinationManager,
        mockPicker,
        mockPreserver,
        mockLogger,
      );
      mockPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      await router.resolveDestinationBehavior({ fn: 'test' });

      expect(mockPicker.pick).toHaveBeenCalledWith({
        noDestinationsMessageCode: 'INFO_PASTE_CONTENT_NO_DESTINATIONS_AVAILABLE',
        placeholderMessageCode: 'INFO_PASTE_CONTENT_QUICK_PICK_DESTINATIONS_CHOOSE_BELOW',
        boundFileUriString: editorUri.toString(),
        boundFileViewColumn: 2,
      });
    });

    it('passes terminal processId to picker when terminal is bound', async () => {
      jest
        .spyOn(resolveBoundTerminalProcessIdModule, 'resolveBoundTerminalProcessId')
        .mockResolvedValue(42);
      mockPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      await router.resolveDestinationBehavior({ fn: 'test' });

      expect(mockPicker.pick).toHaveBeenCalledWith({
        noDestinationsMessageCode: 'INFO_PASTE_CONTENT_NO_DESTINATIONS_AVAILABLE',
        placeholderMessageCode: 'INFO_PASTE_CONTENT_QUICK_PICK_DESTINATIONS_CHOOSE_BELOW',
        boundTerminalProcessId: 42,
      });
    });
  });
});
