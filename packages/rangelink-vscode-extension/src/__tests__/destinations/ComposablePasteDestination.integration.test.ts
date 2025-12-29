/**
 * Integration tests for ComposablePasteDestination.
 *
 * These tests use REAL capability implementations (not mocks) to verify
 * end-to-end orchestration works correctly. The VscodeAdapter is mocked
 * to control IDE behavior without requiring a real VSCode instance.
 *
 * Purpose: Ensure mocks used in unit tests accurately represent real behavior.
 */
import { createMockLogger } from 'barebone-logger-testing';

import { AlwaysEligibleChecker } from '../../destinations/capabilities/AlwaysEligibleChecker';
import { CommandFocusManager } from '../../destinations/capabilities/CommandFocusManager';
import { EditorFocusManager } from '../../destinations/capabilities/EditorFocusManager';
import { EditorTextInserter } from '../../destinations/capabilities/EditorTextInserter';
import type { EligibilityChecker } from '../../destinations/capabilities/EligibilityChecker';
import { NativeCommandTextInserter } from '../../destinations/capabilities/NativeCommandTextInserter';
import { SelfPasteChecker } from '../../destinations/capabilities/SelfPasteChecker';
import { TerminalFocusManager } from '../../destinations/capabilities/TerminalFocusManager';
import { ComposablePasteDestination } from '../../destinations/ComposablePasteDestination';
import { TerminalFocusType } from '../../types/TerminalFocusType';
import {
  createMockDocument,
  createMockEditor,
  createMockFormattedLink,
  createMockTerminal,
  createMockUri,
  createMockVscodeAdapter,
} from '../helpers';

/**
 * Mock eligibility checker that rejects content (simulates self-paste rejection).
 */
class RejectingEligibilityChecker implements EligibilityChecker {
  async isEligible(): Promise<boolean> {
    return false;
  }
}

