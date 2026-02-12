/**
 * Create a mock RangeLinkNavigationHandler for testing provider orchestration.
 */

import type { RangeLinkNavigationHandler } from '../../navigation/RangeLinkNavigationHandler';

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
    parseLink: jest.fn(),
    navigateToLink: jest.fn().mockResolvedValue(undefined),
    ...options,
  }) as unknown as jest.Mocked<RangeLinkNavigationHandler>;
