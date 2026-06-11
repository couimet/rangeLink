import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { LifecycleFeedbackProvider } from '../feedback';
import type { EventSubscriptionProvider, VisibleEditorProvider } from '../ide';

/**
 * Warn when the bound editor appears in multiple tab groups.
 */
export const createMultiColumnGuard = (deps: {
  events: EventSubscriptionProvider;
  editors: VisibleEditorProvider;
  feedback: LifecycleFeedbackProvider;
  logger: Logger;
  boundUri: vscode.Uri;
}): vscode.Disposable => {
  let isInDuplicateTabState = false;

  return deps.events.onDidChangeTabs(() => {
    const matchingEditors = deps.editors.findVisibleEditorsByUri(deps.boundUri);

    if (matchingEditors.length > 1 && !isInDuplicateTabState) {
      isInDuplicateTabState = true;
      deps.logger.warn(
        {
          fn: 'createMultiColumnGuard',
          editorUri: deps.boundUri.toString(),
          matchCount: matchingEditors.length,
          viewColumns: matchingEditors.map((e) => e.viewColumn),
        },
        'Bound file detected in multiple editor groups',
      );
      deps.feedback.notifyDuplicateTabWarning();
    } else if (matchingEditors.length <= 1 && isInDuplicateTabState) {
      isInDuplicateTabState = false;
      deps.logger.info(
        { fn: 'createMultiColumnGuard', editorUri: deps.boundUri.toString() },
        'Bound file no longer in multiple editor groups — duplicate state cleared',
      );
    }
  });
};
