import { createMockLogger } from 'barebone-logger-testing';
import { RangeLinkError, RangeLinkErrorCodes, Result } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { BindSuccessInfo, PasteDestination } from '../../destinations';
import type { BoundSession } from '../../destinations';
import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import { SendRouter } from '../../services/SendRouter';
import { AutoPasteResult, ExtensionResult, MessageCode } from '../../types';
import {
  createMockClipboardService,
  createMockClipboardWriter,
  createMockComposablePasteDestination,
  createMockDestinationManager,
  createMockDestinationPicker,
  createMockOperationFeedbackProvider,
  createMockPasteDestinationForSendRouter,
  createMockUri,
} from '../helpers';
import { createMockBoundSession } from '../helpers';

describe('SendRouter', () => {
  let router: SendRouter;
  let mockClipboardWriter: ReturnType<typeof createMockClipboardWriter>;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockSession: jest.Mocked<BoundSession>;
  let mockDestinationPicker: ReturnType<typeof createMockDestinationPicker>;
  let mockClipboardService: ReturnType<typeof createMockClipboardService>;
  let mockFeedbackProvider: ReturnType<typeof createMockOperationFeedbackProvider>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  const createMockSendOptions = (overrides: Record<string, unknown> = {}) => ({
    control: { contentType: 'Link' as const },
    content: { clipboard: ' src/file.ts#L1 ', send: ' src/file.ts#L1 ' },
    strategies: {
      sendFn: jest.fn().mockResolvedValue(true) as jest.Mock<Promise<boolean>>,
      isEligibleFn: jest.fn().mockResolvedValue(true) as jest.Mock<Promise<boolean>>,
    },
    contentNameCode: MessageCode.CONTENT_NAME_RANGELINK,
    fnName: 'testFn',
    selfPastePolicy: 'block-on-uri' as const,
    ...overrides,
  });

  beforeEach(() => {
    mockClipboardWriter = createMockClipboardWriter();
    mockSession = createMockBoundSession();
    mockDestinationManager = createMockDestinationManager();
    mockDestinationPicker = createMockDestinationPicker();
    mockClipboardService = createMockClipboardService();
    mockClipboardService.route.mockImplementation(
      async (fn: () => Promise<unknown>, shouldRestore?: () => boolean) => {
        const result = await fn();
        shouldRestore?.();
        return Result.ok(result);
      },
    );
    mockFeedbackProvider = createMockOperationFeedbackProvider();
    mockLogger = createMockLogger();

    router = new SendRouter(
      mockClipboardWriter as any,
      mockDestinationManager,
      mockSession,
      mockDestinationPicker,
      mockClipboardService,
      mockFeedbackProvider as any,
      mockLogger,
    );
  });

  // ── resolveDestination ──────────────────────────────────────

  describe('resolveDestination', () => {
    it('returns true when a destination is already bound', async () => {
      mockSession.isSet.mockReturnValue(true);

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(true);
      expect(mockDestinationPicker.pick).not.toHaveBeenCalled();
    });

    it('returns true when picker binds successfully', async () => {
      mockSession.isSet.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({
        outcome: 'selected',
        bindOptions: { kind: 'terminal', terminal: { name: 'bash' } as any },
      });
      mockDestinationManager.bind.mockResolvedValue(
        ExtensionResult.ok<BindSuccessInfo>({
          destinationName: 'Terminal',
          destinationKind: 'terminal',
        }),
      );

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test' },
        'No destination bound, showing quick pick',
      );
    });

    it('returns false when picker returns no-resource', async () => {
      mockSession.isSet.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'no-resource' });

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', outcome: 'no-resource' },
        'Picker did not bind, aborting',
      );
    });

    it('returns false when user cancels picker', async () => {
      mockSession.isSet.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
    });

    it('returns false when bind fails', async () => {
      mockSession.isSet.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({
        outcome: 'selected',
        bindOptions: { kind: 'terminal', terminal: { name: 'bash' } as any },
      });
      const bindError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_BOUND,
        message: 'test error',
        functionName: 'test',
      });
      mockDestinationManager.bind.mockResolvedValue(ExtensionResult.err(bindError));

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
      expect(mockFeedbackProvider.showError).toHaveBeenCalled();
    });
  });

  // ── sendToDestination ───────────────────────────────────────

  describe('sendToDestination', () => {
    it('calls executeSend directly when unbound', async () => {
      mockSession.isSet.mockReturnValue(false);

      await router.sendToDestination(createMockSendOptions() as any);

      expect(mockClipboardWriter.writeTextToClipboard).toHaveBeenCalledWith(' src/file.ts#L1 ');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'testFn' },
        'No destination bound - copied to clipboard only',
      );
      expect(mockFeedbackProvider.provideSendFeedback).not.toHaveBeenCalled();
    });

    it('logs, shows warning, and returns when clipboard preservation fails', async () => {
      const dest = createMockPasteDestinationForSendRouter();
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );
      const routeError = new RangeLinkError({
        code: RangeLinkErrorCodes.CLIPBOARD_READ_FAILED,
        message: 'Failed to read clipboard',
        functionName: 'ClipboardService::route',
      });
      mockClipboardService.route.mockResolvedValue(Result.err(routeError));

      await router.sendToDestination(createMockSendOptions() as any);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'SendRouter.sendToDestination', error: routeError },
        'Clipboard routing failed',
      );
      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: {
            kind: 'terminal',
            label: 'bash',
            displayName: 'Terminal ("bash")',
          },
        },
        { kind: 'clipboard-preservation-failed' },
      );
    });

    it('preserves clipboard and provides feedback when bound and paste succeeds', async () => {
      const dest = createMockPasteDestinationForSendRouter();
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      await router.sendToDestination(createMockSendOptions() as any);

      expect(mockClipboardService.route).toHaveBeenCalledTimes(1);
      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'terminal', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        { kind: 'sent-automatic' },
      );
    });

    it('skips feedback when outcome is undefined', async () => {
      const dest = createMockPasteDestinationForSendRouter();
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        strategies: {
          ...createMockSendOptions().strategies,
          isEligibleFn: jest.fn().mockResolvedValue(false),
        },
      };

      await router.sendToDestination(options as any);

      expect(mockFeedbackProvider.provideSendFeedback).not.toHaveBeenCalled();
    });
  });

  // ── executeSend (via sendToDestination with bound destination) ─

  describe('executeSend (via sendToDestination)', () => {
    it('returns self-paste-blocked when checkSelfPaste detects collision', async () => {
      const dest = createMockPasteDestinationForSendRouter({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
      });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        content: {
          ...createMockSendOptions().content,
          sourceUri: createMockUri('/test/file.ts'),
          sourceViewColumn: 1,
        },
        selfPastePolicy: 'block-on-uri',
      };

      await router.sendToDestination(options as any);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'testFn',
          selfPastePolicy: 'block-on-uri',
          writeClipboardOnSelfPasteBlock: undefined,
          usedDefaults: { selfPastePolicy: false, writeClipboardOnSelfPasteBlock: true },
        },
        'Self-paste policy resolution',
      );
      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'text-editor', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        {
          kind: 'self-paste-blocked',
          destinationKind: 'text-editor',
          clipboardWritten: true,
          toastMessage:
            'Cannot auto-paste to same file. Link copied to clipboard. Tip: Use R-C for clipboard-only links.',
        },
      );
    });

    it('skips auto-paste when content is not eligible', async () => {
      const dest = createMockPasteDestinationForSendRouter();
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        strategies: {
          ...createMockSendOptions().strategies,
          isEligibleFn: jest.fn().mockResolvedValue(false),
        },
      };

      await router.sendToDestination(options as any);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'testFn', boundDestination: 'Terminal ("bash")' },
        'Content not eligible for paste - skipping auto-paste',
      );
      expect(mockFeedbackProvider.provideSendFeedback).not.toHaveBeenCalled();
    });

    it('returns sent-automatic when paste succeeds with no user instruction', async () => {
      const dest = createMockPasteDestinationForSendRouter({ getUserInstruction: undefined });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      await router.sendToDestination(createMockSendOptions() as any);

      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'terminal', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        { kind: 'sent-automatic' },
      );
    });

    it('returns sent-manual when paste succeeds with user instruction', async () => {
      const dest = createMockPasteDestinationForSendRouter({
        getUserInstruction: jest.fn().mockReturnValueOnce('Press Cmd+V to paste'),
      });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      await router.sendToDestination(createMockSendOptions() as any);

      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'terminal', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        { kind: 'sent-manual', instruction: 'Press Cmd+V to paste' },
      );
    });

    it('returns failed-manual when paste fails with user instruction', async () => {
      const dest = createMockPasteDestinationForSendRouter({
        getUserInstruction: jest
          .fn()
          .mockImplementation((result: AutoPasteResult) =>
            result === AutoPasteResult.Failure ? 'Manual paste required' : undefined,
          ),
      });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        strategies: {
          ...createMockSendOptions().strategies,
          sendFn: jest.fn().mockResolvedValue(false),
        },
      };

      await router.sendToDestination(options as any);

      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'terminal', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        { kind: 'failed-manual', instruction: 'Manual paste required' },
      );
    });

    it('returns failed-automatic when paste fails with no user instruction', async () => {
      const dest = createMockPasteDestinationForSendRouter({ getUserInstruction: undefined });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        strategies: {
          ...createMockSendOptions().strategies,
          sendFn: jest.fn().mockResolvedValue(false),
        },
      };

      await router.sendToDestination(options as any);

      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'terminal', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        { kind: 'failed-automatic', destinationKind: 'terminal' },
      );
    });

    it('falls back to generic destination name in logs when displayName is empty', async () => {
      const dest = createMockPasteDestinationForSendRouter({ displayName: '' });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      await router.sendToDestination(createMockSendOptions() as any);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'testFn', boundDestination: 'destination' },
        'Attempting to send content to bound destination: destination',
      );
      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'terminal', label: 'bash', displayName: '' },
        },
        { kind: 'sent-automatic' },
      );
    });
  });

  // ── checkSelfPaste (exercised via sendToDestination) ─────────

  describe('checkSelfPaste', () => {
    it('allows paste when sourceUri is undefined', async () => {
      const dest = createMockPasteDestinationForSendRouter({ id: 'text-editor' });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        content: { ...createMockSendOptions().content },
      };

      await router.sendToDestination(options as any);

      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'text-editor', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        { kind: 'sent-automatic' },
      );
    });

    it('blocks with block-on-uri when same file and view column', async () => {
      const dest = createMockPasteDestinationForSendRouter({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
      });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        content: {
          ...createMockSendOptions().content,
          sourceUri: createMockUri('/test/file.ts'),
          sourceViewColumn: 1,
        },
        selfPastePolicy: 'block-on-uri',
      };

      await router.sendToDestination(options as any);

      expect(mockClipboardWriter.writeTextToClipboard).toHaveBeenCalledWith(' src/file.ts#L1 ');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'testFn',
          selfPastePolicy: 'block-on-uri',
          writeClipboardOnSelfPasteBlock: undefined,
          usedDefaults: { selfPastePolicy: false, writeClipboardOnSelfPasteBlock: true },
        },
        'Self-paste policy resolution',
      );
      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'text-editor', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        {
          kind: 'self-paste-blocked',
          destinationKind: 'text-editor',
          clipboardWritten: true,
          toastMessage:
            'Cannot auto-paste to same file. Link copied to clipboard. Tip: Use R-C for clipboard-only links.',
        },
      );
    });

    it('allows cross-column paste when URIs match but view columns differ', async () => {
      const dest = createMockPasteDestinationForSendRouter({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
      });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        content: {
          ...createMockSendOptions().content,
          sourceUri: createMockUri('/test/file.ts'),
          sourceViewColumn: 2,
        },
        selfPastePolicy: 'block-on-uri',
      };

      await router.sendToDestination(options as any);

      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'text-editor', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        { kind: 'sent-automatic' },
      );
    });

    it('blocks with block-on-editor-selection when selection is active and writes clipboard', async () => {
      const dest = createMockPasteDestinationForSendRouter({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
        editorHasActiveSelection: () => true,
      });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        content: {
          ...createMockSendOptions().content,
          sourceUri: createMockUri('/test/file.ts'),
          sourceViewColumn: 1,
        },
        selfPastePolicy: 'block-on-editor-selection',
        writeClipboardOnSelfPasteBlock: true,
      };

      await router.sendToDestination(options as any);

      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'text-editor', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        {
          kind: 'self-paste-blocked',
          destinationKind: 'text-editor',
          clipboardWritten: true,
          toastMessage:
            'Cannot paste when bound editor has an active selection. File path copied to clipboard.',
        },
      );
      expect(
        jest
          .mocked(mockLogger.debug)
          .mock.calls.filter((c) => c[1] === 'Self-paste policy resolution'),
      ).toStrictEqual([]);
    });

    it('blocks with block-on-editor-selection when selection is active and does NOT write clipboard', async () => {
      const dest = createMockPasteDestinationForSendRouter({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
        editorHasActiveSelection: () => true,
      });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        content: {
          ...createMockSendOptions().content,
          sourceUri: createMockUri('/test/file.ts'),
          sourceViewColumn: 1,
        },
        selfPastePolicy: 'block-on-editor-selection',
        writeClipboardOnSelfPasteBlock: false,
      };

      await router.sendToDestination(options as any);

      expect(mockClipboardWriter.writeTextToClipboard).not.toHaveBeenCalled();
      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'text-editor', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        {
          kind: 'self-paste-blocked',
          destinationKind: 'text-editor',
          clipboardWritten: false,
          toastMessage: 'Cannot paste when bound editor has an active selection.',
        },
      );
      expect(
        jest
          .mocked(mockLogger.debug)
          .mock.calls.filter((c) => c[1] === 'Self-paste policy resolution'),
      ).toStrictEqual([]);
    });

    it('allows paste with block-on-editor-selection when destination has no active selection', async () => {
      const dest = createMockPasteDestinationForSendRouter({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
        editorHasActiveSelection: () => false,
      });
      mockDestinationManager = createMockDestinationManager();
      mockSession.isSet.mockReturnValue(true);
      mockSession.get.mockReturnValue(dest);
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockSession,
        mockDestinationPicker,
        mockClipboardService,
        mockFeedbackProvider as any,
        mockLogger,
      );

      const options = {
        ...createMockSendOptions(),
        content: {
          ...createMockSendOptions().content,
          sourceUri: createMockUri('/test/file.ts'),
          sourceViewColumn: 1,
        },
        selfPastePolicy: 'block-on-editor-selection',
      };

      await router.sendToDestination(options as any);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'testFn',
          selfPastePolicy: 'block-on-editor-selection',
          writeClipboardOnSelfPasteBlock: undefined,
          usedDefaults: { selfPastePolicy: false, writeClipboardOnSelfPasteBlock: true },
        },
        'Self-paste policy resolution',
      );
      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'text-editor', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        { kind: 'sent-automatic' },
      );
    });
  });

  // ── shouldRestoreClipboard ───────────────────────────────────

  describe('shouldRestoreClipboard', () => {
    const createDest = (overrides: Partial<PasteDestination> = {}) =>
      createMockPasteDestinationForSendRouter(overrides);

    it('returns false for self-paste-blocked with clipboardWritten: true (regardless of destination)', () => {
      const dest = createDest({ shouldPreserveClipboard: jest.fn().mockReturnValue(true) });

      const result = (router as any).shouldRestoreClipboard(
        { kind: 'self-paste-blocked', destinationKind: 'text-editor', clipboardWritten: true, toastMessage: 'test' },
        dest,
      );

      expect(result).toBe(false);
      expect(dest.shouldPreserveClipboard).not.toHaveBeenCalled();
    });

    it('returns true when no destination is bound', () => {
      const result = (router as any).shouldRestoreClipboard(
        { kind: 'failed-automatic', destinationKind: 'terminal' },
        undefined,
      );

      expect(result).toBe(true);
    });

    it('returns false when destination.shouldPreserveClipboard() returns false', () => {
      const dest = createDest({ shouldPreserveClipboard: jest.fn().mockReturnValue(false) });

      const result = (router as any).shouldRestoreClipboard(
        { kind: 'sent-automatic' },
        dest,
      );

      expect(result).toBe(false);
    });

    it('returns true when paste succeeded (sent-automatic) and shouldPreserveClipboard returns true', () => {
      const dest = createDest();

      const result = (router as any).shouldRestoreClipboard({ kind: 'sent-automatic' }, dest);

      expect(result).toBe(true);
    });

    it('returns true when paste succeeded (sent-manual) and shouldPreserveClipboard returns true', () => {
      const dest = createDest();

      const result = (router as any).shouldRestoreClipboard(
        { kind: 'sent-manual', instruction: 'Press Cmd+V' },
        dest,
      );

      expect(result).toBe(true);
    });

    it('returns true when paste failed and destination has no failure instruction', () => {
      const dest = createDest({
        getUserInstruction: jest
          .fn()
          .mockImplementation((result: AutoPasteResult) =>
            result === AutoPasteResult.Failure ? undefined : 'Press Cmd+V',
          ),
      });

      const result = (router as any).shouldRestoreClipboard(
        { kind: 'failed-automatic', destinationKind: 'terminal' },
        dest,
      );

      expect(result).toBe(true);
    });

    it('returns false when paste failed and destination provides a failure instruction', () => {
      const dest = createDest({
        getUserInstruction: jest.fn().mockReturnValue('Manual paste required'),
      });

      const result = (router as any).shouldRestoreClipboard(
        { kind: 'failed-manual', instruction: 'Manual paste required' },
        dest,
      );

      expect(result).toBe(false);
    });

    it('returns true when outcome is undefined and destination is bound with default mocks', () => {
      const dest = createDest();

      const result = (router as any).shouldRestoreClipboard(undefined, dest);

      expect(result).toBe(true);
    });
  });

  // ── showPickerAndBind (exercised via resolveDestination) ─────

  describe('showPickerAndBind', () => {
    it('returns no-resource when picker finds nothing', async () => {
      mockSession.isSet.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'no-resource' });

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'SendRouter.showPickerAndBind' },
        'No destinations available - no action taken',
      );
    });

    it('returns cancelled when user dismisses picker', async () => {
      mockSession.isSet.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'SendRouter.showPickerAndBind' },
        'User cancelled quick pick - no action taken',
      );
    });

    it('returns bound when bind succeeds', async () => {
      mockSession.isSet.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({
        outcome: 'selected',
        bindOptions: { kind: 'terminal', terminal: { name: 'bash' } as any },
      });
      mockDestinationManager.bind.mockResolvedValue(
        ExtensionResult.ok<BindSuccessInfo>({
          destinationName: 'Terminal',
          destinationKind: 'terminal',
        }),
      );

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(true);
    });

    it('returns bind-failed when bind returns error', async () => {
      mockSession.isSet.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({
        outcome: 'selected',
        bindOptions: { kind: 'terminal', terminal: { name: 'bash' } as any },
      });
      const bindError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.DESTINATION_NOT_BOUND,
        message: 'test error',
        functionName: 'test',
      });
      mockDestinationManager.bind.mockResolvedValue(ExtensionResult.err(bindError));

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockFeedbackProvider.showError).toHaveBeenCalled();
    });

    it('throws on unexpected picker outcome', async () => {
      mockSession.isSet.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({
        outcome: 'unexpected-value',
      } as any);

      await expect(router.resolveDestination({ fn: 'test' })).rejects.toThrow(
        RangeLinkExtensionError,
      );
    });

    it('passes editor destination boundFileUriString and boundFileViewColumn to picker when bound destination is an editor', async () => {
      const editorDest = createMockComposablePasteDestination({
        resource: {
          kind: 'editor',
          uri: createMockUri('/test/file.ts'),
          viewColumn: 1,
        },
      });
      mockSession.get.mockReturnValue(editorDest);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      await (router as any).showPickerAndBind();

      expect(mockDestinationPicker.pick).toHaveBeenCalledWith({
        noDestinationsMessageCode: 'INFO_PASTE_CONTENT_NO_DESTINATIONS_AVAILABLE',
        placeholderMessageCode: 'INFO_PASTE_CONTENT_QUICK_PICK_DESTINATIONS_CHOOSE_BELOW',
        boundFileUriString: 'file:///test/file.ts',
        boundFileViewColumn: 1,
      });
    });

    it('passes boundTerminalProcessId to picker options when bound destination is a terminal with processId', async () => {
      const mockTerminal = {
        processId: Promise.resolve(1234),
      } as unknown as vscode.Terminal;
      const terminalDest = createMockComposablePasteDestination({
        id: 'terminal',
        resource: {
          kind: 'terminal',
          terminal: mockTerminal,
        },
      });
      mockSession.get.mockReturnValue(terminalDest);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      await (router as any).showPickerAndBind();

      expect(mockDestinationPicker.pick).toHaveBeenCalledWith({
        noDestinationsMessageCode: 'INFO_PASTE_CONTENT_NO_DESTINATIONS_AVAILABLE',
        placeholderMessageCode: 'INFO_PASTE_CONTENT_QUICK_PICK_DESTINATIONS_CHOOSE_BELOW',
        boundTerminalProcessId: 1234,
      });
    });
  });
});
