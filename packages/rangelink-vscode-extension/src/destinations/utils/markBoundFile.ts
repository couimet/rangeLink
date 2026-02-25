import type { EligibleFile } from '../../types';

/**
 * Enrich eligible files with bound state by matching URI and optionally viewColumn.
 *
 * Sets `boundState: 'bound'` on the file whose URI matches `boundFileUriString`
 * (and whose viewColumn matches `boundFileViewColumn` when provided), and
 * `'not-bound'` on all others.
 * If `boundFileUriString` is undefined, all files get `'not-bound'`.
 *
 * Takes a pre-stringified URI to avoid repeated .toString() in the map.
 * viewColumn is required when the same URI can be open in multiple tab groups —
 * without it, all copies of the file would be marked bound.
 *
 * @param files - Eligible files from getEligibleFiles()
 * @param boundFileUriString - toString() of the currently bound file's URI, or undefined
 * @param boundFileViewColumn - viewColumn of the currently bound editor, or undefined for URI-only match
 * @returns New array with boundState set on every item
 */
export const markBoundFile = (
  files: readonly EligibleFile[],
  boundFileUriString: string | undefined,
  boundFileViewColumn?: number,
): EligibleFile[] =>
  files.map((f) => ({
    ...f,
    boundState:
      boundFileUriString !== undefined &&
      f.uri.toString() === boundFileUriString &&
      (boundFileViewColumn === undefined || f.viewColumn === boundFileViewColumn)
        ? ('bound' as const)
        : ('not-bound' as const),
  }));
