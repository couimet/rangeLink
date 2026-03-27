/**
 * Destination builder functions for DestinationRegistry.
 *
 * This module contains builder functions that create PasteDestination instances.
 * Each builder is registered with the DestinationRegistry and invoked when
 * PasteDestinationManager needs to create a destination.
 */
import type * as vscode from 'vscode';

import type { CustomAiAssistantConfig } from '../config/parseCustomAiAssistants';
import { CHAT_PASTE_COMMANDS } from '../constants';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import { AutoPasteResult, type DestinationKind, MessageCode, RelativePathFormat } from '../types';
import {
  formatMessage,
  getUntitledDisplayName,
  isClaudeCodeAvailable,
  isCursorIDEDetected,
  isGitHubCopilotChatAvailable,
} from '../utils';

import {
  CLAUDE_CODE_FOCUS_COMMANDS,
  CURSOR_AI_FOCUS_COMMANDS,
  GITHUB_COPILOT_CHAT_FOCUS_COMMANDS,
} from './aiAssistantFocusCommands';
import { ComposablePasteDestination } from './ComposablePasteDestination';
import type { DestinationBuilder, DestinationBuilderContext } from './DestinationRegistry';
import { compareEditorsByUri } from './equality/compareEditorsByUri';
import { compareTerminalsByProcessId } from './equality/compareTerminalsByProcessId';
import type { PasteDestination } from './PasteDestination';

/**
 * Build a Terminal destination using ComposablePasteDestination factory method.
 *
 * This builder is a thin adapter that:
 * 1. Extracts terminal from options
 * 2. Creates capabilities using context factories
 * 3. Delegates to ComposablePasteDestination.createTerminal()
 *
 * @param options - Type-discriminated options containing terminal reference
 * @param context - Builder context with factories and dependencies
 * @returns ComposablePasteDestination configured for terminal paste
 */
export const buildTerminalDestination: DestinationBuilder = (options, context) => {
  if (options.kind !== 'terminal') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
      message: `buildTerminalDestination called with wrong kind: ${options.kind}`,
      functionName: 'buildTerminalDestination',
      details: { actualKind: options.kind, expectedKind: 'terminal' },
    });
  }

  const terminal = options.terminal;
  const terminalName = context.ideAdapter.getTerminalName(terminal);

  return ComposablePasteDestination.createTerminal({
    terminal,
    displayName: `Terminal ("${terminalName}")`,
    focusCapability: context.factories.focusCapability.createTerminalCapability(terminal),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_TERMINAL, {
      resourceName: terminalName,
    }),
    loggingDetails: { terminalName },
    logger: context.logger,
    compareWith: (other: PasteDestination) => compareTerminalsByProcessId(terminal, other),
  });
};

/**
 * Get resource name from a URI (workspace-relative path or untitled name).
 *
 * @param context - Builder context with ideAdapter
 * @param uri - The document URI
 * @returns Resource name for display (e.g., "src/file.ts" or "Untitled-1")
 */
const getResourceName = (context: DestinationBuilderContext, uri: vscode.Uri): string => {
  if (uri.scheme === 'untitled') {
    return getUntitledDisplayName(uri);
  }

  const workspaceFolder = context.ideAdapter.getWorkspaceFolder(uri);
  if (workspaceFolder) {
    return context.ideAdapter.asRelativePath(uri, RelativePathFormat.PathOnly);
  }

  return context.ideAdapter.getFilenameFromUri(uri);
};

/**
 * Build a TextEditor destination using ComposablePasteDestination factory method.
 *
 * This builder is a thin adapter that:
 * 1. Extracts editor from options
 * 2. Creates capabilities using context factories
 * 3. Delegates to ComposablePasteDestination.createEditor()
 *
 * @param options - Type-discriminated options containing editor reference
 * @param context - Builder context with factories and dependencies
 * @returns ComposablePasteDestination configured for editor paste
 */
