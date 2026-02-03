import type { Logger, LoggingContext } from 'barebone-logger';

import { isEligibleForPaste } from '../../utils';

import type { EligibilityChecker } from './EligibilityChecker';

/**
 * Validates content eligibility for paste operations.
 *
 * Rejects empty or whitespace-only content since pasting such content
 * provides no value to any destination (terminal, text editor, or AI assistant).
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
