import type { Logger } from 'barebone-logger';
import {
  DelimiterConfig,
  formatLink,
  type FormattedLink,
  FormatOptions,
  LinkType,
  Result,
} from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { ExtensionResult } from '../types';

import { toInputSelection } from './toInputSelection';

/**
 * Options for generating a link from editor selections.
 */
export interface GenerateLinkFromSelectionsOptions {
  /**
   * The reference path to include in the link (workspace-relative or absolute).
   */
  referencePath: string;

  /**
   * The document containing the selections.
   */
  document: vscode.TextDocument;

  /**
   * The selections to generate a link from.
   */
  selections: readonly vscode.Selection[];

  /**
   * Delimiter configuration for link formatting.
   */
  delimiters: DelimiterConfig;

  /**
   * The type of link to generate (Regular or Portable).
   */
  linkType: LinkType;

  /**
   * Logger for debug/error output.
   */
  logger: Logger;
}

const FN_NAME = 'generateLinkFromSelections';

/**
 * Generates a FormattedLink from editor selections.
 *
 * This is a pure utility function that:
 * - Validates selections are not empty
 * - Converts VSCode selections to InputSelection format
 * - Formats the link using rangelink-core-ts
 *
 * The function does NOT show error messages - the caller is responsible
 * for presenting errors to the user appropriately.
 *
 * @param options - Configuration for link generation
 * @returns Result containing FormattedLink on success, or RangeLinkExtensionError on failure
 */
export const generateLinkFromSelections = (
  options: GenerateLinkFromSelectionsOptions,
): ExtensionResult<FormattedLink> => {
  const { referencePath, document, selections, delimiters, linkType, logger } = options;

  if (selections.length === 0) {
    const error = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.GENERATE_LINK_NO_SELECTION,
      message: 'No selections provided',
      functionName: FN_NAME,
    });
    logger.debug({ fn: FN_NAME }, 'No selections provided');
    return Result.err(error);
  }

  const hasNonEmptySelection = selections.some((s) => !s.isEmpty);
  if (!hasNonEmptySelection) {
    const error = new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.GENERATE_LINK_SELECTION_EMPTY,
      message: 'All selections are empty',
      functionName: FN_NAME,
    });
    logger.debug({ fn: FN_NAME }, 'All selections are empty');
    return Result.err(error);
  }

  let inputSelection;
  try {
    inputSelection = toInputSelection(document, selections);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process selection';
    logger.error({ fn: FN_NAME, error }, 'Failed to convert selections to InputSelection');
    return Result.err(
      new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.GENERATE_LINK_SELECTION_CONVERSION_FAILED,
        message,
        functionName: FN_NAME,
        cause: error instanceof Error ? error : undefined,
      }),
    );
  }

  const formatOptions: FormatOptions = { linkType };
  const result = formatLink(referencePath, inputSelection, delimiters, formatOptions);

  if (!result.success) {
    const linkTypeName = linkType === LinkType.Portable ? 'portable link' : 'link';
    logger.error({ fn: FN_NAME, errorCode: result.error }, `Failed to generate ${linkTypeName}`);
    return Result.err(
      new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.GENERATE_LINK_FORMAT_FAILED,
        message: `Failed to generate ${linkTypeName}`,
        functionName: FN_NAME,
        details: { formatError: result.error },
      }),
    );
  }

  logger.info({ fn: FN_NAME, formattedLink: result.value }, `Generated link: ${result.value.link}`);
  return Result.ok(result.value);
};
