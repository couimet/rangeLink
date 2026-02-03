import type { Logger } from 'barebone-logger';

import { ContentEligibilityChecker } from './ContentEligibilityChecker';
import type { EligibilityChecker } from './EligibilityChecker';

/**
 * Factory for creating EligibilityChecker instances.
 *
 * Encapsulates the creation of eligibility checking strategies, providing
 * a clean API for destination builders to create checkers without
 * knowing implementation details.
 *
 * All destinations use ContentEligibilityChecker since empty content
 * is never useful to paste to any destination.
 */
export class EligibilityCheckerFactory {
  constructor(private readonly logger: Logger) {}

  /**
   * Create a content eligibility checker.
   *
   * Validates that content is non-empty and not whitespace-only.
   * Used by ALL destination types for consistent content validation.
   *
   * @returns New ContentEligibilityChecker instance
   */
  createContentEligibilityChecker(): EligibilityChecker {
    return new ContentEligibilityChecker(this.logger);
  }
}
