export interface FileEntry {
  readonly filename: string;
  readonly relativePath: string;
}

/**
 * Produce VSCode-style disambiguators for files with duplicate filenames.
 *
 * Returns an array of disambiguator strings (same length/order as input):
 * - `''` for files with unique filenames (no disambiguator needed)
 * - `'./'` for files at workspace root when colliding with nested files
 * - `'…/parentDir'` for nested files (ellipsis indicates elided segments)
 * - `'…/grandparent/parentDir'` if one parent segment isn't enough
 * - `'full/path/to'` when all parent segments are shown (no ellipsis)
 *
 * Progressively adds parent directory segments from `relativePath` until
 * all disambiguators within each collision group are unique.
 *
 * @param files - Array of objects with `filename` and `relativePath` (forward-slash separated)
 * @returns Array of disambiguator strings, same length and order as input
 */
export const disambiguateFilenames = (files: readonly FileEntry[]): string[] => {
  const disambiguators: string[] = files.map(() => '');

  const groupsByFilename = new Map<string, number[]>();
  for (let i = 0; i < files.length; i++) {
    const key = files[i].filename;
    const group = groupsByFilename.get(key);
    if (group !== undefined) {
      group.push(i);
    } else {
      groupsByFilename.set(key, [i]);
    }
  }

  for (const indices of groupsByFilename.values()) {
    if (indices.length <= 1) {
      continue;
    }

    const parentSegments = indices.map((i) => {
      const parts = files[i].relativePath.split('/');
      parts.pop();
      return parts.filter((p) => p !== '');
    });

    let depth = 1;
    const maxDepth = Math.max(1, ...parentSegments.map((s) => s.length));

    while (depth <= maxDepth) {
      for (let j = 0; j < indices.length; j++) {
        const segments = parentSegments[j];
        if (segments.length === 0) {
          disambiguators[indices[j]] = './';
        } else if (depth >= segments.length) {
          disambiguators[indices[j]] = segments.join('/');
        } else {
          disambiguators[indices[j]] = '…/' + segments.slice(segments.length - depth).join('/');
        }
      }

      const seen = new Set<string>();
      let allUnique = true;
      for (const idx of indices) {
        if (seen.has(disambiguators[idx])) {
          allUnique = false;
          break;
        }
        seen.add(disambiguators[idx]);
      }

      if (allUnique) {
        break;
      }

      depth++;
    }
  }

  return disambiguators;
};
