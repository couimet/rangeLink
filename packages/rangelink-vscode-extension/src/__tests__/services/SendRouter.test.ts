import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import type { BindSuccessInfo, PasteDestination } from '../../destinations';
import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import { SendRouter } from '../../services/SendRouter';
import { AutoPasteResult, ExtensionResult, MessageCode } from '../../types';
import {
  createMockClipboardPreserver,
  createMockComposablePasteDestination,
  createMockDestinationManager,
  createMockDestinationPicker,
} from '../helpers';

const createMockFeedbackProvider = () =>
  ({
    showError: jest.fn(),
    provideCopyFeedback: jest.fn(),
    provideSendFeedback: jest.fn(),
  }) as jest.Mocked<{
    showError: jest.Mock;
    provideCopyFeedback: jest.Mock;
    provideSendFeedback: jest.Mock;
  }>;

const createMockClipboardWriter = () => ({
  writeTextToClipboard: jest.fn().mockResolvedValue(undefined),
});

const createMockUri = (path: string): vscode.Uri =>
  ({
    scheme: 'file',
    fsPath: path,
    path,
    toString: () => `file://${path}`,
  }) as unknown as vscode.Uri;

const createMockDestination = (overrides: Partial<PasteDestination> = {}): PasteDestination =>
  ({
    id: 'terminal',
    displayName: 'Terminal ("bash")',
    rawLabel: 'bash',
    isAvailable: jest.fn().mockResolvedValue(true),
    isEligibleForPasteLink: jest.fn().mockResolvedValue(true),
    isEligibleForPasteContent: jest.fn().mockResolvedValue(true),
    pasteLink: jest.fn().mockResolvedValue(true),
    pasteContent: jest.fn().mockResolvedValue(true),
    getSupportedLinkTypes: jest.fn().mockReturnValue([]),
    getSupportedContentTypes: jest.fn().mockReturnValue([]),
    shouldPreserveClipboard: jest.fn().mockReturnValue(true),
    focus: jest.fn().mockResolvedValue(true),
    getJumpSuccessMessage: jest.fn().mockReturnValue(''),
    getLoggingDetails: jest.fn().mockReturnValue({}),
    getDestinationUri: jest.fn().mockReturnValue(undefined),
    equals: jest.fn().mockResolvedValue(false),
    ...overrides,
  }) as unknown as PasteDestination;

