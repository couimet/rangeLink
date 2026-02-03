import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { isBinaryFile, isWritableScheme } from '../../utils';

/**
 * Reasons why text-editor destination is not eligible.
 */
export type TextEditorIneligibleReason = 'no-editor' | 'read-only' | 'binary-file';

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
 * - Editor has writable scheme (not git, output, etc.)
 * - Editor is not a binary file
 *
 * Self-paste (source === destination) is checked at paste time, not binding time.
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
