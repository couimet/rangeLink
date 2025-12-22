import { DEFAULT_DELIMITERS, buildLinkPattern, parseLink, Result } from 'rangelink-core-ts';
import type { ParsedLink, RangeLinkError } from 'rangelink-core-ts';

import type { RangeLinkParser } from '../../RangeLinkParser';
import { formatLinkTooltip } from '../../utils';

export interface MockRangeLinkParserOverrides {
  getPattern?: jest.Mock<RegExp>;
  parseLink?: jest.Mock<Result<ParsedLink, RangeLinkError>, [string]>;
  formatTooltip?: jest.Mock<string | undefined, [ParsedLink]>;
}

/**
 * Creates a mock RangeLinkParser with working default implementations.
 *
 * Default behavior uses real parsing logic from rangelink-core-ts,
 * making it suitable for integration-style tests. Override specific
 * methods for unit tests that need controlled behavior.
 */
export const createMockRangeLinkParser = (
  overrides?: MockRangeLinkParserOverrides,
): jest.Mocked<RangeLinkParser> => {
  const pattern = buildLinkPattern(DEFAULT_DELIMITERS);

  const baseMock = {
    getPattern: jest.fn(() => pattern),
    parseLink: jest.fn((linkText: string) => parseLink(linkText, DEFAULT_DELIMITERS)),
    formatTooltip: jest.fn((parsed: ParsedLink) => formatLinkTooltip(parsed)),
  };

  return {
    ...baseMock,
    ...overrides,
  } as unknown as jest.Mocked<RangeLinkParser>;
};

export type MockRangeLinkParser = ReturnType<typeof createMockRangeLinkParser>;
