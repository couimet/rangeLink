import type { Logger } from 'barebone-logger';
import {
  DelimiterConfig,
  formatLink,
  type FormattedLink,
  type FormatOptions,
  LinkType,
  Result,
} from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
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
 * @returns Result.ok(FormattedLink) on success, Result.err on failure
 */
export const generateLinkFromSelections = (
  options: GenerateLinkOptions,
): Result<FormattedLink, RangeLinkExtensionError> => {
  const { referencePath, document, selections, delimiters, linkType, logger } = options;

  if (selections.length === 0) {
    logger.debug({ fn: FUNCTION_NAME }, 'No selections provided');
    return Result.err(
      new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.GENERATE_LINK_NO_SELECTION,
        message: 'No selection provided',
        functionName: FUNCTION_NAME,
      }),
    );
  }

  if (selections.every((s) => s.isEmpty)) {
    logger.debug({ fn: FUNCTION_NAME }, 'All selections are empty');
    return Result.err(
      new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.GENERATE_LINK_SELECTION_EMPTY,
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
      new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.GENERATE_LINK_SELECTION_CONVERSION_FAILED,
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
    return Result.err(
      new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.GENERATE_LINK_FORMAT_FAILED,
        message: result.error.message,
        functionName: FUNCTION_NAME,
        cause: result.error,
      }),
    );
  }

  logger.debug(
    { fn: FUNCTION_NAME, link: result.value.link },
    `Generated ${linkType} link: ${result.value.link}`,
  );

  return Result.ok(result.value);
};
