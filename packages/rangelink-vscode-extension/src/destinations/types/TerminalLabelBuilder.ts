import type { EligibleTerminal } from '../../types';

/**
 * Callback type for building terminal picker item labels.
 * Accepts an EligibleTerminal and returns the display label string.
 */
export type TerminalLabelBuilder = (terminal: EligibleTerminal) => string;
