import type { Logger, LoggingContext } from 'barebone-logger';

import type { EligibilityChecker } from './EligibilityChecker';

/**
 * Always returns eligible (no validation).
 *
 * Used by:
 * - Terminal, Claude Code, Cursor AI: No content validation required
 */
export class AlwaysEligibleChecker implements EligibilityChecker {
  constructor(private readonly logger: Logger) {}

  async isEligible(_text: string, context: LoggingContext): Promise<boolean> {
    this.logger.debug({ ...context }, 'Eligibility check: always eligible');
    return true;
  }
}