export const buildTextEditorDestination: DestinationBuilder = (options, context) => {
  if (options.kind !== 'text-editor') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
      message: `buildTextEditorDestination called with wrong kind: ${options.kind}`,
      functionName: 'buildTextEditorDestination',
      details: { actualKind: options.kind, expectedKind: 'text-editor' },
    });
  }

  const { uri, viewColumn } = options;
  const resourceName = getResourceName(context, uri);
  const editorPath = uri.toString();

  return ComposablePasteDestination.createEditor({
    uri,
    viewColumn,
    displayName: `Text Editor ("${resourceName}")`,
    focusCapability: context.factories.focusCapability.createEditorCapability(uri, viewColumn),
    eligibilityChecker: context.factories.eligibilityChecker.createContentEligibilityChecker(),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_EDITOR, {
      resourceName,
    }),
    loggingDetails: { editorName: resourceName, editorPath },
    logger: context.logger,
    compareWith: (other: PasteDestination) => compareEditorsByUri(uri, other),
  });
};

/**
 * Build a CursorAI destination using ComposablePasteDestination factory method.
 *
 * Cursor AI uses clipboard-based paste with focus commands.
 *
 * @param options - Type-discriminated options
 * @param context - Builder context with dependencies
 * @returns ComposablePasteDestination configured for Cursor AI
 */
export const buildCursorAIDestination: DestinationBuilder = (options, context) => {
  if (options.kind !== 'cursor-ai') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
      message: `buildCursorAIDestination called with wrong kind: ${options.kind}`,
      functionName: 'buildCursorAIDestination',
      details: { actualKind: options.kind, expectedKind: 'cursor-ai' },
    });
  }

  return ComposablePasteDestination.createAiAssistant({
    id: 'cursor-ai',
    displayName: 'Cursor AI Assistant',
    focusCapability: context.factories.focusCapability.createAIAssistantCapability(
      CURSOR_AI_FOCUS_COMMANDS,
      [...CHAT_PASTE_COMMANDS],
    ),
    isAvailable: async () => isCursorIDEDetected(context.ideAdapter, context.logger),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CURSOR_AI),
    loggingDetails: {},
    logger: context.logger,
    getUserInstruction: (autoPasteResult) =>
      autoPasteResult === AutoPasteResult.Success
        ? undefined
        : formatMessage(MessageCode.INFO_CURSOR_AI_USER_INSTRUCTIONS),
  });
};

/**
 * Build a ClaudeCode destination using ComposablePasteDestination factory method.
 *
 * Claude Code uses clipboard-based paste with focus commands.
 *
 * @param options - Type-discriminated options
 * @param context - Builder context with dependencies
 * @returns ComposablePasteDestination configured for Claude Code
 */
export const buildClaudeCodeDestination: DestinationBuilder = (options, context) => {
  if (options.kind !== 'claude-code') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
      message: `buildClaudeCodeDestination called with wrong kind: ${options.kind}`,
      functionName: 'buildClaudeCodeDestination',
      details: { actualKind: options.kind, expectedKind: 'claude-code' },
    });
  }

  return ComposablePasteDestination.createAiAssistant({
    id: 'claude-code',
    displayName: 'Claude Code Chat',
    focusCapability: context.factories.focusCapability.createAIAssistantCapability(
      CLAUDE_CODE_FOCUS_COMMANDS,
      [...CHAT_PASTE_COMMANDS],
    ),
    isAvailable: async () => isClaudeCodeAvailable(context.ideAdapter, context.logger),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CLAUDE_CODE),
    loggingDetails: {},
    logger: context.logger,
    getUserInstruction: (autoPasteResult) =>
      autoPasteResult === AutoPasteResult.Success
        ? undefined
        : formatMessage(MessageCode.INFO_CLAUDE_CODE_USER_INSTRUCTIONS),
  });
};

// ============================================================================
// AI Assistant Builders
// ============================================================================

/**
 * Build a GitHubCopilotChat destination using ComposablePasteDestination factory method.
 *
 * GitHub Copilot Chat uses clipboard-based paste with focus commands.
 *
 * @param options - Type-discriminated options
 * @param context - Builder context with dependencies
 * @returns ComposablePasteDestination configured for GitHub Copilot Chat
 */
