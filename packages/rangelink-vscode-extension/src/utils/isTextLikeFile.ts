import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';

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
 * Check if editor is a text-like file (not binary).
 *
 * **Restrictions:**
 * - Only allows file:// and untitled:// schemes
 * - Blocks known binary extensions
 *
 * @param vscodeAdapter - VscodeAdapter instance for accessing document URI
 * @param editor - The editor to check
 * @returns true if editor is text-like, false if binary or invalid scheme
 */
export const isTextLikeFile = (vscodeAdapter: VscodeAdapter, editor: vscode.TextEditor): boolean => {
  const editorUri = vscodeAdapter.getDocumentUri(editor);
  const scheme = editorUri.scheme;

  // Only allow file:// and untitled:// schemes
  const isTextScheme = scheme === 'file' || scheme === 'untitled';
  if (!isTextScheme) {
    return false;
  }

  // For untitled files, always allow
  if (scheme === 'untitled') {
    return true;
  }

  // Check for binary extensions
  const path = editorUri.fsPath.toLowerCase();
  const isBinary = BINARY_EXTENSIONS.some((ext) => path.endsWith(ext));

  return !isBinary;
};
