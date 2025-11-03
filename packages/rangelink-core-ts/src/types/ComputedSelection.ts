import { RangeFormat } from './RangeFormat';

/**
 * Result of analyzing a selection for link generation.
 * Contains 1-based line/position numbers and computed formatting decisions.
 */
export interface ComputedSelection {
  readonly startLine: number;
  readonly endLine: number;
  readonly startPosition?: number;
  readonly endPosition?: number;
  readonly rangeFormat: RangeFormat;
}
