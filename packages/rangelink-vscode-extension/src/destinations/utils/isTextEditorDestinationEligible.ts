import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

const MIN_TAB_GROUPS_FOR_SPLIT_EDITOR = 2;

/**
 * Check if text-editor destination is eligible for binding
 *
 * Text-editor destination requires:
 * - An active text editor (file open and focused)
 * - At least 2 tab groups (split editor layout)
 *
 * @param ideAdapter - IDE adapter for reading editor state
 * @returns true if text-editor destination can be bound
 */
export const isTextEditorDestinationEligible = (ideAdapter: VscodeAdapter): boolean =>
  ideAdapter.activeTextEditor !== undefined &&
  ideAdapter.tabGroups.all.length >= MIN_TAB_GROUPS_FOR_SPLIT_EDITOR;
