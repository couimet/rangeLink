import type { Logger, LoggingContext } from 'barebone-logger';

import { isEligibleForPaste } from '../../utils';

import type { EligibilityChecker } from './EligibilityChecker';

/**
 * Validates content eligibility for paste operations.
 *
 * Rejects undefined/null and empty strings. Whitespace-only content is
 * allowed — it may be an intentional selection from terminal output or
 * code formatting.
 *
 * Used by ALL paste destinations for consistent content validation.
 */
export class ContentEligibilityChecker implements EligibilityChecker {
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
