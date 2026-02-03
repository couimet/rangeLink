/**
 * Barrel export for destination capabilities.
 *
 * Capabilities enable composition-based destinations by providing
 * pluggable implementations of common behaviors:
 * - PasteExecutor: Unified focus + insert for destinations
 * - EligibilityChecker: Validate paste eligibility
 *
 * Factories provide IoC-friendly creation of capabilities:
 * - PasteExecutorFactory: Create paste executors with injected dependencies
 * - EligibilityCheckerFactory: Create eligibility checkers with singleton optimization
 */

// ============================================================================
// EligibilityChecker: Paste eligibility validation
// ============================================================================

export type { EligibilityChecker } from './EligibilityChecker';
export { ContentEligibilityChecker } from './ContentEligibilityChecker';
export { EligibilityCheckerFactory } from './EligibilityCheckerFactory';

// ============================================================================
// PasteExecutor: Unified focus + insert capability
// ============================================================================

export type { PasteExecutor, FocusResult, FocusSuccess, FocusError } from './PasteExecutor';
export { FocusErrorReason } from './PasteExecutor';
export { CommandPasteExecutor } from './CommandPasteExecutor';
export { EditorPasteExecutor } from './EditorPasteExecutor';
export { TerminalPasteExecutor } from './TerminalPasteExecutor';
export { PasteExecutorFactory } from './PasteExecutorFactory';
