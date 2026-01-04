import { isBinaryFile } from './isBinaryFile';
import { isWritableScheme } from './isWritableScheme';

/**
 * Check if a document is a text-like file (writable scheme and not binary).
 *
 * This is a composed check that validates:
 * 1. URI scheme is writable (file:// or untitled://)
 * 2. File extension is not a known binary format
 *
 * @param scheme - The URI scheme
 * @param fsPath - The file system path
 * @returns true if text-like, false if read-only scheme or binary
 */
export const isTextLikeFile = (scheme: string, fsPath: string): boolean => {
  return isWritableScheme(scheme) && !isBinaryFile(scheme, fsPath);
};
