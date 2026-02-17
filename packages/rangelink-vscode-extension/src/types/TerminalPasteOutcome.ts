/**
 * Discriminator for all terminal paste result types.
 *
 * Each literal must appear in exactly one TerminalPasteResult variant.
 */
export type TerminalPasteOutcome =
  | 'success'
  | 'no-active-terminal'
  | 'copy-command-failed'
  | 'clipboard-read-failed'
  | 'no-text-selected'
  | 'picker-cancelled'
  | 'self-paste';

/**
 * Result of a terminal paste operation.
 *
 * Indicates whether terminal text was successfully sent to the destination,
 * or the specific reason why the operation could not complete.
 * Failure variants that originate from caught exceptions carry the error.
 * Used by terminalLinkBridge() to gate follow-up user feedback.
 */
export type TerminalPasteResult =
  | { readonly outcome: Extract<TerminalPasteOutcome, 'success'> }
  | { readonly outcome: Extract<TerminalPasteOutcome, 'no-active-terminal'> }
  | {
      readonly outcome: Extract<TerminalPasteOutcome, 'copy-command-failed'>;
      readonly error: unknown;
    }
  | {
      readonly outcome: Extract<TerminalPasteOutcome, 'clipboard-read-failed'>;
      readonly error: unknown;
    }
  | { readonly outcome: Extract<TerminalPasteOutcome, 'no-text-selected'> }
  | { readonly outcome: Extract<TerminalPasteOutcome, 'picker-cancelled'> }
  | { readonly outcome: Extract<TerminalPasteOutcome, 'self-paste'> };
