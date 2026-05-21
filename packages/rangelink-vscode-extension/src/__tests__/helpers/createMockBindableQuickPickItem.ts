import type * as vscode from 'vscode';

import type {
  AIAssistantDestinationKind,
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
): TerminalBindableQuickPickItem => {
  const terminalInfo = createMockEligibleTerminal({
    terminal,
    name: terminal.name,
    isActive,
    boundState,
  });
  return {
    label: `Terminal ("${terminal.name}")`,
    displayName: `Terminal ("${terminal.name}")`,
    bindOptions: terminalInfo.bindOptions,
    itemKind: 'bindable',
    terminalInfo,
  };
};

/**
 * Create a mock BindableQuickPickItem for an AI assistant.
 *
 * @param kind - The AI assistant type
 * @param displayName - The display name for the item
 * @returns A BindableQuickPickItem for the AI assistant
 */
export const createMockAIAssistantQuickPickItem = (
  kind: AIAssistantDestinationKind,
  displayName: string,
): BindableQuickPickItem => ({
  label: displayName,
  displayName,
  bindOptions: { kind },
  itemKind: 'bindable',
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
    bindOptions: resolvedFileInfo.bindOptions,
    itemKind: 'bindable',
    fileInfo: resolvedFileInfo,
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
