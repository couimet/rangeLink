import type { EligibleFile } from '../../types';

/**
 * Enrich eligible files with bound state by matching URI.
 *
 * Sets `boundState: 'bound'` on the file whose URI matches
 * the bound file's URI string, and `'not-bound'` on all others.
 * If `boundFileUriString` is undefined, all files get `'not-bound'`.
 *
 * Takes a pre-stringified URI to avoid repeated .toString() in the map.
 *
 * @param files - Eligible files from getEligibleFiles()
 * @param boundFileUriString - toString() of the currently bound file's URI, or undefined
 * @returns New array with boundState set on every item
 */
export const markBoundFile = (
  files: readonly EligibleFile[],
  boundFileUriString: string | undefined,
): EligibleFile[] =>
  files.map((f) => ({
    ...f,
    boundState:
      boundFileUriString !== undefined && f.uri.toString() === boundFileUriString
        ? ('bound' as const)
        : ('not-bound' as const),
  }));
