/**
 * Destination builder functions for DestinationRegistry.
 *
 * This module contains builder functions that create PasteDestination instances.
 * Each builder is registered with the DestinationRegistry and invoked when
 * PasteDestinationManager needs to create a destination.
 */
import type * as vscode from 'vscode';

import { CHAT_PASTE_COMMANDS } from '../constants';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import { AutoPasteResult } from '../types/AutoPasteResult';
import { MessageCode } from '../types/MessageCode';
import {
  formatMessage,
  getUntitledDisplayName,
  isClaudeCodeAvailable,
  isCursorIDEDetected,
  isGitHubCopilotChatAvailable,
  GITHUB_COPILOT_CHAT_FOCUS_COMMANDS,
} from '../utils';

import { ComposablePasteDestination } from './ComposablePasteDestination';
import type { DestinationBuilder, DestinationBuilderContext } from './DestinationRegistry';
import { compareEditorsByUri } from './equality/compareEditorsByUri';
import { compareTerminalsByProcessId } from './equality/compareTerminalsByProcessId';
import type { DestinationType, PasteDestination } from './PasteDestination';

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
  if (options.type !== 'terminal') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_TYPE,
      message: `buildTerminalDestination called with wrong type: ${options.type}`,
      functionName: 'buildTerminalDestination',
      details: { actualType: options.type, expectedType: 'terminal' },
    });
  }

  const terminal = options.terminal;
  const terminalName = context.ideAdapter.getTerminalName(terminal);

  return ComposablePasteDestination.createTerminal({
    terminal,
    displayName: `Terminal ("${terminalName}")`,
    pasteExecutor: context.factories.pasteExecutor.createTerminalExecutor(terminal),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_TERMINAL, {
      resourceName: terminalName,
    }),
    loggingDetails: { terminalName },
    logger: context.logger,
    compareWith: (other: PasteDestination) => compareTerminalsByProcessId(terminal, other),
  });
};

/**
 * Get resource name for an editor (workspace-relative path or untitled name).
 *
 * @param context - Builder context with ideAdapter
 * @param editor - The text editor
 * @returns Resource name for display (e.g., "src/file.ts" or "Untitled-1")
 */
const getEditorResourceName = (
  context: DestinationBuilderContext,
  editor: vscode.TextEditor,
): string => {
  const uri = context.ideAdapter.getDocumentUri(editor);

  // Handle untitled files
  if (uri.scheme === 'untitled') {
    return getUntitledDisplayName(uri);
  }

  // Get workspace-relative path for file:// scheme
  const workspaceFolder = context.ideAdapter.getWorkspaceFolder(uri);
  if (workspaceFolder) {
    return context.ideAdapter.asRelativePath(uri, false);
  }

  // Fallback to filename if not in workspace
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
  if (options.type !== 'text-editor') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_TYPE,
      message: `buildTextEditorDestination called with wrong type: ${options.type}`,
      functionName: 'buildTextEditorDestination',
      details: { actualType: options.type, expectedType: 'text-editor' },
    });
  }

  const editor = options.editor;
  const resourceName = getEditorResourceName(context, editor);
  const editorPath = context.ideAdapter.getDocumentUri(editor).toString();

  return ComposablePasteDestination.createEditor({
    editor,
    displayName: `Text Editor ("${resourceName}")`,
    pasteExecutor: context.factories.pasteExecutor.createEditorExecutor(editor),
    eligibilityChecker: context.factories.eligibilityChecker.createSelfPasteChecker(),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_EDITOR, {
      resourceName,
    }),
    loggingDetails: { editorName: resourceName, editorPath },
    logger: context.logger,
    compareWith: (other: PasteDestination) => compareEditorsByUri(editor, other),
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
  if (options.type !== 'cursor-ai') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_TYPE,
      message: `buildCursorAIDestination called with wrong type: ${options.type}`,
      functionName: 'buildCursorAIDestination',
      details: { actualType: options.type, expectedType: 'cursor-ai' },
    });
  }

  return ComposablePasteDestination.createAiAssistant({
    id: 'cursor-ai',
    displayName: 'Cursor AI Assistant',
    pasteExecutor: context.factories.pasteExecutor.createCommandExecutor(
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
  if (options.type !== 'claude-code') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_TYPE,
      message: `buildClaudeCodeDestination called with wrong type: ${options.type}`,
      functionName: 'buildClaudeCodeDestination',
      details: { actualType: options.type, expectedType: 'claude-code' },
    });
  }

  return ComposablePasteDestination.createAiAssistant({
    id: 'claude-code',
    displayName: 'Claude Code Chat',
    pasteExecutor: context.factories.pasteExecutor.createCommandExecutor(
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
// AI Assistant Constants
// ============================================================================

const CURSOR_AI_FOCUS_COMMANDS = [
  'aichat.newchataction', // Primary: Cursor-specific command (Cmd+L / Ctrl+L)
  'workbench.action.toggleAuxiliaryBar', // Fallback: Toggle secondary sidebar
];

const CLAUDE_CODE_FOCUS_COMMANDS = [
  'claude-vscode.focus', // Primary: Direct input focus (Cmd+Escape)
  'claude-vscode.sidebar.open', // Fallback: Open sidebar
  'claude-vscode.editor.open', // Fallback: Open in new tab
];

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
  if (options.type !== 'github-copilot-chat') {
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.UNEXPECTED_DESTINATION_TYPE,
      message: `buildGitHubCopilotChatDestination called with wrong type: ${options.type}`,
      functionName: 'buildGitHubCopilotChatDestination',
      details: { actualType: options.type, expectedType: 'github-copilot-chat' },
    });
  }

  return ComposablePasteDestination.createAiAssistant({
    id: 'github-copilot-chat',
    displayName: 'GitHub Copilot Chat',
    pasteExecutor: context.factories.pasteExecutor.createCommandExecutor(
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
 * Register all destination builders with the registry.
 *
 * Called from extension.ts during activation to set up all destination types.
 *
 * @param registry - DestinationRegistry to register builders with
 */
export const registerAllDestinationBuilders = (registry: {
  register: (type: DestinationType, builder: DestinationBuilder) => void;
}): void => {
  registry.register('terminal', buildTerminalDestination);
  registry.register('text-editor', buildTextEditorDestination);
  registry.register('cursor-ai', buildCursorAIDestination);
  registry.register('claude-code', buildClaudeCodeDestination);
  registry.register('github-copilot-chat', buildGitHubCopilotChatDestination);
};
