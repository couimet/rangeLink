import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type {
  BindSuccessInfo,
  DestinationAvailabilityService,
  PasteDestinationManager,
} from '../destinations';
import { showFilePicker } from '../destinations/utils';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { type ExtensionResult, MessageCode, type QuickPickBindResult } from '../types';
import { formatMessage, isEditorDestination } from '../utils';

/**
 * Command handler for binding to a text editor file.
 *
 * Two modes based on whether a URI is provided:
 *
 * With URI (explorer context menu "Bind Here"):
 * - 0 tab groups with file: opens in active group, binds
 * - 1 tab group with file: focuses that group, binds
 * - 2+ tab groups with file: prompts user to pick which group
 *
 * Without URI (keybinding / editor context menu):
 * - 0 files: shows error, returns 'no-resource'
 * - 1 file: auto-binds (no picker)
 * - 2+ files: shows sectioned file picker (Active Files + Tab Group N), binds to selected
 *
 * Success feedback is handled by PasteDestinationManager.bind().
 */
export class BindToTextEditorCommand {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly availabilityService: DestinationAvailabilityService,
    private readonly destinationManager: PasteDestinationManager,
    private readonly logger: Logger,
  ) {
    this.logger.debug(
      { fn: 'BindToTextEditorCommand.constructor' },
      'BindToTextEditorCommand initialized',
    );
  }

  async execute(explorerUri?: vscode.Uri): Promise<QuickPickBindResult> {
    if (explorerUri) {
      return this.executeWithUri(explorerUri);
    }
    return this.executeWithPicker();
  }

  private async executeWithUri(uri: vscode.Uri): Promise<QuickPickBindResult> {
    const logCtx = { fn: 'BindToTextEditorCommand.executeWithUri' };
    const uriString = uri.toString();

    const matchingViewColumns: number[] = [];
    for (const group of this.ideAdapter.tabGroups.all) {
      for (const tab of group.tabs) {
        const tabUri = this.ideAdapter.getTabDocumentUri(tab);
        if (tabUri && tabUri.toString() === uriString) {
          matchingViewColumns.push(group.viewColumn);
          break;
        }
      }
    }

    this.logger.debug(
      { ...logCtx, matchCount: matchingViewColumns.length },
      'Found tab groups containing URI',
    );

    if (matchingViewColumns.length <= 1) {
      const showOptions =
        matchingViewColumns.length === 1 ? { viewColumn: matchingViewColumns[0] } : undefined;
      const editor = await this.ideAdapter.showTextDocument(uri, showOptions);
      const viewColumn = editor.viewColumn ?? 1;
      return this.mapBindResult(
        await this.destinationManager.bind({ kind: 'text-editor', uri, viewColumn }),
      );
    }

    const items = matchingViewColumns.map((vc) => ({
      label: formatMessage(MessageCode.FILE_PICKER_GROUP_FORMAT, { index: vc }),
      viewColumn: vc,
    }));
    const selected = await this.ideAdapter.showQuickPick(items, {
      placeHolder: formatMessage(MessageCode.FILE_PICKER_BIND_ONLY_PLACEHOLDER),
    });

    if (!selected) {
      this.logger.debug(logCtx, 'User cancelled tab group picker');
      return { outcome: 'cancelled' };
    }

    return this.mapBindResult(
      await this.destinationManager.bind({
        kind: 'text-editor',
        uri,
        viewColumn: selected.viewColumn,
      }),
    );
  }

  private async executeWithPicker(): Promise<QuickPickBindResult> {
    const logCtx = { fn: 'BindToTextEditorCommand.executeWithPicker' };

    const boundDest = this.destinationManager.getBoundDestination();
    const boundEditorDest = isEditorDestination(boundDest) ? boundDest : undefined;
    const fileItems = this.availabilityService.getAllFileItems(
      boundEditorDest?.resource.uri.toString(),
      boundEditorDest?.resource.viewColumn,
    );

    this.logger.debug(
      { ...logCtx, fileCount: fileItems.length },
      'Starting bind to text editor command',
    );

    if (fileItems.length === 0) {
      this.logger.debug(logCtx, 'No files available');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_NO_ACTIVE_TEXT_EDITOR));
      return { outcome: 'no-resource' };
    }

    if (fileItems.length === 1) {
      const { fileInfo } = fileItems[0];
      this.logger.debug({ ...logCtx, filename: fileInfo.filename }, 'Single file, auto-binding');
      return this.mapBindResult(
        await this.destinationManager.bind({
          kind: 'text-editor',
          uri: fileInfo.uri,
          viewColumn: fileInfo.viewColumn,
        }),
      );
    }

    const result = await showFilePicker(
      fileItems,
      this.ideAdapter,
      {
        getPlaceholder: () => formatMessage(MessageCode.FILE_PICKER_BIND_ONLY_PLACEHOLDER),
        onSelected: async (file) =>
          this.mapBindResult(
            await this.destinationManager.bind({
              kind: 'text-editor',
              uri: file.uri,
              viewColumn: file.viewColumn,
            }),
          ),
      },
      this.logger,
    );

    if (result === undefined) {
      return { outcome: 'cancelled' };
    }

    return result;
  }

  private mapBindResult(bindResult: ExtensionResult<BindSuccessInfo>): QuickPickBindResult {
    if (bindResult.success) {
      return { outcome: 'bound', bindInfo: bindResult.value };
    }
    return { outcome: 'bind-failed', error: bindResult.error };
  }
}
