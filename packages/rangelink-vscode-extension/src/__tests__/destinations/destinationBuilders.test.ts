import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import {
  buildClaudeCodeDestination,
  buildCursorAIDestination,
  buildGitHubCopilotChatDestination,
  buildTerminalDestination,
  buildTextEditorDestination,
  registerAllDestinationBuilders,
} from '../../destinations/destinationBuilders';
import type { DestinationBuilderContext } from '../../destinations/DestinationRegistry';
import {
  createMockDocument,
  createMockEditor,
  createMockEligibilityCheckerFactory,
  createMockPasteExecutorFactory,
  createMockTerminal,
  createMockUri,
  createMockVscodeAdapter,
} from '../helpers';

describe('destinationBuilders', () => {
  const mockLogger = createMockLogger();

  const createMockContext = (
    adapterOverrides?: Parameters<typeof createMockVscodeAdapter>[0],
  ): DestinationBuilderContext => ({
    factories: {
      pasteExecutor: createMockPasteExecutorFactory(),
      eligibilityChecker: createMockEligibilityCheckerFactory(),
    },
    ideAdapter: createMockVscodeAdapter(adapterOverrides),
    logger: mockLogger,
  });

  describe('buildTerminalDestination', () => {
    it('creates terminal destination with correct id and displayName', () => {
      const context = createMockContext();
      const terminal = createMockTerminal({ name: 'zsh' });

      const destination = buildTerminalDestination({ kind: 'terminal', terminal }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'terminal',
        displayName: 'Terminal ("zsh")',
      });
    });

    it('throws RangeLinkExtensionError when called with wrong kind', () => {
      const context = createMockContext();

      expect(() =>
        buildTerminalDestination({ kind: 'text-editor', editor: {} as vscode.TextEditor }, context),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_DESTINATION_TYPE', {
        message: 'buildTerminalDestination called with wrong kind: text-editor',
        functionName: 'buildTerminalDestination',
        details: { actualKind: 'text-editor', expectedKind: 'terminal' },
      });
    });
  });

  describe('buildTextEditorDestination', () => {
    it('uses workspace-relative path in displayName when file is in workspace', () => {
      const mockUri = createMockUri('/workspace/src/auth.ts');
      const editor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });
      const context = createMockContext();
      context.ideAdapter.getWorkspaceFolder = jest.fn().mockReturnValue({ uri: mockUri });
      context.ideAdapter.asRelativePath = jest.fn().mockReturnValue('src/auth.ts');

      const destination = buildTextEditorDestination({ kind: 'text-editor', editor }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'text-editor',
        displayName: 'Text Editor ("src/auth.ts")',
      });
    });

    it('uses filename in displayName when file is not in workspace', () => {
      const mockUri = createMockUri('/external/standalone.ts');
      const editor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });
      const context = createMockContext();
      context.ideAdapter.getWorkspaceFolder = jest.fn().mockReturnValue(undefined);

      const destination = buildTextEditorDestination({ kind: 'text-editor', editor }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'text-editor',
        displayName: 'Text Editor ("standalone.ts")',
      });
    });

    it('uses untitled display name for untitled files', () => {
      const mockUri = {
        scheme: 'untitled',
        fsPath: 'Untitled-1',
        path: 'Untitled-1',
      } as vscode.Uri;
      const editor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
      });
      const context = createMockContext();

      const destination = buildTextEditorDestination({ kind: 'text-editor', editor }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'text-editor',
        displayName: 'Text Editor ("Untitled-1")',
      });
    });

    it('throws RangeLinkExtensionError when called with wrong kind', () => {
      const context = createMockContext();

      expect(() =>
        buildTextEditorDestination({ kind: 'terminal', terminal: {} as vscode.Terminal }, context),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_DESTINATION_TYPE', {
        message: 'buildTextEditorDestination called with wrong kind: terminal',
        functionName: 'buildTextEditorDestination',
        details: { actualKind: 'terminal', expectedKind: 'text-editor' },
      });
    });
  });

  describe('buildCursorAIDestination', () => {
    it('creates cursor-ai destination with correct id and displayName', () => {
      const context = createMockContext();

      const destination = buildCursorAIDestination({ kind: 'cursor-ai' }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'cursor-ai',
        displayName: 'Cursor AI Assistant',
      });
    });

    it('throws RangeLinkExtensionError when called with wrong kind', () => {
      const context = createMockContext();

      expect(() =>
        buildCursorAIDestination({ kind: 'terminal', terminal: {} as vscode.Terminal }, context),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_DESTINATION_TYPE', {
        message: 'buildCursorAIDestination called with wrong kind: terminal',
        functionName: 'buildCursorAIDestination',
        details: { actualKind: 'terminal', expectedKind: 'cursor-ai' },
      });
    });
  });

  describe('buildClaudeCodeDestination', () => {
    it('creates claude-code destination with correct id and displayName', () => {
      const context = createMockContext();

      const destination = buildClaudeCodeDestination({ kind: 'claude-code' }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'claude-code',
        displayName: 'Claude Code Chat',
      });
    });

    it('throws RangeLinkExtensionError when called with wrong kind', () => {
      const context = createMockContext();

      expect(() =>
        buildClaudeCodeDestination({ kind: 'terminal', terminal: {} as vscode.Terminal }, context),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_DESTINATION_TYPE', {
        message: 'buildClaudeCodeDestination called with wrong kind: terminal',
        functionName: 'buildClaudeCodeDestination',
        details: { actualKind: 'terminal', expectedKind: 'claude-code' },
      });
    });
  });

  describe('buildGitHubCopilotChatDestination', () => {
    it('creates github-copilot-chat destination with correct id and displayName', () => {
      const context = createMockContext();

      const destination = buildGitHubCopilotChatDestination(
        { kind: 'github-copilot-chat' },
        context,
      );

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'github-copilot-chat',
        displayName: 'GitHub Copilot Chat',
      });
    });

    it('throws RangeLinkExtensionError when called with wrong kind', () => {
      const context = createMockContext();

      expect(() =>
        buildGitHubCopilotChatDestination(
          { kind: 'terminal', terminal: {} as vscode.Terminal },
          context,
        ),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_DESTINATION_TYPE', {
        message: 'buildGitHubCopilotChatDestination called with wrong kind: terminal',
        functionName: 'buildGitHubCopilotChatDestination',
        details: { actualKind: 'terminal', expectedKind: 'github-copilot-chat' },
      });
    });
  });

  describe('registerAllDestinationBuilders', () => {
    it('registers all five destination types', () => {
      const mockRegister = jest.fn();
      const mockRegistry = { register: mockRegister };

      registerAllDestinationBuilders(mockRegistry);

      expect(mockRegister).toHaveBeenCalledTimes(5);
      expect(mockRegister).toHaveBeenCalledWith('terminal', buildTerminalDestination);
      expect(mockRegister).toHaveBeenCalledWith('text-editor', buildTextEditorDestination);
      expect(mockRegister).toHaveBeenCalledWith('cursor-ai', buildCursorAIDestination);
      expect(mockRegister).toHaveBeenCalledWith('claude-code', buildClaudeCodeDestination);
      expect(mockRegister).toHaveBeenCalledWith(
        'github-copilot-chat',
        buildGitHubCopilotChatDestination,
      );
    });
  });
});
