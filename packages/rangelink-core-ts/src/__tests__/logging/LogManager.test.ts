import { getLogger, setLogger } from '../../logging/LogManager';
import { Logger } from '../../logging/Logger';
import { NoOpLogger } from '../../logging/NoOpLogger';

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
});

