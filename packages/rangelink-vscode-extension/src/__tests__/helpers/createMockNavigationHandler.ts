/**
 * Create a mock RangeLinkNavigationHandler for testing provider orchestration.
 */

import type { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';

/**
 * Test pattern that matches common RangeLink formats for provider integration tests.
 *
 * Provider tests don't validate pattern correctness (handler's responsibility) - they
 * test orchestration logic (delegation to handler methods).
 *
 * Pattern matches: `[path]#[range]` or `[path]##[range]` where:
 * - `path` is non-whitespace characters
 * - `range` is L followed by digits, optional C and digits, optional dash and second position
 *
 * Examples:
 * - `src/file.ts#L10`
 * - `src/file.ts#L10C5`
 * - `src/file.ts#L10-L20`
 * - `src/file.ts##L10C5-L20C10` (rectangular)
 */
const TEST_RANGELINK_PATTERN = /\S+##?L\d+(C\d+)?(-L\d+(C\d+)?)?/g;

/**
 * Create a mock RangeLinkNavigationHandler for provider tests.
 *
 * Mocks all handler methods to focus tests on provider orchestration logic.
 * Tests verify delegation patterns, not handler implementation details.
 *
 * **Always creates default mocks and spreads options as overrides** - no clever detection.
 * This predictable pattern allows partial overrides while preserving defaults:
 * ```typescript
 * createMockNavigationHandler({ parseLink: myCustomMock })  // Gets defaults for other methods
 * ```
 *
 * @param options - Optional method overrides
 * @returns Mock navigation handler
 */
export const createMockNavigationHandler = (
  options?: Partial<jest.Mocked<RangeLinkNavigationHandler>>,
): jest.Mocked<RangeLinkNavigationHandler> =>
  ({
    getPattern: jest.fn(() => TEST_RANGELINK_PATTERN),
    parseLink: jest.fn(),
    formatTooltip: jest.fn(),
    navigateToLink: jest.fn().mockResolvedValue(undefined),
    ...options,
  }) as unknown as jest.Mocked<RangeLinkNavigationHandler>;
