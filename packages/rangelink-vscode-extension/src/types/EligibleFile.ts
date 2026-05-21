import type { TextEditorBindOptions } from './BindOptions';
import type { BoundState } from './BoundState';

/**
 * Information about a file eligible for binding.
 * Derived from tab group enumeration — no editor field because tabs don't
 * have editors. Editors are resolved at bind time via
 * `ideAdapter.findVisibleEditorsByUri()`.
 */
export interface EligibleFile {
  readonly bindOptions: TextEditorBindOptions;
  readonly filename: string;
  readonly displayPath: string;
  readonly viewColumn: number;
  readonly isCurrentInGroup: boolean;
  readonly isActiveEditor: boolean;
  readonly boundState?: BoundState;
}
