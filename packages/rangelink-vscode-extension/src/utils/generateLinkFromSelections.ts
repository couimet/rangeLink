import type { Logger } from 'barebone-logger';
import {
  DelimiterConfig,
  formatLink,
  type FormattedLink,
  type FormatOptions,
  LinkType,
  RangeLinkError,
  RangeLinkErrorCodes,
  Result,
} from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import { toInputSelection } from './toInputSelection';

/**
 * Options for generating a RangeLink from editor selections.
 *
 * Caller is responsible for:
 * - Resolving the path (absolute or workspace-relative)
 * - Extracting document and selections from editor
 * - Handling the Result (showing errors, using the link)
 */
export interface GenerateLinkOptions {
  referencePath: string;
  document: vscode.TextDocument;
  selections: readonly vscode.Selection[];
  delimiters: DelimiterConfig;
  linkType: LinkType;
  logger: Logger;
}

const FUNCTION_NAME = 'generateLinkFromSelections';

/**
 * Generate a RangeLink from document selections.
 *
 * Pure utility function - no side effects (no showErrorMessage, no clipboard).
 * Caller handles error presentation via i18n MessageCode mapping.
 *
 * @returns Result.ok(FormattedLink) on success, Result.err(RangeLinkError) on failure
 */
export const generateLinkFromSelections = (
  options: GenerateLinkOptions,
): Result<FormattedLink, RangeLinkError> => {
  const { referencePath, document, selections, delimiters, linkType, logger } = options;

  if (selections.length === 0 || selections.every((s) => s.isEmpty)) {
    logger.debug({ fn: FUNCTION_NAME }, 'Empty selections - rejecting');
    return Result.err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_EMPTY,
        message: 'No text selected',
        functionName: FUNCTION_NAME,
      }),
    );
  }

  let inputSelection;
  try {
    inputSelection = toInputSelection(document, selections);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process selection';
    logger.error({ fn: FUNCTION_NAME, error }, 'Failed to convert selections to InputSelection');
    return Result.err(
      new RangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_CONVERSION_FAILED,
        message,
        functionName: FUNCTION_NAME,
        cause: error instanceof Error ? error : undefined,
      }),
    );
  }

  // Generate the link
  const formatOptions: FormatOptions = { linkType };
  const result = formatLink(referencePath, inputSelection, delimiters, formatOptions);

  if (!result.success) {
    logger.error({ fn: FUNCTION_NAME, error: result.error }, 'formatLink failed');
    return result;
  }

  logger.debug(
    { fn: FUNCTION_NAME, link: result.value.link },
    `Generated ${linkType} link: ${result.value.link}`,
  );

  return result;
};
