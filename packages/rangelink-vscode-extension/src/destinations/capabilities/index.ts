/**
 * Barrel export for destination capabilities.
 *
 * Capabilities enable composition-based destinations by providing
 * pluggable implementations of common behaviors:
 * - TextInserter: Insert text via different mechanisms
 * - EligibilityChecker: Validate paste eligibility
 * - FocusManager: Manage destination focus
 *
 * Factories provide IoC-friendly creation of capabilities:
 * - TextInserterFactory: Create text inserters with injected dependencies
 * - EligibilityCheckerFactory: Create eligibility checkers with singleton optimization
 * - FocusManagerFactory: Create focus managers with injected dependencies
 */

// ============================================================================
// TextInserter: Text insertion strategies
// ============================================================================

export type { TextInserter } from './TextInserter';
export { ClipboardTextInserter } from './ClipboardTextInserter';
export { NativeCommandTextInserter } from './NativeCommandTextInserter';
export { EditorTextInserter } from './EditorTextInserter';
export { TextInserterFactory } from './TextInserterFactory';

// ============================================================================
// EligibilityChecker: Paste eligibility validation
// ============================================================================

export type { EligibilityChecker } from './EligibilityChecker';
export { AlwaysEligibleChecker } from './AlwaysEligibleChecker';
export { SelfPasteChecker } from './SelfPasteChecker';
export { EligibilityCheckerFactory } from './EligibilityCheckerFactory';

// ============================================================================
// FocusManager: Destination focus management
// ============================================================================

export type { FocusManager } from './FocusManager';
export { TerminalFocusManager } from './TerminalFocusManager';
export { EditorFocusManager } from './EditorFocusManager';
export { CommandFocusManager } from './CommandFocusManager';
export { FocusManagerFactory } from './FocusManagerFactory';
