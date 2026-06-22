import type { Logger } from '@couimet/logger-contract';
import * as vscode from 'vscode';

import type { LifecycleFeedbackProvider } from '../feedback';
import type { FileSystemWatcherFactory } from '../ide/FileSystemWatcherFactory';

/**
 * Auto-unbind when the bound editor's underlying file is deleted from disk.
 *
 * Creates a per-binding FileSystemWatcher scoped to the bound file. The
 * watcher only listens for delete events and is disposed when the binding
 * is cleared.
 */
export const createFileDeleteWatcher = (deps: {
  boundUri: vscode.Uri;
  watcherFactory: FileSystemWatcherFactory;
  feedback: LifecycleFeedbackProvider;
  displayName: string;
  clearBinding: () => void;
  logger: Logger;
}): vscode.Disposable => {
  const watcher = deps.watcherFactory.createFileSystemWatcherForFile(
    deps.boundUri,
    true, // ignoreCreateEvents
    true, // ignoreChangeEvents
    false, // don't ignore delete events
  );

  const boundUriString = deps.boundUri.toString();

  watcher.onDidDelete((deletedUri) => {
    if (deletedUri.toString() !== boundUriString) {
      return;
    }

    deps.logger.info(
      { fn: 'createFileDeleteWatcher', fileUri: boundUriString },
      `Bound file deleted from disk: ${deps.displayName} — auto-unbinding`,
    );
    deps.clearBinding();
    deps.feedback.notifyAutoUnbind(deps.displayName, 'file-deleted');
  });

  return watcher;
};