describe('ComposablePasteDestination Integration Tests', () => {
  const mockLogger = createMockLogger();

  describe('Terminal-like destination (real capabilities)', () => {
    it('should complete end-to-end paste flow with TerminalFocusManager', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({
        name: 'Test Terminal',
        processId: Promise.resolve(12345),
      });

      // Use REAL capability implementations
      const focusManager = new TerminalFocusManager(mockAdapter, mockTerminal, mockLogger);
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

      // Mock the adapter methods
      const showTerminalSpy = jest.spyOn(mockAdapter, 'showTerminal').mockReturnValue(undefined);
      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      // Create a mock text inserter that uses the adapter
      const textInserter = new EditorTextInserter(
        mockAdapter,
        createMockEditor({ document: createMockDocument({ uri: createMockUri('/test.ts') }) }),
        mockLogger,
      );

      const destination = ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        textInserter,
        eligibilityChecker,
        focusManager,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused terminal',
        loggingDetails: { terminalName: 'Test Terminal' },
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink, 'both');

      expect(result).toStrictEqual(true);
      expect(showTerminalSpy).toHaveBeenCalledTimes(1);
      expect(showTerminalSpy).toHaveBeenCalledWith(mockTerminal, TerminalFocusType.StealFocus);
      expect(insertSpy).toHaveBeenCalledTimes(1);
    });

    it('should verify focus happens before text insertion', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });
      const mockEditor = createMockEditor({
        document: createMockDocument({ uri: createMockUri('/test.ts') }),
      });

      const focusManager = new TerminalFocusManager(mockAdapter, mockTerminal, mockLogger);
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);
      const textInserter = new EditorTextInserter(mockAdapter, mockEditor, mockLogger);

      const callOrder: string[] = [];

      jest.spyOn(mockAdapter, 'showTerminal').mockImplementation(() => {
        callOrder.push('focus');
        return undefined;
      });

      jest.spyOn(mockAdapter, 'insertTextAtCursor').mockImplementation(async () => {
        callOrder.push('insert');
        return true;
      });

      const destination = ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        textInserter,
        eligibilityChecker,
        focusManager,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused terminal',
        loggingDetails: {},
        logger: mockLogger,
      });

      await destination.pasteLink(createMockFormattedLink('test-link'), 'both');

      expect(callOrder).toStrictEqual(['focus', 'insert']);
    });
  });

  describe('GitHub Copilot-like destination (NativeCommandTextInserter)', () => {
    it('should use native API insertion without clipboard', async () => {
      const mockAdapter = createMockVscodeAdapter();

      // Use REAL capability implementations
      const focusManager = new CommandFocusManager(
        mockAdapter,
        ['github.copilot.chat.focus'],
        mockLogger,
      );
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);
      const textInserter = new NativeCommandTextInserter(
        mockAdapter,
        'github.copilot.chat.insert',
        (text) => ({ query: text, isPartialQuery: true }),
        mockLogger,
      );

      const focusSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'github-copilot-chat',
        displayName: 'GitHub Copilot Chat',
        resource: { kind: 'singleton' },
        textInserter,
        eligibilityChecker,
        focusManager,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused Copilot Chat',
        loggingDetails: {},
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink, 'both');

      expect(result).toStrictEqual(true);
      // Focus command called first, then insert command
      expect(focusSpy).toHaveBeenCalledTimes(2);
      expect(focusSpy).toHaveBeenNthCalledWith(1, 'github.copilot.chat.focus');
      expect(focusSpy).toHaveBeenNthCalledWith(2, 'github.copilot.chat.insert', {
        query: ' src/file.ts#L10 ', // padded
        isPartialQuery: true,
      });
    });

    it('should try focus commands in order until success', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const focusManager = new CommandFocusManager(
        mockAdapter,
        ['command.first', 'command.second', 'command.third'],
        mockLogger,
      );
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);
      const textInserter = new NativeCommandTextInserter(
        mockAdapter,
        'insert.command',
        (text) => ({ text }),
        mockLogger,
      );

      // First command fails, second succeeds
      const commandSpy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(undefined) // Second succeeds (focus)
        .mockResolvedValueOnce(undefined); // Insert succeeds

      const destination = ComposablePasteDestination.createForTesting({
        id: 'github-copilot-chat',
        displayName: 'GitHub Copilot Chat',
        resource: { kind: 'singleton' },
        textInserter,
        eligibilityChecker,
        focusManager,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused',
        loggingDetails: {},
        logger: mockLogger,
      });

      const result = await destination.pasteLink(createMockFormattedLink('test'), 'both');

      expect(result).toStrictEqual(true);
      expect(commandSpy).toHaveBeenCalledTimes(3);
      expect(commandSpy).toHaveBeenNthCalledWith(1, 'command.first');
      expect(commandSpy).toHaveBeenNthCalledWith(2, 'command.second');
      expect(commandSpy).toHaveBeenNthCalledWith(3, 'insert.command', { text: ' test ' });
    });
  });

  describe('Text Editor-like destination (EditorTextInserter)', () => {
    it('should reject paste when eligibility checker returns false', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const boundEditorUri = createMockUri('/bound-editor.ts');
      const boundEditor = createMockEditor({
        document: createMockDocument({ uri: boundEditorUri }),
      });

      // Use REAL focus manager and text inserter, but mock eligibility to reject
      const focusManager = new EditorFocusManager(mockAdapter, boundEditor, mockLogger);
      const eligibilityChecker = new RejectingEligibilityChecker();
      const textInserter = new EditorTextInserter(mockAdapter, boundEditor, mockLogger);

      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor');

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: boundEditor },
        textInserter,
        eligibilityChecker,
        focusManager,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: { editorPath: '/bound-editor.ts' },
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink, 'both');

      expect(result).toStrictEqual(false);
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('should allow paste with SelfPasteChecker when content is valid', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const boundEditorUri = createMockUri('/bound-editor.ts');
      const boundEditor = createMockEditor({
        document: createMockDocument({ uri: boundEditorUri }),
      });

      // Use REAL capability implementations
      const focusManager = new EditorFocusManager(mockAdapter, boundEditor, mockLogger);
      const eligibilityChecker = new SelfPasteChecker(mockLogger);
      const textInserter = new EditorTextInserter(mockAdapter, boundEditor, mockLogger);

      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(boundEditor);
      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: boundEditor },
        textInserter,
        eligibilityChecker,
        focusManager,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: { editorPath: '/bound-editor.ts' },
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink, 'both');

      expect(result).toStrictEqual(true);
      expect(insertSpy).toHaveBeenCalledTimes(1);
    });

    it('should use EditorFocusManager to focus editor document', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const boundEditorUri = createMockUri('/bound-editor.ts');
      const boundEditor = createMockEditor({
        document: createMockDocument({ uri: boundEditorUri }),
        viewColumn: 2,
      });

      const focusManager = new EditorFocusManager(mockAdapter, boundEditor, mockLogger);
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);
      const textInserter = new EditorTextInserter(mockAdapter, boundEditor, mockLogger);

      const showDocSpy = jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(boundEditor);
      jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: boundEditor },
        textInserter,
        eligibilityChecker,
        focusManager,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: {},
        logger: mockLogger,
      });

      await destination.pasteLink(createMockFormattedLink('test'), 'both');

      expect(showDocSpy).toHaveBeenCalledTimes(1);
      expect(showDocSpy).toHaveBeenCalledWith(boundEditorUri, { viewColumn: 2 });
    });
  });

  describe('focus() standalone operation', () => {
    it('should focus destination without pasting', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const focusManager = new TerminalFocusManager(mockAdapter, mockTerminal, mockLogger);
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);
      const textInserter = new EditorTextInserter(
        mockAdapter,
        createMockEditor({ document: createMockDocument({ uri: createMockUri('/test.ts') }) }),
        mockLogger,
      );

      const showTerminalSpy = jest.spyOn(mockAdapter, 'showTerminal').mockReturnValue(undefined);
      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor');

      const destination = ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        textInserter,
        eligibilityChecker,
        focusManager,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused terminal',
        loggingDetails: {},
        logger: mockLogger,
      });

      const result = await destination.focus();

      expect(result).toStrictEqual(true);
      expect(showTerminalSpy).toHaveBeenCalledTimes(1);
      expect(insertSpy).not.toHaveBeenCalled();
    });
  });

  describe('paddingMode forwarding verification', () => {
    const setupCopilotChatDestination = (
      mockAdapter: ReturnType<typeof createMockVscodeAdapter>,
    ) => {
      const focusManager = new CommandFocusManager(
        mockAdapter,
        ['github.copilot.chat.focus'],
        mockLogger,
      );
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);
      const textInserter = new NativeCommandTextInserter(
        mockAdapter,
        'github.copilot.chat.insert',
        (text) => ({ query: text, isPartialQuery: true }),
        mockLogger,
      );

      return ComposablePasteDestination.createForTesting({
        id: 'github-copilot-chat',
        displayName: 'GitHub Copilot Chat',
        resource: { kind: 'singleton' },
        textInserter,
        eligibilityChecker,
        focusManager,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused Copilot Chat',
        loggingDetails: {},
        logger: mockLogger,
      });
    };

    it('should apply both-side padding when paddingMode is "both"', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
      const destination = setupCopilotChatDestination(mockAdapter);

      await destination.pasteLink(createMockFormattedLink('file.ts#L5'), 'both');

      expect(commandSpy).toHaveBeenNthCalledWith(2, 'github.copilot.chat.insert', {
        query: ' file.ts#L5 ',
        isPartialQuery: true,
      });
    });

    it('should apply before-only padding when paddingMode is "before"', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
      const destination = setupCopilotChatDestination(mockAdapter);

      await destination.pasteLink(createMockFormattedLink('file.ts#L5'), 'before');

      expect(commandSpy).toHaveBeenNthCalledWith(2, 'github.copilot.chat.insert', {
        query: ' file.ts#L5',
        isPartialQuery: true,
      });
    });

    it('should apply after-only padding when paddingMode is "after"', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
      const destination = setupCopilotChatDestination(mockAdapter);

      await destination.pasteLink(createMockFormattedLink('file.ts#L5'), 'after');

      expect(commandSpy).toHaveBeenNthCalledWith(2, 'github.copilot.chat.insert', {
        query: 'file.ts#L5 ',
        isPartialQuery: true,
      });
    });

    it('should apply no padding when paddingMode is "none"', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
      const destination = setupCopilotChatDestination(mockAdapter);

      await destination.pasteLink(createMockFormattedLink('file.ts#L5'), 'none');

      expect(commandSpy).toHaveBeenNthCalledWith(2, 'github.copilot.chat.insert', {
        query: 'file.ts#L5',
        isPartialQuery: true,
      });
    });

    it('should forward paddingMode through pasteContent as well', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const commandSpy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);
      const destination = setupCopilotChatDestination(mockAdapter);

      await destination.pasteContent('const x = 1;', 'both');

      expect(commandSpy).toHaveBeenNthCalledWith(2, 'github.copilot.chat.insert', {
        query: ' const x = 1; ',
        isPartialQuery: true,
      });
    });
  });
});
