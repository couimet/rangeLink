import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import type { RangeLinkNavigationHandler } from '../navigation/RangeLinkNavigationHandler';
import { MessageCode } from '../types';
import { formatMessage } from '../utils';

import type { Logger } from '@couimet/logger-contract';

/**
 * Command handler for going to a RangeLink entered via input box.
 *
 * Allows users to paste or type a RangeLink in the Command Palette and
 * go directly to it. Complements existing navigation via terminal
 * and document link clicking.
 */
export class GoToRangeLinkCommand {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly navigationHandler: RangeLinkNavigationHandler,
    private readonly logger: Logger,
  ) {
    this.logger.debug({ fn: 'GoToRangeLinkCommand.constructor' }, 'GoToRangeLinkCommand initialized');
  }

  async execute(): Promise<void> {
    const logCtx = { fn: 'GoToRangeLinkCommand.execute' };

    this.logger.debug(logCtx, 'Showing input box for RangeLink');

    const input = await this.ideAdapter.showInputBox({
      prompt: formatMessage(MessageCode.INFO_NAVIGATION_INPUT_BOX_PROMPT),
      placeHolder: formatMessage(MessageCode.INFO_NAVIGATION_INPUT_BOX_PLACEHOLDER),
    });

    if (input === undefined) {
      this.logger.debug(logCtx, 'User cancelled input');
      return;
    }

    const trimmedInput = input.trim();

    if (trimmedInput === '') {
      this.logger.debug(logCtx, 'Empty input provided');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.INFO_NAVIGATION_EMPTY_INPUT));
      return;
    }

    this.logger.debug({ ...logCtx, input: trimmedInput }, 'Parsing RangeLink');

    const numericResult = this.navigationHandler.parseLink(trimmedInput);

    if (numericResult.success) {
      this.logger.debug({ ...logCtx, parsed: numericResult.value }, 'Navigating to link');
      await this.navigationHandler.navigateToLink(numericResult.value, trimmedInput);
      return;
    }

    const textResult = this.navigationHandler.parseHighlightLinkText(trimmedInput);

    if (!textResult.success) {
      this.logger.debug({ ...logCtx, input, trimmedInput, error: textResult.error }, 'Invalid link format');
      this.ideAdapter.showErrorMessage(formatMessage(MessageCode.INFO_NAVIGATION_INVALID_LINK, { input: trimmedInput }));
      return;
    }

    this.logger.debug({ ...logCtx, parsed: textResult.value }, 'Navigating to text highlight link');

    await this.navigationHandler.navigateToTextLink(textResult.value, trimmedInput);
  }
}
