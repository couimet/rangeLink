import { getLogger } from './LogManager';

/**
 * Exercise all logger levels to verify the communication channel is working.
 *
 * This is primarily used by extension tests to confirm that the core library's
 * logger is properly bound to the extension's output channel. When called, it
 * emits test messages at all four log levels (DEBUG, INFO, WARN, ERROR).
 *
 * The extension can observe its outputChannel to verify all messages are received,
 * confirming the core → outputChannel binding is functioning correctly.
 *
 * **Design Note:** This is a standalone function (not a Logger method) to keep
 * the Logger interface clean and avoid feature coupling. It simply exercises
 * the existing Logger interface without adding new methods.
 *
 * @example
 * ```typescript
 * // In extension tests
 * const mockOutputChannel = { appendLine: jest.fn() };
 * const logger = new VSCodeLogger(mockOutputChannel);
 * setLogger(logger);
 *
 * pingLog(); // Exercise all log levels
 *
 * // Verify messages were received
 * expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
 *   expect.stringContaining('Ping for DEBUG')
 * );
 * ```
 */
export const pingLog = (): void => {
  const logger = getLogger();
  const context = { fn: 'pingLog' };

  logger.debug(context, 'Ping for DEBUG');
  logger.info(context, 'Ping for INFO');
  logger.warn(context, 'Ping for WARN');
  logger.error(context, 'Ping for ERROR');
};
