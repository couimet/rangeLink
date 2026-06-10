import type { Logger } from 'barebone-logger';
import * as vscode from 'vscode';

import type { LifecycleFeedbackProvider } from '../feedback';
import type { EventSubscriptionProvider, VisibleEditorProvider } from '../ide';
import type { BoundDestinationInfo } from '../types';
import { AutoPasteResult } from '../types';
import { isEditorDestination, isTerminalDestination } from '../utils';

import type { PasteDestination } from './PasteDestination';

/**
 * Manages the lifecycle of a bound destination.
 *
 * Owns the bound state, emits change events, and registers VSCode
 * lifecycle listeners that protect the bound destination:
 * - Terminal close auto-unbind
 * - Document close auto-unbind (with language-mode transition detection)
 * - Multi-column duplicate-tab guard
 *
 * Created once per extension activation. The same session persists
 * across bind/unbind cycles — only the internal bound destination changes.
 */
export class BoundSession implements vscode.Disposable {
  private bound: PasteDestination | undefined;
  private isInDuplicateTabState = false;
  private readonly emitter = new vscode.EventEmitter<BoundDestinationInfo | undefined>();
  private readonly disposables: vscode.Disposable[] = [];

  readonly onDidChange = this.emitter.event;

  constructor(
    private readonly events: EventSubscriptionProvider,
    private readonly editors: VisibleEditorProvider,
    private readonly feedback: LifecycleFeedbackProvider,
    private readonly logger: Logger,
  ) {
    this.setupTerminalCloseListener();
    this.setupDocumentCloseListener();
    this.setupMultiColumnGuardListener();
  }

  get(): PasteDestination | undefined {
    return this.bound;
  }

  set(destination: PasteDestination): void {
    if (this.bound !== undefined) {
      throw new Error('BoundSession.set() called while already bound. Call clear() first.');
    }
    this.bound = destination;
    this.emitter.fire(this.getInfo()!);
  }

  clear(): void {
    this.bound = undefined;
    this.isInDuplicateTabState = false;
    this.emitter.fire(undefined);
  }

  isSet(): boolean {
    return this.bound !== undefined;
  }

  getInfo(): BoundDestinationInfo | undefined {
    return this.bound !== undefined
      ? { id: this.bound.id, displayName: this.bound.displayName }
      : undefined;
  }

  /**
   * Whether clipboard content should be restored after a paste operation.
   *
   * Returns true (restore) when no destination is bound, when paste succeeded,
   * or when the destination has no manual-paste instruction.
   *
   * Returns false when paste failed AND the destination provided a failure
   * instruction — the RangeLink must stay on the clipboard for manual paste.
   * Also returns false when the destination's shouldPreserveClipboard() signals
   * false (Tier 3 custom AI assistants that resolve to focusCommands).
   */
  isClipboardRestorationApplicable(pasteSucceeded: boolean): boolean {
    const bound = this.bound;
    if (!bound) return true;
    if (!bound.shouldPreserveClipboard()) return false;
    if (pasteSucceeded) return true;
    return bound.getUserInstruction?.(AutoPasteResult.Failure) === undefined;
  }

  subscribe(listener: (info: BoundDestinationInfo | undefined) => void): vscode.Disposable {
    listener(this.getInfo());
    return this.onDidChange(listener);
  }

  dispose(): void {
    this.disposables.forEach((d) => d?.dispose());
    this.disposables.length = 0;
    this.emitter.dispose();
  }

  private setupTerminalCloseListener(): void {
    const disposable = this.events.onDidCloseTerminal((closedTerminal) => {
      if (!isTerminalDestination(this.bound)) {
        return;
      }

      if (this.bound.resource.terminal === closedTerminal) {
        const destinationName = this.bound.displayName;
        const terminalName = closedTerminal.name || 'Unnamed Terminal'; // log-only, no i18n needed
        this.logger.info(
          { fn: 'BoundSession.setupTerminalCloseListener', terminalName },
          `Bound terminal closed: ${terminalName} - auto-unbinding`,
        );
        this.clear();
        this.feedback.notifyAutoUnbind(destinationName, 'terminal-closed');
      }
    });

    this.disposables.push(disposable);
  }

  private setupDocumentCloseListener(): void {
    const disposable = this.events.onDidCloseTextDocument((closedDocument) => {
      if (!isEditorDestination(this.bound)) {
        return;
      }

      const boundDocumentUri = this.bound.resource.uri;

      if (closedDocument.uri.toString() !== boundDocumentUri.toString()) {
        return;
      }

      const editorDisplayName = this.bound.displayName || 'Unknown'; // log-only, no i18n needed
      const logCtx = {
        fn: 'BoundSession.setupDocumentCloseListener',
        editorDisplayName,
        boundDocumentUri: boundDocumentUri.toString(),
        isClosed: closedDocument.isClosed,
      };

      if (!closedDocument.isClosed) {
        this.logger.info(
          logCtx,
          `Document close event with isClosed=false — language-mode transition detected, keeping binding for ${editorDisplayName}`,
        );
        return;
      }

      this.logger.info(
        logCtx,
        `Bound document closed (isClosed=true): ${editorDisplayName} — auto-unbinding`,
      );
      const destinationName = this.bound.displayName;
      this.clear();
      this.feedback.notifyAutoUnbind(destinationName, 'editor-closed');
    });

    this.disposables.push(disposable);
  }

  private setupMultiColumnGuardListener(): void {
    const disposable = this.events.onDidChangeTabs(() => {
      if (!isEditorDestination(this.bound)) {
        return;
      }

      const boundDocumentUri = this.bound.resource.uri;
      const matchingEditors = this.editors.findVisibleEditorsByUri(boundDocumentUri);

      if (matchingEditors.length > 1 && !this.isInDuplicateTabState) {
        this.isInDuplicateTabState = true;
        this.logger.warn(
          {
            fn: 'BoundSession.setupMultiColumnGuardListener',
            editorUri: boundDocumentUri.toString(),
            matchCount: matchingEditors.length,
            viewColumns: matchingEditors.map((e) => e.viewColumn),
          },
          'Bound file detected in multiple editor groups',
        );
        this.feedback.notifyDuplicateTabWarning();
      } else if (matchingEditors.length <= 1 && this.isInDuplicateTabState) {
        this.isInDuplicateTabState = false;
        this.logger.info(
          {
            fn: 'BoundSession.setupMultiColumnGuardListener',
            editorUri: boundDocumentUri.toString(),
          },
          'Bound file no longer in multiple editor groups — duplicate state cleared',
        );
      }
    });

    this.disposables.push(disposable);
  }
}
