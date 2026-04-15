import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import {
  buildTerminalDestination,
  buildTextEditorDestination,
  createCustomAiAssistantBuilder,
  type DestinationBuilderContext,
  type DestinationBuilder,
  registerAllDestinationBuilders,
} from '../../destinations';
import { AutoPasteResult } from '../../types';
import type { DestinationKind } from '../../types';
import {
  createMockDocument,
  createMockEditor,
  createMockEligibilityCheckerFactory,
  createMockFocusCapabilityFactory,
  createMockTerminal,
  createMockUri,
  createMockVscodeAdapter,
  spyOnIsClaudeCodeAvailable,
  spyOnIsCursorIDEDetected,
  spyOnIsGitHubCopilotChatAvailable,
} from '../helpers';

describe('destinationBuilders', () => {
  const mockLogger = createMockLogger();

  const createMockContext = (
    adapterOverrides?: Parameters<typeof createMockVscodeAdapter>[0],
  ): DestinationBuilderContext => ({
    factories: {
      focusCapability: createMockFocusCapabilityFactory(),
      eligibilityChecker: createMockEligibilityCheckerFactory(),
    },
    ideAdapter: createMockVscodeAdapter(adapterOverrides),
    logger: mockLogger,
  });

  /**
   * Register all builders and extract the builder for a specific kind.
   */
  const getBuiltinBuilder = (kind: DestinationKind): DestinationBuilder => {
    const builders = new Map<DestinationKind, DestinationBuilder>();
    registerAllDestinationBuilders({
      register: (k: DestinationKind, b: DestinationBuilder) => builders.set(k, b),
    });
    const builder = builders.get(kind);
    if (!builder) {
      throw new Error(`No builder registered for kind: ${kind}`);
    }
    return builder;
  };

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

    it('compareWith delegates to compareTerminalsByProcessId', async () => {
      const context = createMockContext();
      const terminal = createMockTerminal({ name: 'zsh', processId: Promise.resolve(1234) });
      const destination = buildTerminalDestination({ kind: 'terminal', terminal }, context);

      const otherTerminal = createMockTerminal({ name: 'bash', processId: Promise.resolve(5678) });
      const otherDestination = buildTerminalDestination(
        { kind: 'terminal', terminal: otherTerminal },
        context,
      );

      expect(await destination.equals(otherDestination)).toBe(false);
      expect(await destination.equals(destination)).toBe(true);
    });

    it('throws RangeLinkExtensionError when called with wrong kind', () => {
      const context = createMockContext();

      expect(() =>
        buildTerminalDestination(
          { kind: 'text-editor', uri: createMockUri('/test.ts'), viewColumn: 1 },
          context,
        ),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_DESTINATION_KIND', {
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
        viewColumn: 1,
      });
      const context = createMockContext({ windowOptions: { visibleTextEditors: [editor] } });
      context.ideAdapter.getWorkspaceFolder = jest.fn().mockReturnValue({ uri: mockUri });
      context.ideAdapter.asRelativePath = jest.fn().mockReturnValue('src/auth.ts');

      const destination = buildTextEditorDestination(
        { kind: 'text-editor', uri: mockUri, viewColumn: 1 },
        context,
      );

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'text-editor',
        displayName: 'Text Editor ("src/auth.ts")',
      });
    });

    it('uses filename in displayName when file is not in workspace', () => {
      const mockUri = createMockUri('/external/standalone.ts');
      const editor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
        viewColumn: 1,
      });
      const context = createMockContext({ windowOptions: { visibleTextEditors: [editor] } });
      context.ideAdapter.getWorkspaceFolder = jest.fn().mockReturnValue(undefined);

      const destination = buildTextEditorDestination(
        { kind: 'text-editor', uri: mockUri, viewColumn: 1 },
        context,
      );

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'text-editor',
        displayName: 'Text Editor ("standalone.ts")',
      });
    });

    it('uses untitled display name for untitled files', () => {
      const mockUri = createMockUri('Untitled-1', {
        scheme: 'untitled',
        toString: () => 'untitled:Untitled-1',
      });
      const editor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
        viewColumn: 1,
      });
      const context = createMockContext({ windowOptions: { visibleTextEditors: [editor] } });

      const destination = buildTextEditorDestination(
        { kind: 'text-editor', uri: mockUri, viewColumn: 1 },
        context,
      );

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'text-editor',
        displayName: 'Text Editor ("Untitled-1")',
      });
    });

    it('compareWith delegates to compareEditorsByUri', async () => {
      const mockUri = createMockUri('/workspace/src/auth.ts');
      const editor = createMockEditor({
        document: createMockDocument({ uri: mockUri }),
        viewColumn: 1,
      });
      const context = createMockContext({ windowOptions: { visibleTextEditors: [editor] } });
      context.ideAdapter.getWorkspaceFolder = jest.fn().mockReturnValue({ uri: mockUri });
      context.ideAdapter.asRelativePath = jest.fn().mockReturnValue('src/auth.ts');

      const destination = buildTextEditorDestination(
        { kind: 'text-editor', uri: mockUri, viewColumn: 1 },
        context,
      );

      const differentUri = createMockUri('/workspace/src/other.ts');
      const otherEditor = createMockEditor({
        document: createMockDocument({ uri: differentUri }),
        viewColumn: 2,
      });
      const otherContext = createMockContext({
        windowOptions: { visibleTextEditors: [otherEditor] },
      });
      otherContext.ideAdapter.getWorkspaceFolder = jest.fn().mockReturnValue({ uri: differentUri });
      otherContext.ideAdapter.asRelativePath = jest.fn().mockReturnValue('src/other.ts');

      const otherDestination = buildTextEditorDestination(
        { kind: 'text-editor', uri: differentUri, viewColumn: 2 },
        otherContext,
      );

      expect(await destination.equals(otherDestination)).toBe(false);
      expect(await destination.equals(destination)).toBe(true);
    });

    it('throws RangeLinkExtensionError when called with wrong kind', () => {
      const context = createMockContext();

      expect(() =>
        buildTextEditorDestination({ kind: 'terminal', terminal: {} as vscode.Terminal }, context),
      ).toThrowRangeLinkExtensionError('UNEXPECTED_DESTINATION_KIND', {
        message: 'buildTextEditorDestination called with wrong kind: terminal',
        functionName: 'buildTextEditorDestination',
        details: { actualKind: 'terminal', expectedKind: 'text-editor' },
      });
    });
  });

  describe('built-in AI assistants via registerAllDestinationBuilders', () => {
    it('creates cursor-ai destination with correct id and displayName', () => {
      const builder = getBuiltinBuilder('cursor-ai');
      const context = createMockContext();

      const destination = builder({ kind: 'cursor-ai' }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'cursor-ai',
        displayName: 'Cursor AI Assistant',
      });
    });

    it('cursor-ai isAvailable delegates to isCursorIDEDetected', async () => {
      const spy = spyOnIsCursorIDEDetected().mockReturnValue(true);
      const builder = getBuiltinBuilder('cursor-ai');
      const context = createMockContext();
      const destination = builder({ kind: 'cursor-ai' }, context);

      expect(await destination.isAvailable()).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('cursor-ai getUserInstruction returns undefined on auto-paste success', () => {
      const builder = getBuiltinBuilder('cursor-ai');
      const context = createMockContext();
      const destination = builder({ kind: 'cursor-ai' }, context);

      expect(destination.getUserInstruction(AutoPasteResult.Success)).toBeUndefined();
    });

    it('cursor-ai getUserInstruction returns instruction message on auto-paste failure', () => {
      const builder = getBuiltinBuilder('cursor-ai');
      const context = createMockContext();
      const destination = builder({ kind: 'cursor-ai' }, context);

      expect(destination.getUserInstruction(AutoPasteResult.Failure)).toBe(
        'Paste (Cmd/Ctrl+V) in Cursor chat to use.',
      );
    });

    it('creates claude-code destination with correct id and displayName', () => {
      const builder = getBuiltinBuilder('claude-code');
      const context = createMockContext();

      const destination = builder({ kind: 'claude-code' }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'claude-code',
        displayName: 'Claude Code Chat',
      });
    });

    it('claude-code isAvailable delegates to isClaudeCodeAvailable', async () => {
      const spy = spyOnIsClaudeCodeAvailable().mockReturnValue(false);
      const builder = getBuiltinBuilder('claude-code');
      const context = createMockContext();
      const destination = builder({ kind: 'claude-code' }, context);

      expect(await destination.isAvailable()).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('claude-code getUserInstruction returns undefined on auto-paste success', () => {
      const builder = getBuiltinBuilder('claude-code');
      const context = createMockContext();
      const destination = builder({ kind: 'claude-code' }, context);

      expect(destination.getUserInstruction(AutoPasteResult.Success)).toBeUndefined();
    });

    it('claude-code getUserInstruction returns instruction message on auto-paste failure', () => {
      const builder = getBuiltinBuilder('claude-code');
      const context = createMockContext();
      const destination = builder({ kind: 'claude-code' }, context);

      expect(destination.getUserInstruction(AutoPasteResult.Failure)).toBe(
        'Paste (Cmd/Ctrl+V) in Claude Code chat to use.',
      );
    });

    it('creates github-copilot-chat destination with correct id and displayName', () => {
      const builder = getBuiltinBuilder('github-copilot-chat');
      const context = createMockContext();

      const destination = builder({ kind: 'github-copilot-chat' }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'github-copilot-chat',
        displayName: 'GitHub Copilot Chat',
      });
    });

    it('github-copilot-chat isAvailable delegates to isGitHubCopilotChatAvailable', async () => {
      const spy = spyOnIsGitHubCopilotChatAvailable().mockResolvedValue(true);
      const builder = getBuiltinBuilder('github-copilot-chat');
      const context = createMockContext();
      const destination = builder({ kind: 'github-copilot-chat' }, context);

      expect(await destination.isAvailable()).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('github-copilot-chat getUserInstruction returns undefined on auto-paste success', () => {
      const builder = getBuiltinBuilder('github-copilot-chat');
      const context = createMockContext();
      const destination = builder({ kind: 'github-copilot-chat' }, context);

      expect(destination.getUserInstruction(AutoPasteResult.Success)).toBeUndefined();
    });

    it('github-copilot-chat getUserInstruction returns instruction message on failure', () => {
      const builder = getBuiltinBuilder('github-copilot-chat');
      const context = createMockContext();
      const destination = builder({ kind: 'github-copilot-chat' }, context);

      expect(destination.getUserInstruction(AutoPasteResult.Failure)).toBe(
        'Paste (Cmd/Ctrl+V) in GitHub Copilot chat to use.',
      );
    });
  });

  describe('createCustomAiAssistantBuilder', () => {
    const customConfig = {
      kind: 'custom-ai:acme.spark-ai' as const,
      extensionId: 'acme.spark-ai',
      extensionName: 'Spark AI',
      focusCommands: ['sparkAi.focus', 'sparkAi.sidebar.open'],
    };

    it('creates destination with correct id and displayName', () => {
      const context = createMockContext();
      const builder = createCustomAiAssistantBuilder(customConfig);
      const destination = builder({ kind: customConfig.kind }, context);

      expect({ id: destination.id, displayName: destination.displayName }).toStrictEqual({
        id: 'custom-ai:acme.spark-ai',
        displayName: 'Spark AI',
      });
    });

    it('isAvailable returns true when extension is active', async () => {
      const context = createMockContext();
      jest.spyOn(context.ideAdapter, 'getExtension').mockReturnValue({
        isActive: true,
      } as any);
      jest.spyOn(context.ideAdapter, 'getCommands').mockResolvedValue([]);

      const builder = createCustomAiAssistantBuilder(customConfig);
      const destination = builder({ kind: customConfig.kind }, context);

      expect(await destination.isAvailable()).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'customAiAssistant.isAvailable',
          extensionId: 'acme.spark-ai',
          extensionFound: true,
          extensionActive: true,
          commandAvailable: false,
          checkedCommands: ['sparkAi.focus', 'sparkAi.sidebar.open'],
          available: true,
        },
        "Custom AI assistant 'Spark AI' available: true",
      );
    });

    it('isAvailable falls back to command check when extension not found', async () => {
      const context = createMockContext();
      jest.spyOn(context.ideAdapter, 'getExtension').mockReturnValue(undefined);
      jest
        .spyOn(context.ideAdapter, 'getCommands')
        .mockResolvedValue(['sparkAi.focus', 'other.cmd']);

      const builder = createCustomAiAssistantBuilder(customConfig);
      const destination = builder({ kind: customConfig.kind }, context);

      expect(await destination.isAvailable()).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'customAiAssistant.isAvailable',
          extensionId: 'acme.spark-ai',
          extensionFound: false,
          extensionActive: false,
          commandAvailable: true,
          checkedCommands: ['sparkAi.focus', 'sparkAi.sidebar.open'],
          available: true,
        },
        "Custom AI assistant 'Spark AI' available: true",
      );
    });

    it('isAvailable returns false when neither extension nor commands available', async () => {
      const context = createMockContext();
      jest.spyOn(context.ideAdapter, 'getExtension').mockReturnValue(undefined);
      jest.spyOn(context.ideAdapter, 'getCommands').mockResolvedValue(['other.cmd']);

      const builder = createCustomAiAssistantBuilder(customConfig);
      const destination = builder({ kind: customConfig.kind }, context);

      expect(await destination.isAvailable()).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'customAiAssistant.isAvailable',
          extensionId: 'acme.spark-ai',
          extensionFound: false,
          extensionActive: false,
          commandAvailable: false,
          checkedCommands: ['sparkAi.focus', 'sparkAi.sidebar.open'],
          available: false,
        },
        "Custom AI assistant 'Spark AI' available: false",
      );
    });

    it('getUserInstruction returns undefined on success when tier is not focusCommands', () => {
      const context = createMockContext();
      const builder = createCustomAiAssistantBuilder(customConfig);
      const destination = builder({ kind: customConfig.kind }, context);

      expect(destination.getUserInstruction(AutoPasteResult.Success)).toBeUndefined();
    });

    it('getUserInstruction returns instruction with extensionName on failure', () => {
      const context = createMockContext();
      const builder = createCustomAiAssistantBuilder(customConfig);
      const destination = builder({ kind: customConfig.kind }, context);

      expect(destination.getUserInstruction(AutoPasteResult.Failure)).toBe(
        'Paste (Cmd/Ctrl+V) in Spark AI to use.',
      );
    });

    it('jumpSuccessMessage uses i18n with extensionName', () => {
      const context = createMockContext();
      const builder = createCustomAiAssistantBuilder(customConfig);
      const destination = builder({ kind: customConfig.kind }, context);

      expect(destination.getJumpSuccessMessage()).toBe('✓ Focused Spark AI');
    });
  });

  describe('registerAllDestinationBuilders', () => {
    it('registers all five built-in destination kinds', () => {
      const registeredKinds: DestinationKind[] = [];
      const mockRegistry = {
        register: (kind: DestinationKind, _builder: DestinationBuilder) => {
          registeredKinds.push(kind);
        },
      };

      registerAllDestinationBuilders(mockRegistry);

      expect(registeredKinds).toStrictEqual([
        'terminal',
        'text-editor',
        'cursor-ai',
        'claude-code',
        'github-copilot-chat',
      ]);
    });

    it('registers custom AI assistants when provided', () => {
      const registeredKinds: DestinationKind[] = [];
      const mockRegistry = {
        register: (kind: DestinationKind, _builder: DestinationBuilder) => {
          registeredKinds.push(kind);
        },
      };

      registerAllDestinationBuilders(mockRegistry, [
        {
          kind: 'custom-ai:acme.spark-ai',
          extensionId: 'acme.spark-ai',
          extensionName: 'Spark AI',
          focusCommands: ['sparkAi.focus'],
        },
      ]);

      expect(registeredKinds).toStrictEqual([
        'terminal',
        'text-editor',
        'custom-ai:acme.spark-ai',
        'cursor-ai',
        'claude-code',
        'github-copilot-chat',
      ]);
    });

    it('overrides built-in when custom assistant extensionId matches', () => {
      const registeredKinds: DestinationKind[] = [];
      const mockRegistry = {
        register: (kind: DestinationKind, _builder: DestinationBuilder) => {
          registeredKinds.push(kind);
        },
      };

      registerAllDestinationBuilders(mockRegistry, [
        {
          kind: 'custom-ai:anthropic.claude-code',
          extensionId: 'anthropic.claude-code',
          extensionName: 'Claude Code (Custom)',
          insertCommands: [{ command: 'claude-vscode.insertText' }],
        },
      ]);

      expect(registeredKinds).toStrictEqual([
        'terminal',
        'text-editor',
        'claude-code',
        'cursor-ai',
        'github-copilot-chat',
      ]);
    });

    it('overridden built-in uses built-in kind, not custom-ai prefix', () => {
      const builders = new Map<DestinationKind, DestinationBuilder>();
      const mockRegistry = {
        register: (kind: DestinationKind, builder: DestinationBuilder) => {
          builders.set(kind, builder);
        },
      };

      registerAllDestinationBuilders(mockRegistry, [
        {
          kind: 'custom-ai:anthropic.claude-code',
          extensionId: 'anthropic.claude-code',
          extensionName: 'Claude Code (Custom)',
          insertCommands: [{ command: 'claude-vscode.insertText' }],
        },
      ]);

      expect(builders.has('claude-code')).toBe(true);
      expect(builders.has('custom-ai:anthropic.claude-code')).toBe(false);
    });
  });
});
