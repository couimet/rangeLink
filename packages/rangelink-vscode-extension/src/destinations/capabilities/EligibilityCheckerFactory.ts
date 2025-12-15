import type { Logger } from 'barebone-logger';

import { AlwaysEligibleChecker } from './AlwaysEligibleChecker';
import type { EligibilityChecker } from './EligibilityChecker';
import { SelfPasteChecker } from './SelfPasteChecker';

/**
 * Factory for creating EligibilityChecker instances.
 *
 * Encapsulates the creation of eligibility checking strategies, providing
 * a clean API for the DestinationRegistry to create checkers without
 * knowing implementation details.
 *
 * Optimization: AlwaysEligibleChecker is a singleton since it's stateless.
 *
 * Benefits:
 * - Centralizes dependency injection (logger)
 * - Singleton optimization for stateless checkers
 * - Simplifies destination builder code
 * - Enables easy mocking in tests
 */
export class EligibilityCheckerFactory {
  private readonly alwaysEligibleSingleton: AlwaysEligibleChecker;

  constructor(private readonly logger: Logger) {
    // Pre-create singleton for stateless checker
    this.alwaysEligibleSingleton = new AlwaysEligibleChecker(this.logger);
  }

  /**
   * Get the always-eligible checker (singleton).
   *
   * Used by destinations that don't need content validation
   * (Terminal, Claude Code, Cursor AI).
   *
   * @returns Shared AlwaysEligibleChecker instance
   */
  createAlwaysEligible(): EligibilityChecker {
    return this.alwaysEligibleSingleton;
  }

  /**
   * Create a self-paste checker.
   *
   * Used by destinations that need to prevent pasting content
   * from the same source (TextEditor, GitHub Copilot).
   *
   * @returns New SelfPasteChecker instance
   */
  createSelfPasteChecker(): EligibilityChecker {
    return new SelfPasteChecker(this.logger);
  }
}
