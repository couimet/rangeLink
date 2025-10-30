import { DelimiterConfig } from '../types/DelimiterConfig';

/**
 * Default delimiter configuration.
 * These are the GitHub-inspired defaults used when no custom configuration is provided.
 */
export const DEFAULT_DELIMITERS: DelimiterConfig = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
} as const;

