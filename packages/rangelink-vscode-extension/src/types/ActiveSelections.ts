import * as vscode from 'vscode';

/**
 * Value Object representing active text editor selections
 *
 * Encapsulates the active text editor and its selections in an immutable container.
 * Provides utility methods for filtering and validating selections.
 *
 * **Design decisions (from 0023-refactor-destination-sending-duplication.txt):**
 * - Immutable: readonly properties prevent modification after creation
 * - Factory pattern: Static `create()` method for construction
 * - Defensive: Handles undefined/null editor and selections gracefully
 * - Filtering: `getNonEmptySelections()` returns only non-empty selections
 *
 * **Usage:**
 * ```typescript
 * const activeSelections = ActiveSelections.create(editor);
 * const nonEmpty = activeSelections.getNonEmptySelections();
 * if (nonEmpty) {
 *   const editor = activeSelections.editor!; // Safe: getNonEmptySelections() guarantees editor
 *   // Use nonEmpty selections...
 * }
 * ```
 */
export class ActiveSelections {
  /**
   * The active text editor (if any)
   */
  readonly editor: vscode.TextEditor | undefined;

  /**
   * The editor's selections (empty array if no editor or no selections)
   */
  readonly selections: readonly vscode.Selection[];

  /**
   * Private constructor - use static `create()` factory method instead
   *
   * @param editor - The active text editor
   * @param selections - The editor's selections
   */
  private constructor(editor: vscode.TextEditor | undefined, selections: readonly vscode.Selection[]) {
    this.editor = editor;
    this.selections = selections;
  }

  /**
   * Factory method to create ActiveSelections instance
   *
   * Handles edge cases gracefully:
   * - undefined editor → empty selections
   * - null selections → empty selections
   * - undefined selections → empty selections
   *
   * @param editor - The active text editor (may be undefined)
   * @returns ActiveSelections instance with editor and normalized selections
   */
  static create(editor: vscode.TextEditor | undefined): ActiveSelections {
    // Handle undefined editor
    if (!editor) {
      return new ActiveSelections(undefined, []);
    }

    // Handle null/undefined selections (defensive programming)
    const selections = editor.selections ?? [];

    return new ActiveSelections(editor, selections);
  }

  /**
   * Get non-empty selections from the editor
   *
   * Filters out empty selections (cursor positions without ranges).
   * Returns undefined if:
   * - No editor exists
   * - Selections array is empty
   * - All selections are empty
   *
   * **Contract:** If this method returns non-undefined, `this.editor` is guaranteed to be defined.
   * Callers can safely use `activeSelections.editor!` after checking this method's result.
   *
   * @returns Array of non-empty selections, or undefined if none exist
   */
  getNonEmptySelections(): vscode.Selection[] | undefined {
    // No editor → no selections
    if (!this.editor) {
      return undefined;
    }

    // Empty selections array → undefined
    if (this.selections.length === 0) {
      return undefined;
    }

    // Filter out empty selections
    const nonEmpty = this.selections.filter((s) => !s.isEmpty);

    // All selections were empty → undefined
    if (nonEmpty.length === 0) {
      return undefined;
    }

    // Return new array (immutability - don't return internal reference)
    return [...nonEmpty];
  }
}
