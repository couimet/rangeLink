/**
 * Integration tests for ComposablePasteDestination.
 *
 * These tests use REAL FocusCapability implementations (not mocks) to verify
 * end-to-end orchestration works correctly. The VscodeAdapter is mocked
 * to control IDE behavior without requiring a real VSCode instance.
 *
 * Purpose: Ensure mocks used in unit tests accurately represent real behavior.
 */
import { createMockLogger } from 'barebone-logger-testing';

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
import {
  createMockDocument,
  createMockEditor,
  createMockFormattedLink,
  createMockTerminal,
  createMockUri,
  createMockVscodeAdapter,
} from '../helpers';

describe('ComposablePasteDestination Integration Tests', () => {
  const mockLogger = createMockLogger();

  describe('Terminal-like destination (real TerminalFocusCapability)', () => {
    it('should complete end-to-end paste flow with TerminalFocusCapability', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({
        name: 'Test Terminal',
        processId: Promise.resolve(12345),
      });

      const insertFactory = new TerminalInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new TerminalFocusCapability(
        mockAdapter,
        mockTerminal,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const showTerminalSpy = jest.spyOn(mockAdapter, 'showTerminal');
      const pasteTextSpy = jest
        .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
        .mockResolvedValue(undefined);

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

      const result = await destination.pasteLink(formattedLink, 'both');

      expect(result).toBe(true);
      expect(showTerminalSpy).toHaveBeenCalledTimes(1);
      expect(showTerminalSpy).toHaveBeenCalledWith(mockTerminal, 'steal-focus');
      expect(pasteTextSpy).toHaveBeenCalledTimes(1);
      expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, ' src/file.ts#L10 ');
    });

    it('should verify focus happens before text insertion', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const insertFactory = new TerminalInsertFactory(mockAdapter, mockLogger);
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
      });

      jest.spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard').mockImplementation(async () => {
        callOrder.push('insert');
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

      await destination.pasteLink(createMockFormattedLink('test-link'), 'both');

      expect(callOrder).toStrictEqual(['focus', 'insert']);
    });
  });

  describe('AI Assistant-like destination (real AIAssistantFocusCapability)', () => {
    it('should complete end-to-end paste flow with clipboard and commands', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const insertFactory = new AIAssistantInsertFactory(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        mockLogger,
      );
      const focusCapability = new AIAssistantFocusCapability(
        mockAdapter,
        ['ai.assistant.focus'],
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const executeCommandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockResolvedValue(undefined);
      const clipboardSpy = jest
        .spyOn(mockAdapter, 'writeTextToClipboard')
        .mockResolvedValue(undefined);

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

      const result = await destination.pasteLink(formattedLink, 'both');

      expect(result).toBe(true);
      expect(executeCommandSpy).toHaveBeenCalledTimes(2);
      expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'ai.assistant.focus');
      expect(clipboardSpy).toHaveBeenCalledWith(' src/file.ts#L10 ');
      expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'editor.action.clipboardPasteAction');
    });

    it('should try focus commands in order until success', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const insertFactory = new AIAssistantInsertFactory(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        mockLogger,
      );
      const focusCapability = new AIAssistantFocusCapability(
        mockAdapter,
        ['command.first', 'command.second', 'command.third'],
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const executeCommandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);
      jest.spyOn(mockAdapter, 'writeTextToClipboard').mockResolvedValue(undefined);

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

      const result = await destination.pasteLink(createMockFormattedLink('test'), 'both');

      expect(result).toBe(true);
      expect(executeCommandSpy).toHaveBeenCalledTimes(3);
      expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'command.first');
      expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'command.second');
      expect(executeCommandSpy).toHaveBeenNthCalledWith(3, 'editor.action.clipboardPasteAction');
    });

    it('should return false when all focus commands fail', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const insertFactory = new AIAssistantInsertFactory(
        mockAdapter,
        ['editor.action.clipboardPasteAction'],
        mockLogger,
      );
      const focusCapability = new AIAssistantFocusCapability(
        mockAdapter,
        ['command.first', 'command.second'],
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

      const result = await destination.pasteLink(createMockFormattedLink('test'), 'both');

      expect(result).toBe(false);
    });
  });

  describe('Editor-like destination (real EditorFocusCapability)', () => {
    it('should complete end-to-end paste flow with EditorFocusCapability', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockUri = createMockUri('/path/to/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      const insertFactory = new EditorInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new EditorFocusCapability(
        mockAdapter,
        mockUri,
        undefined,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: mockEditor },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: { editorPath: '/path/to/file.ts' },
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink, 'both');

      expect(result).toBe(true);
      expect(insertSpy).toHaveBeenCalledTimes(1);
      expect(insertSpy).toHaveBeenCalledWith(mockEditor, ' src/file.ts#L10 ');
    });

    it('should handle showTextDocument failure gracefully', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockUri = createMockUri('/path/to/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(new Error('Editor not found'));

      const insertFactory = new EditorInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new EditorFocusCapability(
        mockAdapter,
        mockUri,
        undefined,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: mockEditor },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: {},
        logger: mockLogger,
      });

      const result = await destination.pasteLink(createMockFormattedLink('test'), 'both');

      expect(result).toBe(false);
    });

    it('should handle insertTextAtCursor returning false', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockUri = createMockUri('/path/to/file.ts');
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });

      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(mockEditor);
      jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(false);

      const insertFactory = new EditorInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new EditorFocusCapability(
        mockAdapter,
        mockUri,
        undefined,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: mockEditor },
        focusCapability,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: {},
        logger: mockLogger,
      });

      const result = await destination.pasteLink(createMockFormattedLink('test'), 'both');

      expect(result).toBe(false);
    });
  });

  describe('Cross-cutting concerns', () => {
    it('should return false when destination is not available', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const insertFactory = new TerminalInsertFactory(mockAdapter, mockLogger);
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

      const result = await destination.pasteLink(createMockFormattedLink('test'), 'both');

      expect(result).toBe(false);
    });

    it('should apply smart padding with "both" mode', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const insertFactory = new TerminalInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new TerminalFocusCapability(
        mockAdapter,
        mockTerminal,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      jest.spyOn(mockAdapter, 'showTerminal');
      const pasteTextSpy = jest
        .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
        .mockResolvedValue(undefined);

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

      await destination.pasteLink(createMockFormattedLink('test-link'), 'both');

      expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, ' test-link ');
    });

    it('should apply smart padding with "none" mode', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const insertFactory = new TerminalInsertFactory(mockAdapter, mockLogger);
      const focusCapability = new TerminalFocusCapability(
        mockAdapter,
        mockTerminal,
        insertFactory,
        mockLogger,
      );
      const eligibilityChecker = new ContentEligibilityChecker(mockLogger);

      jest.spyOn(mockAdapter, 'showTerminal');
      const pasteTextSpy = jest
        .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
        .mockResolvedValue(undefined);

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

      await destination.pasteLink(createMockFormattedLink('test-link'), 'none');

      expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, 'test-link');
    });
  });
});