export const buildGitHubCopilotChatDestination: DestinationBuilder = (options, context) => {
  if (options.kind !== 'github-copilot-chat') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_KIND,
      message: `buildGitHubCopilotChatDestination called with wrong kind: ${options.kind}`,
      functionName: 'buildGitHubCopilotChatDestination',
      details: { actualKind: options.kind, expectedKind: 'github-copilot-chat' },
    });
  }

  return ComposablePasteDestination.createAiAssistant({
    id: 'github-copilot-chat',
    displayName: 'GitHub Copilot Chat',
    focusCapability: context.factories.focusCapability.createAIAssistantCapability(
      GITHUB_COPILOT_CHAT_FOCUS_COMMANDS,
      [...CHAT_PASTE_COMMANDS],
    ),
    isAvailable: () => isGitHubCopilotChatAvailable(context.ideAdapter, context.logger),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_GITHUB_COPILOT_CHAT),
    loggingDetails: {},
    logger: context.logger,
    getUserInstruction: (autoPasteResult) =>
      autoPasteResult === AutoPasteResult.Success
        ? undefined
        : formatMessage(MessageCode.INFO_GITHUB_COPILOT_CHAT_USER_INSTRUCTIONS),
  });
};

/**
 * Create a builder for a user-defined custom AI assistant.
 *
 * Returns a DestinationBuilder that creates a ComposablePasteDestination
 * configured with the user's extensionId, displayName, and three-tier commands.
 *
 * Availability detection: checks if the extension is installed and active
 * via getExtension(extensionId). Falls back to checking if any command from
 * any tier is a registered VS Code command.
 */
export const createCustomAiAssistantBuilder = (
  config: CustomAiAssistantConfig,
): DestinationBuilder => {
  const { kind, extensionId, extensionName } = config;
  const allCommands = [
    ...(config.insertCommands ?? []).map((e) => e.command),
    ...(config.focusAndPasteCommands ?? []),
    ...(config.focusCommands ?? []),
  ];

  return (_options, context) => {
    const tieredCapability =
      context.factories.focusCapability.createCustomAIAssistantCapability(config);

    return ComposablePasteDestination.createAiAssistant({
      id: kind,
      displayName: extensionName,
      focusCapability: tieredCapability,
      isAvailable: async () => {
        const extension = context.ideAdapter.getExtension(extensionId);
        const extensionFound = extension !== undefined;
        const extensionActive = extension?.isActive === true;

        const commands = await context.ideAdapter.getCommands();
        const commandAvailable = allCommands.some((cmd) => commands.includes(cmd));

        const available = extensionActive || commandAvailable;
        context.logger.debug(
          {
            fn: 'customAiAssistant.isAvailable',
            extensionId,
            extensionFound,
            extensionActive,
            commandAvailable,
            checkedCommands: allCommands,
            available,
          },
          `Custom AI assistant '${extensionName}' available: ${available}`,
        );
        return available;
      },
      jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_CUSTOM_AI, {
        extensionName,
      }),
      loggingDetails: { extensionId },
      logger: context.logger,
      getUserInstruction: (autoPasteResult) => {
        if (autoPasteResult === AutoPasteResult.Success) {
          if (tieredCapability.lastTierLabel === 'focusCommands') {
            return formatMessage(MessageCode.INFO_CUSTOM_AI_USER_INSTRUCTIONS, { extensionName });
          }
          return undefined;
        }
        return formatMessage(MessageCode.INFO_CUSTOM_AI_USER_INSTRUCTIONS, { extensionName });
      },
    });
  };
};

/**
 * Register all destination builders with the registry.
 *
 * Called from extension.ts during activation to set up all destination kinds.
 *
 * @param registry - DestinationRegistry to register builders with
 * @param customAssistants - Optional custom AI assistant configs from user settings
 */
export const registerAllDestinationBuilders = (
  registry: {
    register: (kind: DestinationKind, builder: DestinationBuilder) => void;
  },
  customAssistants: CustomAiAssistantConfig[] = [],
): void => {
  registry.register('terminal', buildTerminalDestination);
  registry.register('text-editor', buildTextEditorDestination);
  registry.register('cursor-ai', buildCursorAIDestination);
  registry.register('claude-code', buildClaudeCodeDestination);
  registry.register('github-copilot-chat', buildGitHubCopilotChatDestination);

  for (const config of customAssistants) {
    registry.register(config.kind, createCustomAiAssistantBuilder(config));
  }
};
