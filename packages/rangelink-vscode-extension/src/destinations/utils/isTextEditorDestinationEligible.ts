import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

const MIN_TAB_GROUPS_FOR_SPLIT_EDITOR = 2;

/**
 * Result of checking text-editor destination eligibility.
 */
export interface TextEditorEligibility {
  readonly eligible: boolean;
  readonly filename: string | undefined;
}

/**
 * Check if text-editor destination is eligible for binding
 *
 * Text-editor destination requires:
 * - An active text editor (file open and focused)
 * - At least 2 tab groups (split editor layout)
 *
 * @param ideAdapter - IDE adapter for reading editor state
 * @returns Eligibility result with filename when eligible
 */
export const isTextEditorDestinationEligible = (
  ideAdapter: VscodeAdapter,
): TextEditorEligibility => {
  const activeEditor = ideAdapter.activeTextEditor;
  const hasActiveEditor = activeEditor !== undefined;
  const hasSplitEditor = ideAdapter.tabGroups.all.length >= MIN_TAB_GROUPS_FOR_SPLIT_EDITOR;
  const eligible = hasActiveEditor && hasSplitEditor;

  const filename = eligible ? ideAdapter.getFilenameFromUri(activeEditor.document.uri) : undefined;

  return { eligible, filename };
};
