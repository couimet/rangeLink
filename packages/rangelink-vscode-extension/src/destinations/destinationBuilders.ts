/**
 * Destination builder functions for DestinationRegistry.
 *
 * This module contains builder functions that create PasteDestination instances.
 * Each builder is registered with the DestinationRegistry and invoked when
 * PasteDestinationManager needs to create a destination.
 */
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
  GITHUB_COPILOT_CHAT_COMMAND,
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

  // Delegate to factory method - no config duplication!
  return ComposablePasteDestination.createTerminal({
    terminal,
    displayName: `Terminal ("${terminalName}")`,
    textInserter: context.factories.textInserter.createClipboardInserter([
      'workbench.action.terminal.paste',
    ]),
    focusManager: context.factories.focusManager.createTerminalFocus(terminal),
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
  editor: import('vscode').TextEditor,
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
  return uri.fsPath.split('/').pop() || 'Unknown';
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

  // Delegate to factory method - no config duplication!
  return ComposablePasteDestination.createEditor({
    editor,
    displayName: `Text Editor ("${resourceName}")`,
    textInserter: context.factories.textInserter.createEditorInserter(editor),
    eligibilityChecker: context.factories.eligibilityChecker.createSelfPasteChecker(),
    focusManager: context.factories.focusManager.createEditorFocus(editor),
    jumpSuccessMessage: formatMessage(MessageCode.STATUS_BAR_JUMP_SUCCESS_EDITOR, {
      resourceName,
    }),
    loggingDetails: { editorName: resourceName, editorPath },
    logger: context.logger,
    compareWith: (other: PasteDestination) => compareEditorsByUri(editor, other),
  });
};

/**
 * Build a CursorAI destination using existing class (adapter pattern).
 *
 * For Phase 4, we keep the existing CursorAIDestination class.
 * Migration to ComposablePasteDestination will happen in a later phase.
 *
 * @param options - Type-discriminated options
 * @param context - Builder context with dependencies
 * @returns CursorAIDestination instance
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

  const chatPasteHelperFactory = new ChatPasteHelperFactory(context.ideAdapter, context.logger);
  return new CursorAIDestination(context.ideAdapter, chatPasteHelperFactory, context.logger);
};

/**
 * Build a ClaudeCode destination using existing class (adapter pattern).
 *
 * For Phase 4, we keep the existing ClaudeCodeDestination class.
 * Migration to ComposablePasteDestination will happen in a later phase.
 *
 * @param options - Type-discriminated options
 * @param context - Builder context with dependencies
 * @returns ClaudeCodeDestination instance
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

  const chatPasteHelperFactory = new ChatPasteHelperFactory(context.ideAdapter, context.logger);
  return new ClaudeCodeDestination(context.ideAdapter, chatPasteHelperFactory, context.logger);
};

/**
 * Build a GitHubCopilotChat destination using existing class (adapter pattern).
 *
 * For Phase 4, we keep the existing GitHubCopilotChatDestination class.
 * Migration to ComposablePasteDestination will happen in a later phase.
 *
 * Note: GitHubCopilotChatDestination doesn't use ChatPasteHelperFactory - it has native API.
 *
 * @param options - Type-discriminated options
 * @param context - Builder context with dependencies
 * @returns GitHubCopilotChatDestination instance
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

  return new GitHubCopilotChatDestination(context.ideAdapter, context.logger);
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
