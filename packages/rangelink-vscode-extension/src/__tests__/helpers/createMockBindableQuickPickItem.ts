import type * as vscode from 'vscode';

import type {
  BindableQuickPickItem,
  EligibleTerminal,
  GroupedDestinationItems,
  TerminalBindableQuickPickItem,
  TerminalMoreQuickPickItem,
} from '../../types';
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
 * Create a mock BindableQuickPickItem for a text editor.
 *
 * @param displayName - The display name for the item (default: 'Text Editor ("file.ts")')
 * @returns A BindableQuickPickItem for the text editor
 */
export const createMockTextEditorQuickPickItem = (
  displayName = 'Text Editor ("file.ts")',
): BindableQuickPickItem => ({
  label: displayName,
  displayName,
  bindOptions: { kind: 'text-editor' },
  itemKind: 'bindable',
  isActive: false,
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
