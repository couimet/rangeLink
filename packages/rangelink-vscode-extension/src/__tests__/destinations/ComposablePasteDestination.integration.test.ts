import { createMockLogger } from 'barebone-logger-testing';
import { Result } from 'rangelink-core-ts';

import {
  AIAssistantFocusCapability,
  AIAssistantInsertFactory,
  ComposablePasteDestination,
  ContentEligibilityChecker,
  EditorFocusCapability,
  EditorInsertFactory,
  TerminalFocusCapability,
  TerminalInsertFactory,
} from '../../destinations';
import { TerminalPasteService } from '../../services';
import {
  createMockClipboardService,
  createMockDocument,
  createMockEditor,
  createMockFormattedLink,
  createMockTerminal,
  createMockUri,
  createMockVscodeAdapter,
} from '../helpers';

describe('ComposablePasteDestination Integration Tests', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('Terminal-like destination (real TerminalFocusCapability)', () => {
    it('should complete end-to-end paste flow with TerminalFocusCapability', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({
        name: 'Test Terminal',
        processId: Promise.resolve(12345),
      });

      const terminalPasteService = new TerminalPasteService(
        mockAdapter,
        createMockClipboardService(),
        mockLogger,
      );
      const insertFactory = new TerminalInsertFactory(terminalPasteService, mockLogger);
      const focusCapability = new TerminalFocusCapability(
        mockAdapter,
        mockTerminal,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const showTerminalSpy = jest.spyOn(mockAdapter, 'showTerminal');
      const pasteTextSpy = jest
        .spyOn(terminalPasteService, 'pasteIntoTerminal')
        .mockResolvedValue(Result.ok(undefined));

      const destination = ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused terminal',
        loggingDetails: { terminalName: 'Test Terminal' },
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(true);
      expect(showTerminalSpy).toHaveBeenCalledTimes(1);
      expect(showTerminalSpy).toHaveBeenCalledWith(mockTerminal, 'steal-focus');
      expect(pasteTextSpy).toHaveBeenCalledTimes(1);
      expect(pasteTextSpy).toHaveBeenCalledWith(formattedLink.link, mockTerminal);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
          terminalName: 'Test Terminal',
        },
        'Pasted link to Terminal',
      );
    });

    it('should verify focus happens before text insertion', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const terminalPasteService = new TerminalPasteService(
        mockAdapter,
        createMockClipboardService(),
        mockLogger,
      );
      const insertFactory = new TerminalInsertFactory(terminalPasteService, mockLogger);
      const focusCapability = new TerminalFocusCapability(
        mockAdapter,
        mockTerminal,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const callOrder: string[] = [];

      jest.spyOn(mockAdapter, 'showTerminal').mockImplementation(() => {
        callOrder.push('focus');
        return Result.ok(undefined);
      });

      jest.spyOn(terminalPasteService, 'pasteIntoTerminal').mockImplementation(async () => {
        callOrder.push('insert');
        return Result.ok(undefined);
      });

      const destination = ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused terminal',
        loggingDetails: {},
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('test-link');

      await destination.pasteLink(formattedLink);

      expect(callOrder).toStrictEqual(['focus', 'insert']);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
        },
        'Pasted link to Terminal',
      );
    });
  });

  describe('AI Assistant-like destination (real AIAssistantFocusCapability)', () => {
    it('should complete end-to-end paste flow with clipboard and commands', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const insertFactory = new AIAssistantInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new AIAssistantFocusCapability(
        mockAdapter,
        ['ai.assistant.focus'],
        undefined,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const executeCommandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockResolvedValue(undefined);
      const pasteClipboardSpy = jest
        .spyOn(mockAdapter, 'pasteClipboardToAiAssistant')
        .mockResolvedValue(true);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'claude-code',
        displayName: 'Claude Code Chat',
        resource: { kind: 'singleton' },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused Claude Code',
        loggingDetails: {},
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(true);
      expect(executeCommandSpy).toHaveBeenCalledTimes(1);
      expect(executeCommandSpy).toHaveBeenCalledWith('ai.assistant.focus');
      expect(pasteClipboardSpy).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
        },
        'Pasted link to Claude Code Chat',
      );
    });

    it('should try focus commands in order until success', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const insertFactory = new AIAssistantInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new AIAssistantFocusCapability(
        mockAdapter,
        ['command.first', 'command.second', 'command.third'],
        undefined,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const executeCommandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(undefined);
      jest.spyOn(mockAdapter, 'pasteClipboardToAiAssistant').mockResolvedValue(true);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'claude-code',
        displayName: 'Claude Code Chat',
        resource: { kind: 'singleton' },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused',
        loggingDetails: {},
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('test');

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(true);
      expect(executeCommandSpy).toHaveBeenCalledTimes(2);
      expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'command.first');
      expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'command.second');
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
        },
        'Pasted link to Claude Code Chat',
      );
    });

    it('should return false when all focus commands fail', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const insertFactory = new AIAssistantInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new AIAssistantFocusCapability(
        mockAdapter,
        ['command.first', 'command.second'],
        undefined,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('First failed'))
        .mockRejectedValueOnce(new Error('Second failed'));

      const destination = ComposablePasteDestination.createForTesting({
        id: 'claude-code',
        displayName: 'Claude Code Chat',
        resource: { kind: 'singleton' },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused',
        loggingDetails: {},
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('test');

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
          reason: 'COMMAND_FOCUS_FAILED',
        },
        'Focus failed, cannot paste link',
      );
    });
  });

  describe('Editor-like destination (real EditorFocusCapability)', () => {
    it('should complete end-to-end paste flow with EditorFocusCapability', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockUri = createMockUri('/path/to/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [mockEditor];
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      const insertFactory = new EditorInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new EditorFocusCapability(
        mockAdapter,
        mockUri,
        1,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', uri: mockUri, viewColumn: 1 },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: { editorPath: '/path/to/file.ts' },
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(true);
      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(insertSpy).toHaveBeenCalledWith(mockEditor, 'src/file.ts#L10');
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
          editorPath: '/path/to/file.ts',
        },
        'Pasted link to Text Editor',
      );
    });

    it('should handle showTextDocument failure gracefully', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockUri = createMockUri('/path/to/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [mockEditor];
      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(new Error('Editor not found'));

      const insertFactory = new EditorInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new EditorFocusCapability(
        mockAdapter,
        mockUri,
        1,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', uri: mockUri, viewColumn: 1 },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: {},
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('test');

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
          reason: 'SHOW_DOCUMENT_FAILED',
        },
        'Focus failed, cannot paste link',
      );
    });

    it('should handle insertTextAtCursor returning false', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockUri = createMockUri('/path/to/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      mockAdapter.__getVscodeInstance().window.visibleTextEditors = [mockEditor];
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(false);

      const insertFactory = new EditorInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new EditorFocusCapability(
        mockAdapter,
        mockUri,
        1,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', uri: mockUri, viewColumn: 1 },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: {},
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('test');

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
        },
        'Failed to paste link to Text Editor',
      );
    });
  });

  describe('Cross-cutting concerns', () => {
    it('should return false when destination is not available', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const terminalPasteService = new TerminalPasteService(
        mockAdapter,
        createMockClipboardService(),
        mockLogger,
      );
      const insertFactory = new TerminalInsertFactory(terminalPasteService, mockLogger);
      const focusCapability = new TerminalFocusCapability(
        mockAdapter,
        mockTerminal,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(false),
        jumpSuccessMessage: 'Focused terminal',
        loggingDetails: {},
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('test');

      const result = await destination.pasteLink(formattedLink);

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
        },
        'Cannot paste link: Terminal not available',
      );
    });

    it('should call pasteIntoTerminal for terminal destinations', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const terminalPasteService = new TerminalPasteService(
        mockAdapter,
        createMockClipboardService(),
        mockLogger,
      );
      const insertFactory = new TerminalInsertFactory(terminalPasteService, mockLogger);
      const focusCapability = new TerminalFocusCapability(
        mockAdapter,
        mockTerminal,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      jest.spyOn(mockAdapter, 'showTerminal').mockReturnValue(Result.ok(undefined));
      const pasteTextSpy = jest
        .spyOn(terminalPasteService, 'pasteIntoTerminal')
        .mockResolvedValue(Result.ok(undefined));

      const destination = ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused terminal',
        loggingDetails: {},
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('test-link');

      await destination.pasteLink(formattedLink);

      expect(pasteTextSpy).toHaveBeenCalledWith(formattedLink.link, mockTerminal);
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          fn: 'ComposablePasteDestination.pasteLink',
          formattedLink,
          linkLength: formattedLink.link.length,
        },
        'Pasted link to Terminal',
      );
    });
  });
});
