import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { FocusErrorReason, type FocusCapability, type FocusResult } from './FocusCapability';
import type { InsertFactory } from './insertFactories';

/**
 * FocusCapability for text editor destinations.
 *
 * Stores the document URI and view column (immutable) rather than the editor
 * reference (mutable). On focus(), retrieves a fresh editor via showTextDocument()
 * and passes it to InsertFactory.
 */
export class EditorFocusCapability implements FocusCapability {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly documentUri: vscode.Uri,
    private readonly viewColumn: vscode.ViewColumn | undefined,
    private readonly insertFactory: InsertFactory<vscode.TextEditor>,
    private readonly logger: Logger,
  ) {}

  async focus(context: LoggingContext): Promise<FocusResult> {
    try {
      const freshEditor = await this.ideAdapter.showTextDocument(this.documentUri, {
        viewColumn: this.viewColumn,
      });

      this.logger.debug(
        { ...context, editorUri: this.documentUri.toString() },
        'Editor focused via showTextDocument()',
      );

      return Result.ok({
        insert: this.insertFactory.forTarget(freshEditor),
      });
    } catch (error) {
      this.logger.warn(
        { ...context, editorUri: this.documentUri.toString(), error },
        'Failed to focus editor',
      );
      return Result.err({
        reason: FocusErrorReason.SHOW_DOCUMENT_FAILED,
        cause: error,
      });
    }
  }
}
