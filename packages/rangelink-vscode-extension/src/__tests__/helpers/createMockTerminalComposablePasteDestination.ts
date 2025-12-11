import type * as vscode from 'vscode';

import {
  createMockComposablePasteDestination,
  type MockComposablePasteDestinationConfig,
} from './createMockComposablePasteDestination';
import { createMockTerminal } from './createMockTerminal';

/**
 * Configuration overrides for creating a mock terminal ComposablePasteDestination.
 *
 * Extends base config with terminal-specific options.
 */
export interface MockTerminalComposablePasteDestinationConfig
  extends Omit<MockComposablePasteDestinationConfig, 'resource'> {
  /** Terminal to use. If not provided, creates a mock terminal. */
  terminal?: vscode.Terminal;
  /** Process ID for the terminal. Defaults to 12345. */
  processId?: number;
}

/**
 * Create a mock ComposablePasteDestination configured for terminal usage.
 *
 * Provides sensible terminal defaults:
 * - id: 'terminal'
 * - resource: { kind: 'terminal', terminal }
 * - displayName: 'Terminal ("bash")'
 *
 * @param overrides - Optional config overrides
 * @returns ComposablePasteDestination instance configured as terminal
 */
export const createMockTerminalComposablePasteDestination = (
  overrides: MockTerminalComposablePasteDestinationConfig = {},
): ReturnType<typeof createMockComposablePasteDestination> => {
  const { terminal, processId, ...rest } = overrides;

  const mockTerminal =
    terminal ??
    createMockTerminal({
      name: 'bash',
      processId: Promise.resolve(processId ?? 12345),
    });

  return createMockComposablePasteDestination({
    id: 'terminal',
    displayName: 'Terminal ("bash")',
    resource: { kind: 'terminal', terminal: mockTerminal },
    jumpSuccessMessage: 'Jumped to terminal',
    loggingDetails: { terminalName: 'bash' },
    ...rest,
  });
};
