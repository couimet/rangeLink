import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { isBinaryFile } from '../../utils/isBinaryFile';
import { isWritableScheme } from '../../utils/isWritableScheme';

const MIN_TAB_GROUPS_FOR_SPLIT_EDITOR = 2;

/**
 * Reasons why text-editor destination is not eligible.
 */
export type TextEditorIneligibleReason = 'no-editor' | 'no-split' | 'read-only' | 'binary-file';

/**
 * Result of checking text-editor destination eligibility.
 */
export interface TextEditorEligibility {
  readonly eligible: boolean;
  readonly filename: string | undefined;
  readonly ineligibleReason: TextEditorIneligibleReason | undefined;
}

/**
 * Check if text-editor destination is eligible for binding
 *
 * Text-editor destination requires:
 * - An active text editor (file open and focused)
 * - At least 2 tab groups (split editor layout)
 * - Editor has writable scheme (not git, output, etc.)
 * - Editor is not a binary file
 *
 * @param ideAdapter - IDE adapter for reading editor state
 * @returns Eligibility result with filename when eligible, or reason when not
 */
export const isTextEditorDestinationEligible = (
  ideAdapter: VscodeAdapter,
): TextEditorEligibility => {
  const activeEditor = ideAdapter.activeTextEditor;

  if (activeEditor === undefined) {
    return { eligible: false, filename: undefined, ineligibleReason: 'no-editor' };
  }

  const hasSplitEditor = ideAdapter.tabGroups.all.length >= MIN_TAB_GROUPS_FOR_SPLIT_EDITOR;
  if (!hasSplitEditor) {
    return { eligible: false, filename: undefined, ineligibleReason: 'no-split' };
  }

  const editorUri = ideAdapter.getDocumentUri(activeEditor);
  const scheme = editorUri.scheme;
  const fsPath = editorUri.fsPath;

  if (!isWritableScheme(scheme)) {
    return { eligible: false, filename: undefined, ineligibleReason: 'read-only' };
  }

  if (isBinaryFile(scheme, fsPath)) {
    return { eligible: false, filename: undefined, ineligibleReason: 'binary-file' };
  }

  const filename = ideAdapter.getFilenameFromUri(editorUri);

  return { eligible: true, filename, ineligibleReason: undefined };
};
