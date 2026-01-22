import * as path from 'node:path';

import type { Logger } from 'barebone-logger';
import { DelimiterConfig, LinkType, ParsedLink } from 'rangelink-core-ts';

import type { BookmarkService } from '../bookmarks';
import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { RangeLinkParser } from '../RangeLinkParser';
import { MessageCode } from '../types';
import { formatMessage, generateLinkFromSelections } from '../utils';

/**
 * Command handler for adding a bookmark from the current editor selection.
 *
 * Supports two sources for bookmark creation:
 * 1. Selection IS a valid RangeLink - uses that link directly
 * 2. Selection is code - generates a link from the selection
 *
 * Requires text selection - empty selections are rejected.
 */
export class AddBookmarkCommand {
  constructor(
    private readonly parser: RangeLinkParser,
    private readonly delimiters: DelimiterConfig,
    private readonly ideAdapter: VscodeAdapter,
    private readonly bookmarkService: BookmarkService,
    private readonly logger: Logger,
  ) {
    this.logger.debug({ fn: 'AddBookmarkCommand.constructor' }, 'AddBookmarkCommand initialized');
  }

  async execute(): Promise<void> {
    const logCtx = { fn: 'AddBookmarkCommand.execute' };

    const editor = this.ideAdapter.activeTextEditor;
    if (!editor) {
      this.logger.debug(logCtx, 'No active editor');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_BOOKMARK_NO_ACTIVE_EDITOR));
      return;
    }

    const selections = editor.selections;
    const primarySelection = selections[0];
    const isRectangularSelection = selections.length > 1;

    // For existing link detection, only check primary selection text
    const selectedText = primarySelection.isEmpty ? '' : editor.document.getText(primarySelection);

    const trimmedSelectedText = selectedText.trim();
    const parsedExistingLink = this.tryParseAsExistingLink(trimmedSelectedText);

    let linkToBookmark: string;
    let defaultLabel: string;

    if (parsedExistingLink) {
      // Source 1: Selection IS a valid RangeLink
      linkToBookmark = trimmedSelectedText;
      defaultLabel = path.basename(parsedExistingLink.path);
      this.logger.info(
        { ...logCtx, source: 'existing-link', link: linkToBookmark },
        'Using existing link',
      );
    } else {
      // Source 2: Generate link from selection (supports rectangular selections)
      // Check if file is untitled (cannot generate link to unsaved file)
      if (editor.document.isUntitled) {
        this.logger.debug({ ...logCtx, reason: 'untitled-file' }, 'Cannot bookmark unsaved file');
        this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_BOOKMARK_UNTITLED_FILE));
        return;
      }

      const result = generateLinkFromSelections({
        referencePath: editor.document.uri.fsPath,
        document: editor.document,
        selections,
        delimiters: this.delimiters,
        linkType: LinkType.Regular,
        logger: this.logger,
      });

      if (!result.success) {
        this.logger.error({ ...logCtx, error: result.error }, 'Failed to generate link');
        this.ideAdapter.showErrorMessage(
          formatMessage(MessageCode.ERROR_BOOKMARK_LINK_GENERATION_FAILED),
        );
        return;
      }

      linkToBookmark = result.value.link;
      defaultLabel = this.generateDefaultLabel(linkToBookmark);
      this.logger.info(
        {
          ...logCtx,
          source: 'generated',
          link: linkToBookmark,
          selectionCount: selections.length,
          isRectangular: isRectangularSelection,
        },
        'Generated link from selection',
      );
    }
    this.logger.debug(
      { ...logCtx, link: linkToBookmark, defaultLabel },
      'Showing bookmark label input',
    );

    const label = await this.ideAdapter.showInputBox({
      prompt: formatMessage(MessageCode.BOOKMARK_ADD_INPUT_PROMPT, { link: linkToBookmark }),
      value: defaultLabel,
      placeHolder: formatMessage(MessageCode.BOOKMARK_ADD_INPUT_PLACEHOLDER),
    });

    if (label === undefined) {
      this.logger.debug({ ...logCtx, link: linkToBookmark }, 'User cancelled bookmark creation');
      return;
    }

    const trimmedLabel = label.trim();

    if (trimmedLabel === '') {
      this.logger.debug(logCtx, 'Empty label provided');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_BOOKMARK_EMPTY_LABEL));
      return;
    }

    const result = await this.bookmarkService.addBookmark({
      label: trimmedLabel,
      link: linkToBookmark,
      scope: 'global',
    });

    if (!result.success) {
      this.logger.error({ ...logCtx, error: result.error }, 'Failed to save bookmark');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.ERROR_BOOKMARK_SAVE_FAILED));
      return;
    }

    this.logger.info({ ...logCtx, label: trimmedLabel, link: linkToBookmark }, 'Bookmark saved');

    this.ideAdapter.setStatusBarMessage(
      formatMessage(MessageCode.STATUS_BAR_BOOKMARK_SAVED, { label: trimmedLabel }),
    );
  }

  /**
   * Try to parse the text as a valid RangeLink.
   *
   * @returns The parsed link if valid, undefined if not
   */
  private tryParseAsExistingLink(text: string): ParsedLink | undefined {
    const result = this.parser.parseLink(text);
    if (result.success) {
      return result.value;
    }
    return undefined;
  }

  /**
   * Generate a default label based on the link path.
   * Extracts the filename from the path using the parser.
   */
  private generateDefaultLabel(link: string): string {
    const parsedLink = this.tryParseAsExistingLink(link);
    if (!parsedLink) {
      return link;
    }
    return path.basename(parsedLink.path);
  }
}
