import { Logger } from '../Logger';
import { setLogger } from '../LogManager';
import { NoOpLogger } from '../NoOpLogger';
import { pingLog } from '../pingLog';

describe('pingLog', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    // Create fresh mock logger for each test
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  afterEach(() => {
    // Reset to default logger after each test
    setLogger(new NoOpLogger());
  });

  it('should exercise all logger levels (DEBUG, INFO, WARN, ERROR)', () => {
    setLogger(mockLogger);
    pingLog();

    // Verify all 4 levels were called with correct messages
    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'pingLog' }, 'Ping for DEBUG');
    expect(mockLogger.info).toHaveBeenCalledWith({ fn: 'pingLog' }, 'Ping for INFO');
    expect(mockLogger.warn).toHaveBeenCalledWith({ fn: 'pingLog' }, 'Ping for WARN');
    expect(mockLogger.error).toHaveBeenCalledWith({ fn: 'pingLog' }, 'Ping for ERROR');
  });

  it('should call each logger level exactly once', () => {
    setLogger(mockLogger);
    pingLog();

    expect(mockLogger.debug).toHaveBeenCalledTimes(2); // Once from setLogger, once from pingLog
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });

  it('should use the current logger from LogManager', () => {
    const firstLogger = { ...mockLogger }; // Use mockLogger for first
    const secondLogger: Logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Set first logger and call pingLog
    setLogger(firstLogger);
    pingLog();

    // Verify first logger was used
    expect(firstLogger.debug).toHaveBeenCalledWith({ fn: 'pingLog' }, 'Ping for DEBUG');

    // Change to second logger and call pingLog again
    setLogger(secondLogger);
    pingLog();

    // Verify second logger was used (not first)
    expect(secondLogger.debug).toHaveBeenCalledWith({ fn: 'pingLog' }, 'Ping for DEBUG');
    // First logger should not have been called again
    expect(firstLogger.debug).toHaveBeenCalledTimes(2); // Only initial call from setLogger + pingLog
  });

  it('should work with NoOpLogger without errors', () => {
    // This tests that pingLog doesn't throw when using NoOpLogger
    setLogger(new NoOpLogger());
    expect(() => pingLog()).not.toThrow();
  });
});
