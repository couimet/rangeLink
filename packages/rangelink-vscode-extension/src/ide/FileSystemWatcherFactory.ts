import type * as vscode from 'vscode';

/**
 * Narrow interface for creating file system watchers scoped to a specific file.
 *
 * The implementation handles constructing the appropriate glob pattern
 * (e.g. RelativePattern) to watch for filesystem events on the given URI.
 */
export interface FileSystemWatcherFactory {
  createFileSystemWatcherForFile(
    fileUri: vscode.Uri,
    ignoreCreateEvents?: boolean,
    ignoreChangeEvents?: boolean,
    ignoreDeleteEvents?: boolean,
  ): vscode.FileSystemWatcher;
}
