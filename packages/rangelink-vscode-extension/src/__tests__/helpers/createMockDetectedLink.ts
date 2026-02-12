import { LinkType, SelectionType } from 'rangelink-core-ts';
import type { DetectedLink, ParsedLink } from 'rangelink-core-ts';

const DEFAULT_PARSED: ParsedLink = {
  path: 'src/file.ts',
  quotedPath: 'src/file.ts',
  start: { line: 10 },
  end: { line: 10 },
  linkType: LinkType.Regular,
  selectionType: SelectionType.Normal,
};

export const createMockDetectedLink = (overrides?: Partial<DetectedLink>): DetectedLink => ({
  linkText: 'src/file.ts#L10',
  startIndex: 6,
  length: 15,
  parsed: DEFAULT_PARSED,
  ...overrides,
});
