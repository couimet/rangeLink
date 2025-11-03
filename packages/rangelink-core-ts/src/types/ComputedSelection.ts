import { RangeFormat } from './RangeFormat';
import { SelectionType } from './SelectionType';

/**
 * Result of analyzing a selection for link generation.
 * Contains 1-based line/position numbers ready for formatting.
 */
export interface ComputedSelection {
  readonly startLine: number;
  readonly endLine: number;
  readonly startPosition?: number;
  readonly endPosition?: number;
  readonly rangeFormat: RangeFormat;
  readonly selectionType: SelectionType;
}
