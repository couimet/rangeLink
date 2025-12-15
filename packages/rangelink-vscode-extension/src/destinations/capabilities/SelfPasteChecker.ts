import type { Logger, LoggingContext } from 'barebone-logger';

import { isEligibleForPaste } from '../../utils';

import type { EligibilityChecker } from './EligibilityChecker';

/**
 * Checks eligibility using isEligibleForPaste utility.
 *
 * Used by:
 * - TextEditor, GitHub Copilot: Validates content before paste
 */
export class SelfPasteChecker implements EligibilityChecker {
  constructor(private readonly logger: Logger) {}

  async isEligible(text: string, context: LoggingContext): Promise<boolean> {
    const eligible = isEligibleForPaste(text);

    if (!eligible) {
      this.logger.info(
        { ...context, contentLength: text.length },
        'Content not eligible for paste',
      );
    }

    return eligible;
  }
}
