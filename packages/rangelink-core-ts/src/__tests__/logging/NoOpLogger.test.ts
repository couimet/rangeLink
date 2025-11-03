import { NoOpLogger } from '../../logging/NoOpLogger';

describe('NoOpLogger', () => {
  it('should not throw when calling debug', () => {
    const logger = new NoOpLogger();
    expect(() => logger.debug({ fn: 'test' }, 'message')).not.toThrow();
  });

  it('should not throw when calling info', () => {
    const logger = new NoOpLogger();
    expect(() => logger.info({ fn: 'test' }, 'message')).not.toThrow();
  });

  it('should not throw when calling warn', () => {
    const logger = new NoOpLogger();
    expect(() => logger.warn({ fn: 'test' }, 'message')).not.toThrow();
  });

  it('should not throw when calling error', () => {
    const logger = new NoOpLogger();
    expect(() => logger.error({ fn: 'test' }, 'message')).not.toThrow();
  });
});
