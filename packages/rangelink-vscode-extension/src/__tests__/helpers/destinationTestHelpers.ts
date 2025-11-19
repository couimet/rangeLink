/**
 * Common test utilities for PasteDestination implementations
 *
 * Provides reusable test patterns to ensure all destinations follow the same
 * contract and behavior. Reduces duplication across destination test files.
 */

import type { Logger } from 'barebone-logger';

import type { PasteDestination } from '../../destinations/PasteDestination';

import { createMockFormattedLink } from './createMockFormattedLink';

/**
 * Test logging behavior for a destination
 *
 * Verifies that destinations log appropriately for debugging:
 * - Debug logs for availability checks
 * - Info logs for successful pastes
 * - Warn/error logs for failures
 *
 * @param mockLogger - The mock logger instance
 * @param loggerCalls - Expected logger method calls with contexts
 */
export const testDestinationLogging = (
  mockLogger: Logger,
  loggerCalls: {
    method: 'debug' | 'info' | 'warn' | 'error';
    expectedContext: Record<string, unknown>;
    expectedMessage: string;
  }[],
): void => {
  describe('Logging', () => {
    loggerCalls.forEach(({ method, expectedContext, expectedMessage }, index) => {
      it(`should log via ${method} (call ${index + 1})`, () => {
        expect(mockLogger[method]).toHaveBeenCalledWith(
          expect.objectContaining(expectedContext),
          expectedMessage,
        );
      });
    });
  });
};

/**
 * Test paste return values
 *
 * Verifies that pasteLink() returns correct boolean values:
 * - true on success
 * - false on failure (not available, error, etc.)
 *
 * @param destination - The destination instance
 * @param successScenario - Function that sets up successful paste
 * @param failureScenario - Function that sets up failed paste
 */
export const testPasteReturnValues = (
  destination: PasteDestination,
  successScenario: () => Promise<void>,
  failureScenario: () => Promise<void>,
): void => {
  describe('pasteLink() return values', () => {
    it('should return true on successful paste', async () => {
      await successScenario();
      const result = await destination.pasteLink(createMockFormattedLink('test'));
      expect(result).toBe(true);
    });

    it('should return false when destination not available', async () => {
      await failureScenario();
      const result = await destination.pasteLink(createMockFormattedLink('test'));
      expect(result).toBe(false);
    });
  });
};

/**
 * Test isAvailable() behavior
 *
 * Verifies that isAvailable() returns correct boolean values based on state.
 *
 * @param destination - The destination instance
 * @param availableScenario - Function that makes destination available
 * @param unavailableScenario - Function that makes destination unavailable
 */
export const testIsAvailableBehavior = (
  destination: PasteDestination,
  availableScenario: () => Promise<void>,
  unavailableScenario: () => Promise<void>,
): void => {
  describe('isAvailable()', () => {
    it('should return true when destination is available', async () => {
      await availableScenario();
      expect(await destination.isAvailable()).toBe(true);
    });

    it('should return false when destination is not available', async () => {
      await unavailableScenario();
      expect(await destination.isAvailable()).toBe(false);
    });
  });
};
