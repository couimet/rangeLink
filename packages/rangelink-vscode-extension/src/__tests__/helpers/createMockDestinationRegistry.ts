import type * as vscode from 'vscode';

import type { DestinationRegistry, PasteDestination } from '../../destinations';
import type { DestinationKind } from '../../types';

import { createMockClaudeCodeComposableDestination } from './createMockClaudeCodeComposableDestination';
import { createMockCursorAIComposableDestination } from './createMockCursorAIComposableDestination';
import { createMockEditorComposablePasteDestination } from './createMockEditorComposablePasteDestination';
import { createMockGitHubCopilotChatComposableDestination } from './createMockGitHubCopilotChatComposableDestination';
import { createMockTerminalPasteDestination } from './createMockTerminalPasteDestination';

/**
 * Options for configuring mock destination registry behavior.
 */
export interface MockDestinationRegistryOptions {
  /**
   * Pre-configured destinations to return from create().
   * Registry will return the appropriate destination based on kind.
   */
  destinations?: {
    terminal?: jest.Mocked<PasteDestination>;
    'text-editor'?: jest.Mocked<PasteDestination>;
    'cursor-ai'?: jest.Mocked<PasteDestination>;
    'claude-code'?: jest.Mocked<PasteDestination>;
    'github-copilot-chat'?: jest.Mocked<PasteDestination>;
  };

  /**
   * Custom implementation for create() method.
   * If provided, overrides default destination lookup behavior.
   */
  createImpl?: (options: {
    kind: string;
    terminal?: vscode.Terminal;
    editor?: vscode.TextEditor;
  }) => PasteDestination | undefined;
}

const DEFAULT_DISPLAY_NAMES: Record<DestinationKind, string> = {
  terminal: 'Terminal',
  'text-editor': 'Text Editor',
  'cursor-ai': 'Cursor AI Assistant',
  'github-copilot-chat': 'GitHub Copilot Chat',
  'claude-code': 'Claude Code Chat',
};

/**
 * Create a mock DestinationRegistry for testing.
 *
 * The registry's create() method returns pre-configured mock destinations
 * based on the requested kind. This eliminates test coupling to registry's
 * internal dependencies.
 *
 * @param options - Configuration for mock registry behavior
 * @returns Mock DestinationRegistry with jest.Mocked type
 */
export const createMockDestinationRegistry = (
  options?: MockDestinationRegistryOptions,
): jest.Mocked<DestinationRegistry> => {
  const destinations = options?.destinations ?? {
    terminal: createMockTerminalPasteDestination(),
    'text-editor':
      createMockEditorComposablePasteDestination() as unknown as jest.Mocked<PasteDestination>,
    'cursor-ai':
      createMockCursorAIComposableDestination() as unknown as jest.Mocked<PasteDestination>,
    'claude-code':
      createMockClaudeCodeComposableDestination() as unknown as jest.Mocked<PasteDestination>,
    'github-copilot-chat':
      createMockGitHubCopilotChatComposableDestination() as unknown as jest.Mocked<PasteDestination>,
  };

  const defaultCreateImpl = (createOptions: {
    kind: string;
    terminal?: vscode.Terminal;
    editor?: vscode.TextEditor;
  }): PasteDestination | undefined => {
    // For text-editor, create a real ComposablePasteDestination so document close listener works
    if (createOptions.kind === 'text-editor' && createOptions.editor) {
      const fileName = createOptions.editor.document.uri.fsPath.split('/').pop() || 'Unknown';
      return createMockEditorComposablePasteDestination({
        displayName: `Text Editor ("${fileName}")`,
        editor: createOptions.editor,
      });
    }
    return destinations[createOptions.kind as keyof typeof destinations];
  };

  const createImpl = options?.createImpl ?? defaultCreateImpl;

  return {
    register: jest.fn(),
    create: jest.fn().mockImplementation(createImpl),
    getSupportedTypes: jest.fn().mockReturnValue([]),
    getDisplayNames: jest.fn().mockReturnValue(DEFAULT_DISPLAY_NAMES),
  } as unknown as jest.Mocked<DestinationRegistry>;
};
