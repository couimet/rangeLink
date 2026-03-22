import type { Logger } from 'barebone-logger';
import { quotePath } from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import type { ConfigReader } from '../config/ConfigReader';
import {
  DEFAULT_SMART_PADDING_PASTE_FILE_PATH,
  SETTING_SMART_PADDING_PASTE_FILE_PATH,
} from '../constants';
import type { PasteDestinationManager } from '../destinations/PasteDestinationManager';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode, PasteContentType, PathFormat, RelativePathFormat } from '../types';
import { formatMessage } from '../utils';

import type { ClipboardRouter } from './ClipboardRouter';

/**
 * Resolves a file URI to a reference path based on the requested format.
 *
 * Returns workspace-relative path when:
 * - pathFormat is WorkspaceRelative AND
 * - file is inside a workspace folder
 *
 * Falls back to absolute fsPath otherwise.
 */
export const getReferencePath = (
  ideAdapter: VscodeAdapter,
  uri: vscode.Uri,
  pathFormat: PathFormat,
): string => {
  const workspaceFolder = ideAdapter.getWorkspaceFolder(uri);
  if (workspaceFolder && pathFormat === PathFormat.WorkspaceRelative) {
    return ideAdapter.asRelativePath(uri, RelativePathFormat.PathOnly);
  }
  return uri.fsPath;
};

/**
 * Handles file path pasting to bound destinations.
 * Supports both context-menu (URI provided) and command-palette (URI from active editor) flows.
 */
export class FilePathPaster {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly destinationManager: PasteDestinationManager,
    private readonly configReader: ConfigReader,
    private readonly clipboardRouter: ClipboardRouter,
    private readonly logger: Logger,
  ) {}

  async pasteFilePathToDestination(uri: vscode.Uri, pathFormat: PathFormat): Promise<void> {
    await this.pasteFilePath(uri, pathFormat, 'context-menu');
  }

  async pasteCurrentFilePathToDestination(pathFormat: PathFormat): Promise<void> {
    await this.pasteCurrentFilePath(pathFormat);
  }

  private async pasteCurrentFilePath(pathFormat: PathFormat): Promise<void> {
    const uri = this.ideAdapter.getActiveTextEditorUri();
    if (!uri) {
      this.logger.debug(
        { fn: 'FilePathPaster.pasteCurrentFilePath', pathFormat },
        'No active editor',
      );
      await this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_PASTE_FILE_PATH_NO_ACTIVE_FILE),
      );
      return;
    }
    await this.pasteFilePath(uri, pathFormat, 'command-palette');
  }

  private async pasteFilePath(
    uri: vscode.Uri,
    pathFormat: PathFormat,
    uriSource: 'context-menu' | 'command-palette',
  ): Promise<void> {
    const logCtx = { fn: 'FilePathPaster.pasteFilePath', pathFormat, uriSource };

    const filePath = getReferencePath(this.ideAdapter, uri, pathFormat);
    this.logger.debug({ ...logCtx, filePath }, `Resolved file path: ${filePath}`);

    const paddingMode = this.configReader.getPaddingMode(
      SETTING_SMART_PADDING_PASTE_FILE_PATH,
      DEFAULT_SMART_PADDING_PASTE_FILE_PATH,
    );

    const destinationBehavior = await this.clipboardRouter.resolveDestinationBehavior(logCtx);
    if (destinationBehavior === undefined) return;

    const destinationFilePath = quotePath(filePath);

    if (destinationFilePath !== filePath) {
      this.logger.debug(
        { ...logCtx, before: filePath, after: destinationFilePath },
        'Quoted path for unsafe characters',
      );
    }

    await this.clipboardRouter.copyAndSendToDestination({
      control: {
        contentType: PasteContentType.Text,
        destinationBehavior,
      },
      content: {
        clipboard: filePath,
        send: destinationFilePath,
        sourceUri: uri,
      },
      strategies: {
        sendFn: (text, basicStatusMessage) =>
          this.destinationManager.sendTextToDestination(text, basicStatusMessage, paddingMode),
        isEligibleFn: (destination, text) => destination.isEligibleForPasteContent(text),
      },
      contentName: formatMessage(MessageCode.CONTENT_NAME_FILE_PATH),
      fnName: 'pasteFilePath',
    });
  }
}
