/**
 * Create a mock FormattedLink for testing
 */

import type {
  ComputedSelection,
  DelimiterConfig,
  FormattedLink,
  RangeFormat,
  SelectionType,
} from 'rangelink-core-ts';
import { LinkType } from 'rangelink-core-ts';

/**
 * Create a mock FormattedLink for testing
 *
 * Provides sensible defaults for all required properties. Individual properties
 * can be overridden via the partial parameter.
 *
 * @param link - The RangeLink string (default: 'test-link')
 * @param overrides - Optional partial FormattedLink to override defaults
 * @returns Mock FormattedLink with all required properties
 */
export const createMockFormattedLink = (
  link = 'test-link',
  overrides: Partial<FormattedLink> = {},
): FormattedLink => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    range: '-',
    hash: '#',
  };

  const defaultSelection: ComputedSelection = {
    startLine: 1,
    startPosition: 1,
    endLine: 1,
    endPosition: 10,
    rangeFormat: 'LineOnly' as RangeFormat,
  };

  return {
    link,
    rawLink: link,
    linkType: LinkType.Regular,
    delimiters: defaultDelimiters,
    computedSelection: defaultSelection,
    rangeFormat: 'LineOnly' as RangeFormat,
    selectionType: 'Normal' as SelectionType,
    ...overrides,
  };
};
