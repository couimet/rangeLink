import { isBinaryFile } from '../../utils/isBinaryFile';
import { isWritableScheme } from '../../utils/isWritableScheme';

/**
 * Check if a file is eligible for binding as a text editor destination.
 *
 * A file is eligible when:
 * - Its URI scheme supports text editing (file, untitled)
 * - It is not a binary file (images, archives, etc.)
 *
 * Takes scheme + fsPath (not a tab or URI) to keep it pure and easy to test,
 * matching isBinaryFile()'s existing signature pattern.
 *
 * @param scheme - The URI scheme (e.g., 'file', 'untitled', 'git')
 * @param fsPath - The file system path (e.g., '/workspace/src/app.ts')
 * @returns true if file can be used as a text editor destination
 */
export const isFileEligible = (scheme: string, fsPath: string): boolean =>
  isWritableScheme(scheme) && !isBinaryFile(scheme, fsPath);
