import type * as vscode from 'vscode';

import type { DestinationRegistry } from '../../destinations/DestinationRegistry';
import type { DestinationType, PasteDestination } from '../../destinations/PasteDestination';

import { createMockComposablePasteDestination } from './createMockComposablePasteDestination';
import { createMockEditorComposablePasteDestination } from './createMockEditorComposablePasteDestination';
import { createMockTerminalPasteDestination } from './createMockTerminalPasteDestination';

/**
 * Options for configuring mock destination registry behavior.
 */
export interface MockDestinationRegistryOptions {
  /**
   * Pre-configured destinations to return from create().
   * Registry will return the appropriate destination based on type.
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
    type: string;
    terminal?: vscode.Terminal;
    editor?: vscode.TextEditor;
  }) => PasteDestination | undefined;
}

const DEFAULT_DISPLAY_NAMES: Record<DestinationType, string> = {
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
 * based on the requested type. This eliminates test coupling to registry's
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
    'text-editor': createMockTextEditorDestination(),
    'cursor-ai': createMockCursorAIDestination(),
    'claude-code': createMockClaudeCodeDestination(),
    'github-copilot-chat': createMockGitHubCopilotChatDestination(),
  };

  const defaultCreateImpl = (createOptions: {
    type: string;
    terminal?: vscode.Terminal;
    editor?: vscode.TextEditor;
  }): PasteDestination | undefined => {
    return destinations[createOptions.type as keyof typeof destinations];
  };

  const createImpl = options?.createImpl ?? defaultCreateImpl;

  return {
    register: jest.fn(),
    create: jest.fn().mockImplementation(createImpl),
    getSupportedTypes: jest.fn().mockReturnValue([]),
    getDisplayNames: jest.fn().mockReturnValue(DEFAULT_DISPLAY_NAMES),
  } as unknown as jest.Mocked<DestinationRegistry>;
};