describe('SendRouter', () => {
  let router: SendRouter;
  let mockClipboardWriter: ReturnType<typeof createMockClipboardWriter>;
  let mockDestinationManager: ReturnType<typeof createMockDestinationManager>;
  let mockDestinationPicker: ReturnType<typeof createMockDestinationPicker>;
  let mockClipboardPreserver: ReturnType<typeof createMockClipboardPreserver>;
  let mockFeedbackProvider: ReturnType<typeof createMockFeedbackProvider>;
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
    mockDestinationManager = createMockDestinationManager();
    mockDestinationPicker = createMockDestinationPicker();
    mockClipboardPreserver = createMockClipboardPreserver();
    mockClipboardPreserver.preserve.mockImplementation(
      async (fn: () => Promise<unknown>, shouldRestore?: () => boolean) => {
        const result = await fn();
        shouldRestore?.();
        return result;
      },
    );
    mockFeedbackProvider = createMockFeedbackProvider();
    mockLogger = createMockLogger();

    router = new SendRouter(
      mockClipboardWriter as any,
      mockDestinationManager,
      mockDestinationPicker,
      mockClipboardPreserver,
      mockFeedbackProvider as any,
      mockLogger,
    );
  });

  // ── resolveDestination ──────────────────────────────────────

  describe('resolveDestination', () => {
    it('returns true when a destination is already bound', async () => {
      mockDestinationManager.isBound.mockReturnValue(true);

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(true);
      expect(mockDestinationPicker.pick).not.toHaveBeenCalled();
    });

    it('returns true when picker binds successfully', async () => {
      mockDestinationManager.isBound.mockReturnValue(false);
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
      mockDestinationManager.isBound.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'no-resource' });

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', outcome: 'no-resource' },
        'Picker did not bind, aborting',
      );
    });

    it('returns false when user cancels picker', async () => {
      mockDestinationManager.isBound.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
    });

    it('returns false when bind fails', async () => {
      mockDestinationManager.isBound.mockReturnValue(false);
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
      mockDestinationManager.isBound.mockReturnValue(false);

      await router.sendToDestination(createMockSendOptions() as any);

      expect(mockClipboardWriter.writeTextToClipboard).toHaveBeenCalledWith(' src/file.ts#L1 ');
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'testFn' },
        'No destination bound - copied to clipboard only',
      );
      expect(mockFeedbackProvider.provideSendFeedback).not.toHaveBeenCalled();
    });

    it('preserves clipboard and provides feedback when bound and paste succeeds', async () => {
      const dest = createMockDestination();
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
        mockFeedbackProvider as any,
        mockLogger,
      );

      await router.sendToDestination(createMockSendOptions() as any);

      expect(mockClipboardPreserver.preserve).toHaveBeenCalledTimes(1);
      expect(mockFeedbackProvider.provideSendFeedback).toHaveBeenCalledWith(
        {
          contentType: 'CONTENT_NAME_RANGELINK',
          destination: { kind: 'terminal', label: 'bash', displayName: 'Terminal ("bash")' },
        },
        { kind: 'sent-automatic' },
      );
    });

    it('skips feedback when outcome is undefined', async () => {
      const dest = createMockDestination();
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
      });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination();
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({ getUserInstruction: undefined });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({
        getUserInstruction: jest.fn().mockReturnValueOnce('Press Cmd+V to paste'),
      });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({
        getUserInstruction: jest
          .fn()
          .mockImplementation((result: AutoPasteResult) =>
            result === AutoPasteResult.Failure ? 'Manual paste required' : undefined,
          ),
      });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({ getUserInstruction: undefined });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({ displayName: '' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({ id: 'text-editor' });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
      });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
      });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
      const dest = createMockDestination({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
        editorHasActiveSelection: () => true,
      });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
    });

    it('blocks with block-on-editor-selection when selection is active and does NOT write clipboard', async () => {
      const dest = createMockDestination({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
        editorHasActiveSelection: () => true,
      });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
    });

    it('allows paste with block-on-editor-selection when destination has no active selection', async () => {
      const dest = createMockDestination({
        id: 'text-editor',
        getDestinationUri: () => createMockUri('/test/file.ts'),
        getDestinationViewColumn: () => 1,
        editorHasActiveSelection: () => false,
      });
      mockDestinationManager = createMockDestinationManager({
        isBound: true,
        boundDestination: dest,
      });
      router = new SendRouter(
        mockClipboardWriter as any,
        mockDestinationManager,
        mockDestinationPicker,
        mockClipboardPreserver,
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
    it('returns false for self-paste-blocked with clipboardWritten: true', () => {
      const result = (router as any).shouldRestoreClipboard({
        kind: 'self-paste-blocked',
        destinationKind: 'text-editor',
        clipboardWritten: true,
        toastMessage: 'test message',
      });

      expect(result).toBe(false);
    });

    it('delegates to destinationManager for self-paste-blocked with clipboardWritten: false', () => {
      mockDestinationManager.isClipboardRestorationApplicable.mockReturnValue(false);

      const result = (router as any).shouldRestoreClipboard({
        kind: 'self-paste-blocked',
        destinationKind: 'text-editor',
        clipboardWritten: false,
        toastMessage: 'test message',
      });

      expect(result).toBe(false);
      expect(mockDestinationManager.isClipboardRestorationApplicable).toHaveBeenCalledWith(false);
    });

    it('delegates to destinationManager for sent-automatic outcome', () => {
      mockDestinationManager.isClipboardRestorationApplicable.mockReturnValue(true);

      const result = (router as any).shouldRestoreClipboard({
        kind: 'sent-automatic',
      });

      expect(result).toBe(true);
      expect(mockDestinationManager.isClipboardRestorationApplicable).toHaveBeenCalledWith(true);
    });

    it('delegates to destinationManager for sent-manual outcome', () => {
      (router as any).shouldRestoreClipboard({
        kind: 'sent-manual',
        instruction: 'Press Cmd+V',
      });

      expect(mockDestinationManager.isClipboardRestorationApplicable).toHaveBeenCalledWith(true);
    });

    it('delegates to destinationManager for failed-automatic outcome', () => {
      (router as any).shouldRestoreClipboard({
        kind: 'failed-automatic',
        destinationKind: 'terminal',
      });

      expect(mockDestinationManager.isClipboardRestorationApplicable).toHaveBeenCalledWith(false);
    });

    it('delegates to destinationManager for failed-manual outcome', () => {
      (router as any).shouldRestoreClipboard({
        kind: 'failed-manual',
        instruction: 'Manual paste required',
      });

      expect(mockDestinationManager.isClipboardRestorationApplicable).toHaveBeenCalledWith(false);
    });

    it('delegates to destinationManager when outcome is undefined', () => {
      (router as any).shouldRestoreClipboard(undefined);

      expect(mockDestinationManager.isClipboardRestorationApplicable).toHaveBeenCalledWith(false);
    });
  });

  // ── showPickerAndBind (exercised via resolveDestination) ─────

  describe('showPickerAndBind', () => {
    it('returns no-resource when picker finds nothing', async () => {
      mockDestinationManager.isBound.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'no-resource' });

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'SendRouter.showPickerAndBind' },
        'No destinations available - no action taken',
      );
    });

    it('returns cancelled when user dismisses picker', async () => {
      mockDestinationManager.isBound.mockReturnValue(false);
      mockDestinationPicker.pick.mockResolvedValue({ outcome: 'cancelled' });

      const result = await router.resolveDestination({ fn: 'test' });

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'SendRouter.showPickerAndBind' },
        'User cancelled quick pick - no action taken',
      );
    });

    it('returns bound when bind succeeds', async () => {
      mockDestinationManager.isBound.mockReturnValue(false);
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
      mockDestinationManager.isBound.mockReturnValue(false);
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
      mockDestinationManager.isBound.mockReturnValue(false);
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
      mockDestinationManager.getBoundDestination.mockReturnValue(editorDest);
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
      mockDestinationManager.getBoundDestination.mockReturnValue(terminalDest);
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
