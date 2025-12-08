/**
 * Barrel export for destination capabilities.
 *
 * Capabilities enable composition-based destinations by providing
 * pluggable implementations of common behaviors:
 * - TextInserter: Insert text via different mechanisms
 * - EligibilityChecker: Validate paste eligibility
 * - FocusManager: Manage destination focus
 */

// ============================================================================
// TextInserter: Text insertion strategies
// ============================================================================

export type { TextInserter } from './TextInserter';
export { ClipboardTextInserter } from './ClipboardTextInserter';
export { NativeCommandTextInserter } from './NativeCommandTextInserter';
export { EditorTextInserter } from './EditorTextInserter';

// ============================================================================
// EligibilityChecker: Paste eligibility validation
// ============================================================================

export type { EligibilityChecker } from './EligibilityChecker';
export { AlwaysEligibleChecker } from './AlwaysEligibleChecker';
export { SelfPasteChecker } from './SelfPasteChecker';

// ============================================================================
// FocusManager: Destination focus management
// ============================================================================

export type { FocusManager } from './FocusManager';
export { TerminalFocusManager } from './TerminalFocusManager';
export { EditorFocusManager } from './EditorFocusManager';
export { CommandFocusManager } from './CommandFocusManager';
