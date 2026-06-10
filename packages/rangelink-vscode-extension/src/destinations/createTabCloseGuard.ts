import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { LifecycleFeedbackProvider } from '../feedback';
import type { EventSubscriptionProvider } from '../ide';

/**
 * Auto-unbind when the last tab of the bound editor is closed.
 *
 * Uses the tab API (vscode.window.tabGroups) to check remaining instances
 * because visible editors may be stale during onDidChangeTabs.
 */
export const createTabCloseGuard = (deps: {
  events: EventSubscriptionProvider;
  feedback: LifecycleFeedbackProvider;
  logger: Logger;
  boundUri: vscode.Uri;
  displayName: string;
  clearBinding: () => void;
}): vscode.Disposable => {
  const boundUriString = deps.boundUri.toString();

  return deps.events.onDidChangeTabs((event) => {
    const closedTab = event.closed.find(
      (tab) => (tab.input as { uri?: vscode.Uri })?.uri?.toString() === boundUriString,
    );
    if (!closedTab) return;

    const remainingTabs = vscode.window.tabGroups.all
      .flatMap((g) => g.tabs)
      .filter((t) => (t.input as { uri?: vscode.Uri })?.uri?.toString() === boundUriString);
    if (remainingTabs.length > 0) return;

    deps.logger.info(
      { fn: 'createTabCloseGuard', editorUri: boundUriString },
      `Bound editor tab closed: ${deps.displayName} — auto-unbinding`,
    );
    deps.clearBinding();
    deps.feedback.notifyAutoUnbind(deps.displayName, 'editor-closed');
  });
};
