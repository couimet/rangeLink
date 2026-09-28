import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import { ExtensionResult } from '../types';

import type { Logger } from '@couimet/logger-contract';
import { quoteLink } from 'rangelink-core-ts';
import { findOccurrences, formatTextFragment, normalizeEOL } from 'text-fragment-ts';
import * as vscode from 'vscode';

/**
 * Options for generating a text fragment link from a single selection.
 */
export interface GenerateTextFragmentLinkOptions {
  /**
   * The reference path to include in the link (workspace-relative or absolute).
   */
  referencePath: string;

  /**
   * The document containing the selection.
   */
  document: vscode.TextDocument;

  /**
   * The selections to build the fragment from - must be exactly one
   * non-empty, non-rectangular selection.
   */
  selections: readonly vscode.Selection[];

  /**
   * Logger for debug/error output.
   */
  logger: Logger;
}

const FN_NAME = 'generateTextFragmentLink';

/**
 * Generate a text fragment link (`<path>:~:text=<start>`) from a single editor
 * selection.
 *
 * This is a pure utility function that:
 * - Requires exactly one non-empty selection (rectangular and multi-cursor
 *   selections surface as multiple VSCode selections and are refused)
 * - Extracts the selected text via `document.getText(selection)`
 * - Normalizes CRLF to LF on both the selection and the whole document so the
 *   emitted directive never carries `%0D`
 * - Requires the normalized selection text to occur exactly once in the
 *   normalized document text, so the generated link always resolves
 *   unambiguously (`findOccurrences` from the text fragment package)
 * - Delegates percent-encoding and `MAX_LINK_LENGTH` enforcement to the text
 *   fragment package's `formatTextFragment`, which percent-encodes the
 *   LF-normalized text
 * - Applies `quoteLink` from core, because the codec returns a raw unquoted
 *   link and outbound quoting policy lives with the caller
 *
 * The function does NOT show error messages - the caller is responsible for
 * presenting errors to the user appropriately.
 *
 * @param options - Configuration for link generation
 * @returns Result containing the full quoted link string on success, or an error on failure
 */
export const generateTextFragmentLink = (options: GenerateTextFragmentLinkOptions): ExtensionResult<string> => {
  const { referencePath, document, selections, logger } = options;

  if (selections.length === 0) {
    const error = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.GENERATE_LINK_NO_SELECTION,
      message: 'No selections provided',
      functionName: FN_NAME,
    });
    logger.debug({ fn: FN_NAME }, 'No selections provided');
    return ExtensionResult.err(error);
  }

  const hasNonEmptySelection = selections.some((selection) => !selection.isEmpty);
  if (!hasNonEmptySelection) {
    const error = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.GENERATE_LINK_SELECTION_EMPTY,
      message: 'All selections are empty',
      functionName: FN_NAME,
    });
    logger.debug({ fn: FN_NAME }, 'All selections are empty');
    return ExtensionResult.err(error);
  }

  if (selections.length > 1) {
    const error = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.GENERATE_TEXT_FRAGMENT_MULTIPLE_SELECTIONS,
      message: 'Text fragment links require exactly one selection',
      functionName: FN_NAME,
      details: { selectionCount: selections.length },
    });
    logger.debug({ fn: FN_NAME, selectionCount: selections.length }, 'Text fragment links require exactly one selection');
    return ExtensionResult.err(error);
  }

  const selection = selections[0];
  const normalizedSelectionText = normalizeEOL(document.getText(selection));
  const normalizedDocumentText = normalizeEOL(document.getText());

  const occurrences = findOccurrences(normalizedDocumentText, normalizedSelectionText);
  if (occurrences.length !== 1) {
    const error = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.GENERATE_TEXT_FRAGMENT_TEXT_NOT_UNIQUE,
      message: 'Selected text must be unique to generate a text fragment link',
      functionName: FN_NAME,
      details: { count: occurrences.length },
    });
    logger.debug({ fn: FN_NAME, count: occurrences.length }, 'Selected text is not unique in document');
    return ExtensionResult.err(error);
  }

  const result = formatTextFragment(referencePath, { start: normalizedSelectionText });
  if (!result.success) {
    logger.error({ fn: FN_NAME, error: result.error }, 'Failed to generate text fragment link');
    return ExtensionResult.err(result.error);
  }

  const link = quoteLink(result.value, referencePath);
  logger.info({ fn: FN_NAME, link }, `Generated text fragment link: ${link}`);
  return ExtensionResult.ok(link);
};
