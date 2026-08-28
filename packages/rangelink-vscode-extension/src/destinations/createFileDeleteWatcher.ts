import type { LifecycleFeedbackProvider } from '../feedback';
import type { FileSystemWatcherFactory } from '../ide/FileSystemWatcherFactory';

import type { Logger } from '@couimet/logger-contract';
import * as vscode from 'vscode';

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
  getBoundUri: () => vscode.Uri | undefined;
  logger: Logger;
}): vscode.Disposable => {
  const watcher = deps.watcherFactory.createFileSystemWatcherForFile(
    deps.boundUri,
    true, // ignoreCreateEvents
    true, // ignoreChangeEvents
    false, // don't ignore delete events
  );

  watcher.onDidDelete((deletedUri) => {
    // A rename fires onDidDelete for the old path, and by the time this
    // watcher's event arrives the rename listener may already have cleared
    // the binding — the live check suppresses that stale delete.
    const currentUri = deps.getBoundUri();
    if (currentUri === undefined || deletedUri.toString() !== currentUri.toString()) {
      return;
    }

    deps.logger.info({ fn: 'createFileDeleteWatcher', fileUri: currentUri.toString() }, `Bound file deleted from disk: ${deps.displayName} — auto-unbinding`);
    deps.clearBinding();
    deps.feedback.notifyAutoUnbind(deps.displayName, { reason: 'file-deleted', oldUri: deletedUri });
  });

  return watcher;
};
