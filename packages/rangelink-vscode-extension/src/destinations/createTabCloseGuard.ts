import type { LifecycleFeedbackProvider } from '../feedback';
import type { EventSubscriptionProvider } from '../ide';
import { isFileUri } from '../utils';

import type { Logger } from '@couimet/logger-contract';
import * as fs from 'node:fs';
import * as vscode from 'vscode';

/**
 * Auto-unbind when the last tab of the bound editor is closed.
 *
 * Uses the tab API (vscode.window.tabGroups) to check remaining instances
 * because visible editors may be stale during onDidChangeTabs.
 *
 * A rename of the bound file closes its tab and replaces it with the renamed
 * one, with onDidRenameFiles firing only after the tab change — the tab close
 * event cannot distinguish a rename from a real close. When the bound file no
 * longer exists on disk, the tab change is a rename (or delete) in progress,
 * so the guard defers to the rename listener / file-delete watcher instead of
 * claiming an 'editor-closed' unbind.
 */
export const createTabCloseGuard = (deps: {
  boundUri: vscode.Uri;
  events: EventSubscriptionProvider;
  feedback: LifecycleFeedbackProvider;
  displayName: string;
  clearBinding: () => void;
  fileExists?: (uri: vscode.Uri) => boolean;
  logger: Logger;
}): vscode.Disposable => {
  const boundUriString = deps.boundUri.toString();

  return deps.events.onDidChangeTabs((event) => {
    const closedTab = event.closed.find((tab) => (tab.input as { uri?: vscode.Uri })?.uri?.toString() === boundUriString);
    if (!closedTab) return;

    const remainingTabs = vscode.window.tabGroups.all
      .flatMap((g) => g.tabs)
      .filter((t) => (t.input as { uri?: vscode.Uri })?.uri?.toString() === boundUriString);
    if (remainingTabs.length > 0) return;

    if (isFileUri(deps.boundUri)) {
      const fileExists = deps.fileExists ? deps.fileExists(deps.boundUri) : fs.existsSync(deps.boundUri.fsPath);
      if (!fileExists) {
        deps.logger.info(
          { fn: 'createTabCloseGuard', editorUri: boundUriString },
          `Bound editor tab closed while file no longer exists — deferring to rename/delete listeners for ${deps.displayName}`,
        );
        return;
      }
    }

    deps.logger.info({ fn: 'createTabCloseGuard', editorUri: boundUriString }, `Bound editor tab closed: ${deps.displayName} — auto-unbinding`);
    deps.clearBinding();
    deps.feedback.notifyAutoUnbind(deps.displayName, { reason: 'editor-closed' });
  });
};
