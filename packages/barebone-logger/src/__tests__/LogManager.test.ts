import { Logger } from '../Logger';
import { getLogger, setLogger } from '../LogManager';
import { NoOpLogger } from '../NoOpLogger';

describe('LogManager', () => {
  it('should return NoOpLogger by default', () => {
    const logger = getLogger();
    expect(logger).toBeInstanceOf(NoOpLogger);
  });

  it('should allow setting a custom logger', () => {
    const mockLogger: Logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    setLogger(mockLogger);
    const logger = getLogger();
    expect(logger).toBe(mockLogger);

    // Reset to default
    setLogger(new NoOpLogger());
  });

  it('should use the custom logger for logging', () => {
    const mockLogger: Logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    setLogger(mockLogger);
    const logger = getLogger();

    logger.info({ fn: 'test' }, 'test message');
    expect(mockLogger.info).toHaveBeenCalledWith({ fn: 'test' }, 'test message');

    // Reset to default
    setLogger(new NoOpLogger());
  });

  it('should call debug() immediately when logger is set to confirm initialization', () => {
    const mockLogger: Logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    setLogger(mockLogger);

    // Verify debug was called immediately with initialization message
    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'setLogger' }, 'Logger initialized');

    // Reset to default
    setLogger(new NoOpLogger());
  });
});
