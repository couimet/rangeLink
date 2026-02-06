/**
 * Factory that creates insert functions for a specific target type.
 *
 * Decouples insert logic from focus logic. Dependencies (ideAdapter, logger)
 * are injected via constructor. The forTarget method returns an insert
 * function bound to the provided target.
 *
 * @template T - The target type (Terminal, TextEditor, or void for AI assistants)
 */
export interface InsertFactory<T> {
  forTarget(target?: T): (text: string) => Promise<boolean>;
}
