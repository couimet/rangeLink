/**
 * Integration tests for ComposablePasteDestination.
 *
 * These tests use REAL PasteExecutor implementations (not mocks) to verify
 * end-to-end orchestration works correctly. The VscodeAdapter is mocked
 * to control IDE behavior without requiring a real VSCode instance.
 *
 * Purpose: Ensure mocks used in unit tests accurately represent real behavior.
 */
import { createMockLogger } from 'barebone-logger-testing';

import { AlwaysEligibleChecker } from '../../destinations/capabilities/AlwaysEligibleChecker';
import { CommandPasteExecutor } from '../../destinations/capabilities/CommandPasteExecutor';
import { EditorPasteExecutor } from '../../destinations/capabilities/EditorPasteExecutor';
import type { EligibilityChecker } from '../../destinations/capabilities/EligibilityChecker';
import { SelfPasteChecker } from '../../destinations/capabilities/SelfPasteChecker';
import { TerminalPasteExecutor } from '../../destinations/capabilities/TerminalPasteExecutor';
import { ComposablePasteDestination } from '../../destinations/ComposablePasteDestination';
import { TerminalFocusType } from '../../types';
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

  describe('Terminal-like destination (real TerminalPasteExecutor)', () => {
    it('should complete end-to-end paste flow with TerminalPasteExecutor', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({
        name: 'Test Terminal',
        processId: Promise.resolve(12345),
      });

      const pasteExecutor = new TerminalPasteExecutor(mockAdapter, mockTerminal, mockLogger);
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

      const showTerminalSpy = jest.spyOn(mockAdapter, 'showTerminal');
      const pasteTextSpy = jest
        .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
        .mockResolvedValue(undefined);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        pasteExecutor,
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
      expect(showTerminalSpy).toHaveBeenCalledWith(mockTerminal, TerminalFocusType.StealFocus);
      expect(pasteTextSpy).toHaveBeenCalledTimes(1);
      expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, ' src/file.ts#L10 ');
    });

    it('should verify focus happens before text insertion', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const pasteExecutor = new TerminalPasteExecutor(mockAdapter, mockTerminal, mockLogger);
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

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
        pasteExecutor,
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

  describe('AI Assistant-like destination (real CommandPasteExecutor)', () => {
    it('should complete end-to-end paste flow with clipboard and commands', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const pasteExecutor = new CommandPasteExecutor(
        mockAdapter,
        ['ai.assistant.focus'],
        ['editor.action.clipboardPasteAction'],
        mockLogger,
      );
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

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
        pasteExecutor,
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

      const pasteExecutor = new CommandPasteExecutor(
        mockAdapter,
        ['command.first', 'command.second', 'command.third'],
        ['editor.action.clipboardPasteAction'],
        mockLogger,
      );
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

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
        pasteExecutor,
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

      const pasteExecutor = new CommandPasteExecutor(
        mockAdapter,
        ['command.first', 'command.second'],
        ['editor.action.clipboardPasteAction'],
        mockLogger,
      );
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

      jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('First failed'))
        .mockRejectedValueOnce(new Error('Second failed'));

      const destination = ComposablePasteDestination.createForTesting({
        id: 'claude-code',
        displayName: 'Claude Code Chat',
        resource: { kind: 'singleton' },
        pasteExecutor,
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

  describe('Text Editor-like destination (real EditorPasteExecutor)', () => {
    it('should reject paste when eligibility checker returns false', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const boundEditorUri = createMockUri('/bound-editor.ts');
      const boundEditor = createMockEditor({
        document: createMockDocument({ uri: boundEditorUri }),
        viewColumn: 1,
      });

      const pasteExecutor = new EditorPasteExecutor(
        mockAdapter,
        boundEditorUri,
        boundEditor.viewColumn,
        mockLogger,
      );
      const eligibilityChecker = new RejectingEligibilityChecker();

      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor');

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: boundEditor },
        pasteExecutor,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: { editorPath: '/bound-editor.ts' },
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink, 'both');

      expect(result).toBe(false);
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('should allow paste with SelfPasteChecker when content is valid', async () => {
      const mockAdapter = createMockVscodeAdapter();

      const boundEditorUri = createMockUri('/bound-editor.ts');
      const boundEditor = createMockEditor({
        document: createMockDocument({ uri: boundEditorUri }),
        viewColumn: 1,
      });

      const pasteExecutor = new EditorPasteExecutor(
        mockAdapter,
        boundEditorUri,
        boundEditor.viewColumn,
        mockLogger,
      );
      const eligibilityChecker = new SelfPasteChecker(mockLogger);

      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(boundEditor);
      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: boundEditor },
        pasteExecutor,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: { editorPath: '/bound-editor.ts' },
        logger: mockLogger,
      });

      const formattedLink = createMockFormattedLink('src/file.ts#L10');

      const result = await destination.pasteLink(formattedLink, 'both');

      expect(result).toBe(true);
      expect(insertSpy).toHaveBeenCalledTimes(1);
    });

    it('should use EditorPasteExecutor to focus editor document', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const boundEditorUri = createMockUri('/bound-editor.ts');
      const boundEditor = createMockEditor({
        document: createMockDocument({ uri: boundEditorUri }),
        viewColumn: 2,
      });

      const pasteExecutor = new EditorPasteExecutor(
        mockAdapter,
        boundEditorUri,
        boundEditor.viewColumn,
        mockLogger,
      );
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

      const showDocSpy = jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(boundEditor);
      jest.spyOn(mockAdapter, 'insertTextAtCursor').mockResolvedValue(true);

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: boundEditor },
        pasteExecutor,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: {},
        logger: mockLogger,
      });

      await destination.pasteLink(createMockFormattedLink('test'), 'both');

      expect(showDocSpy).toHaveBeenCalledTimes(1);
      expect(showDocSpy).toHaveBeenCalledWith(boundEditorUri, { viewColumn: 2 });
    });

    it('should return false when showTextDocument fails', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const boundEditorUri = createMockUri('/bound-editor.ts');
      const boundEditor = createMockEditor({
        document: createMockDocument({ uri: boundEditorUri }),
        viewColumn: 1,
      });

      const pasteExecutor = new EditorPasteExecutor(
        mockAdapter,
        boundEditorUri,
        boundEditor.viewColumn,
        mockLogger,
      );
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(new Error('Editor closed'));
      const insertSpy = jest.spyOn(mockAdapter, 'insertTextAtCursor');

      const destination = ComposablePasteDestination.createForTesting({
        id: 'text-editor',
        displayName: 'Text Editor',
        resource: { kind: 'editor', editor: boundEditor },
        pasteExecutor,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused editor',
        loggingDetails: {},
        logger: mockLogger,
      });

      const result = await destination.pasteLink(createMockFormattedLink('test'), 'both');

      expect(result).toBe(false);
      expect(insertSpy).not.toHaveBeenCalled();
    });
  });

  describe('focus() standalone operation', () => {
    it('should focus destination without pasting', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });

      const pasteExecutor = new TerminalPasteExecutor(mockAdapter, mockTerminal, mockLogger);
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

      const pasteTextSpy = jest.spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard');

      const destination = ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        pasteExecutor,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused terminal',
        loggingDetails: {},
        logger: mockLogger,
      });

      const result = await destination.focus();

      expect(result).toBe(true);
      expect(mockTerminal.show).toHaveBeenCalledTimes(1);
      expect(pasteTextSpy).not.toHaveBeenCalled();
    });
  });

  describe('paddingMode forwarding verification', () => {
    const setupTerminalDestination = (
      mockAdapter: ReturnType<typeof createMockVscodeAdapter>,
      mockTerminal: ReturnType<typeof createMockTerminal>,
    ) => {
      const pasteExecutor = new TerminalPasteExecutor(mockAdapter, mockTerminal, mockLogger);
      const eligibilityChecker = new AlwaysEligibleChecker(mockLogger);

      return ComposablePasteDestination.createForTesting({
        id: 'terminal',
        displayName: 'Terminal',
        resource: { kind: 'terminal', terminal: mockTerminal },
        pasteExecutor,
        eligibilityChecker,
        isAvailable: () => Promise.resolve(true),
        jumpSuccessMessage: 'Focused terminal',
        loggingDetails: {},
        logger: mockLogger,
      });
    };

    it('should apply both-side padding when paddingMode is "both"', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });
      const pasteTextSpy = jest
        .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
        .mockResolvedValue(undefined);

      const destination = setupTerminalDestination(mockAdapter, mockTerminal);

      await destination.pasteLink(createMockFormattedLink('file.ts#L5'), 'both');

      expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, ' file.ts#L5 ');
    });

    it('should apply before-only padding when paddingMode is "before"', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });
      const pasteTextSpy = jest
        .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
        .mockResolvedValue(undefined);

      const destination = setupTerminalDestination(mockAdapter, mockTerminal);

      await destination.pasteLink(createMockFormattedLink('file.ts#L5'), 'before');

      expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, ' file.ts#L5');
    });

    it('should apply after-only padding when paddingMode is "after"', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });
      const pasteTextSpy = jest
        .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
        .mockResolvedValue(undefined);

      const destination = setupTerminalDestination(mockAdapter, mockTerminal);

      await destination.pasteLink(createMockFormattedLink('file.ts#L5'), 'after');

      expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, 'file.ts#L5 ');
    });

    it('should apply no padding when paddingMode is "none"', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });
      const pasteTextSpy = jest
        .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
        .mockResolvedValue(undefined);

      const destination = setupTerminalDestination(mockAdapter, mockTerminal);

      await destination.pasteLink(createMockFormattedLink('file.ts#L5'), 'none');

      expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, 'file.ts#L5');
    });

    it('should forward paddingMode through pasteContent as well', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const mockTerminal = createMockTerminal({ name: 'Test Terminal' });
      const pasteTextSpy = jest
        .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
        .mockResolvedValue(undefined);

      const destination = setupTerminalDestination(mockAdapter, mockTerminal);

      await destination.pasteContent('const x = 1;', 'both');

      expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, ' const x = 1; ');
    });
  });
});
