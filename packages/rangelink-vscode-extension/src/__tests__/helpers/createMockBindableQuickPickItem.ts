import type * as vscode from 'vscode';

import type {
  BindableQuickPickItem,
  EligibleFile,
  EligibleTerminal,
  FileBindableQuickPickItem,
  FileMoreQuickPickItem,
  GroupedDestinationItems,
  TerminalBindableQuickPickItem,
  TerminalMoreQuickPickItem,
} from '../../types';

import { createMockEligibleFile } from './createMockEligibleFile';
import { createMockEligibleTerminal } from './createMockEligibleTerminal';

/**
 * Create a mock TerminalBindableQuickPickItem for a terminal.
 *
 * @param terminal - The terminal to create the item for
 * @param isActive - Whether this is the active terminal (default: false)
 * @param boundState - The bound state of the terminal (default: undefined)
 * @returns A TerminalBindableQuickPickItem with terminalInfo
 */
export const createMockTerminalQuickPickItem = (
  terminal: vscode.Terminal,
  isActive = false,
  boundState?: EligibleTerminal['boundState'],
): TerminalBindableQuickPickItem => ({
  label: `Terminal ("${terminal.name}")`,
  displayName: `Terminal ("${terminal.name}")`,
  bindOptions: { kind: 'terminal', terminal },
  itemKind: 'bindable',
  isActive,
  ...(boundState !== undefined && { boundState }),
  terminalInfo: createMockEligibleTerminal({ terminal, name: terminal.name, isActive, boundState }),
});

/**
 * Create a mock BindableQuickPickItem for an AI assistant.
 *
 * @param kind - The AI assistant type
 * @param displayName - The display name for the item
 * @returns A BindableQuickPickItem for the AI assistant
 */
export const createMockAIAssistantQuickPickItem = (
  kind: 'claude-code' | 'cursor-ai' | 'github-copilot-chat',
  displayName: string,
): BindableQuickPickItem => ({
  label: displayName,
  displayName,
  bindOptions: { kind },
  itemKind: 'bindable',
  isActive: false,
});

/**
 * Create a mock FileBindableQuickPickItem for a text editor.
 *
 * @param fileInfo - The eligible file to create the item for (default: createMockEligibleFile())
 * @param description - Optional description for the item
 * @returns A FileBindableQuickPickItem for the text editor
 */
export const createMockTextEditorQuickPickItem = (
  fileInfo?: EligibleFile,
  description?: string,
): FileBindableQuickPickItem => {
  const resolvedFileInfo = fileInfo ?? createMockEligibleFile();
  return {
    label: resolvedFileInfo.filename,
    displayName: resolvedFileInfo.filename,
    description,
    bindOptions: {
      kind: 'text-editor',
      uri: resolvedFileInfo.uri,
      viewColumn: resolvedFileInfo.viewColumn,
    },
    itemKind: 'bindable',
    fileInfo: resolvedFileInfo,
    ...(resolvedFileInfo.boundState !== undefined && { boundState: resolvedFileInfo.boundState }),
  };
};

/**
 * Create an array of mock FileBindableQuickPickItem objects for a text editor.
 *
 * Items are named `file-1.ts`, `file-2.ts`, … and are all current-in-group (active).
 * Useful for showFilePicker tests that need a realistic multi-file setup.
 *
 * @param count - Number of items to create
 * @returns Array of FileBindableQuickPickItem for the text editor
 */
export const createMockTextEditorQuickPickItems = (count: number): FileBindableQuickPickItem[] =>
  Array.from({ length: count }, (_, i) =>
    createMockTextEditorQuickPickItem(
      createMockEligibleFile({ filename: `file-${i + 1}.ts`, isCurrentInGroup: true }),
    ),
  );

/**
 * Create a mock FileMoreQuickPickItem.
 *
 * @param remainingCount - Number of remaining files not shown
 * @returns A FileMoreQuickPickItem
 */
export const createMockFileMoreQuickPickItem = (remainingCount: number): FileMoreQuickPickItem => ({
  label: 'More files...',
  displayName: 'More files...',
  itemKind: 'file-more',
  remainingCount,
});

/**
 * Create a mock TerminalMoreQuickPickItem.
 *
 * @param remainingCount - Number of remaining terminals not shown
 * @returns A TerminalMoreQuickPickItem
 */
export const createMockTerminalMoreQuickPickItem = (
  remainingCount: number,
): TerminalMoreQuickPickItem => ({
  label: 'More terminals...',
  displayName: 'More terminals...',
  itemKind: 'terminal-more',
  remainingCount,
});

/**
 * Create a GroupedDestinationItems object with only terminal items.
 *
 * @param items - Array of TerminalBindableQuickPickItem for terminals
 * @returns GroupedDestinationItems with terminal group
 */
export const createMockGroupedTerminals = (
  items: TerminalBindableQuickPickItem[],
): GroupedDestinationItems => ({
  terminal: items,
});
