/**
 * Configuration for delimiters used in RangeLink formatting.
 */
export interface DelimiterConfig {
  readonly line: string;
  readonly position: string;
  readonly hash: string;
  readonly range: string;
}

/**
 * Factory function that returns a fresh DelimiterConfig on each call.
 *
 * Enables dynamic configuration: consumers call the getter at usage time
 * rather than capturing a static snapshot at construction time.
 */
export type DelimiterConfigGetter = () => DelimiterConfig;
