import { createMockLogger } from 'barebone-logger-testing';

import { AlwaysEligibleChecker } from '../../../destinations/capabilities/AlwaysEligibleChecker';

describe('AlwaysEligibleChecker', () => {
  const mockLogger = createMockLogger();
  const testContext = { fn: 'test' };

  describe('isEligible()', () => {
    it('should always return true', async () => {
      const checker = new AlwaysEligibleChecker(mockLogger);

      const result = await checker.isEligible('test text', testContext);

      expect(result).toStrictEqual(true);
    });

    it('should return true for empty string', async () => {
      const checker = new AlwaysEligibleChecker(mockLogger);

      const result = await checker.isEligible('', testContext);

      expect(result).toStrictEqual(true);
    });

    it('should return true for whitespace-only text', async () => {
      const checker = new AlwaysEligibleChecker(mockLogger);

      const result = await checker.isEligible('   \n\t  ', testContext);

      expect(result).toStrictEqual(true);
    });

    it('should log debug message', async () => {
      const checker = new AlwaysEligibleChecker(mockLogger);

      await checker.isEligible('test text', testContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test' },
        'Eligibility check: always eligible',
      );
    });
  });
});
