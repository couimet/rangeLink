import * as path from 'node:path';
import type * as vscode from 'vscode';

/**
 * True when uri is dirUri itself or a path-segment descendant of dirUri.
 *
 * Used to detect ancestor-folder renames because VSCode's onDidRenameFiles
 * reports only the renamed folder, not each file inside it. The trailing
 * path separator prevents partial-name matches, so a rename of /src/foo
 * does not match a bound /src/foobar/file.ts.
 */
export const isUriWithinDir = (uri: vscode.Uri, dirUri: vscode.Uri): boolean => {
  if (uri.scheme !== dirUri.scheme || uri.authority !== dirUri.authority) {
    return false;
  }
  const dirPath = dirUri.fsPath;
  if (uri.fsPath === dirPath) {
    return true;
  }
  return uri.fsPath.startsWith(dirPath + path.sep);
};
