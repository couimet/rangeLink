/**
 * Known binary file extensions to block from text editor binding.
 */
const BINARY_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.svg',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  '.exe',
  '.dll',
  '.bin',
  '.dat',
  '.db',
  '.sqlite',
];

/**
 * Check if a file path represents a binary file.
 *
 * Binary files cannot accept text insertions meaningfully.
 * This function checks the file extension against a blocklist.
 *
 * @param scheme - The URI scheme (untitled files are always text-like)
 * @param fsPath - The file system path to check
 * @returns true if file is binary, false if text-like
 */
export const isBinaryFile = (scheme: string, fsPath: string): boolean => {
  // Untitled files are always text-like
  if (scheme === 'untitled') {
    return false;
  }

  const path = fsPath.toLowerCase();
  return BINARY_EXTENSIONS.some((ext) => path.endsWith(ext));
};
