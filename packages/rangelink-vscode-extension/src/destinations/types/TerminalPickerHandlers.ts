import type { EligibleTerminal } from '../../types';

/**
 * Handler callbacks for terminal picker outcomes.
 * Callers provide only what varies: the action on selection,
 * the placeholder text, and optionally a dismiss handler.
 */
export interface TerminalPickerHandlers<T> {
  readonly onSelected: (terminal: EligibleTerminal) => T | Promise<T>;
  readonly onDismissed?: () => T | Promise<T>;
  readonly getPlaceholder: () => string;
}
