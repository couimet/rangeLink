import type { LoggingContext } from 'barebone-logger';

/**
 * Checks if paste operation is eligible based on business rules.
 *
 * Used by:
 * - All destinations: Validate content before attempting paste
 */
export interface EligibilityChecker {
  /**
   * Check if paste operation is eligible.
   *
   * @param text - Text to check eligibility for
   * @param context - Logging context with function name and metadata
   * @returns Promise<boolean> - true if paste is eligible, false otherwise
   *
   * Implementations should:
   * - Return true if paste operation should proceed
   * - Return false if paste should be skipped (e.g., empty text, invalid content)
   * - Log reasons for ineligibility at appropriate levels
   * - NOT throw exceptions for control flow
   */
  isEligible(text: string, context: LoggingContext): Promise<boolean>;
}
