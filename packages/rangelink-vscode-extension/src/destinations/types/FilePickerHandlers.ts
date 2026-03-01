import type { EligibleFile } from '../../types';

/**
 * Handler callbacks for file picker outcomes.
 * Callers provide only what varies: the action on selection,
 * the placeholder text, and optionally a dismiss handler.
 */
export interface FilePickerHandlers<T> {
  readonly onSelected: (file: EligibleFile) => T | Promise<T>;
  readonly onDismissed?: () => T | Promise<T>;
  readonly getPlaceholder: () => string;
}
