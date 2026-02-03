import { createMockLogger } from 'barebone-logger-testing';

import { ContentEligibilityChecker } from '../../../destinations/capabilities/ContentEligibilityChecker';
import { EligibilityCheckerFactory } from '../../../destinations/capabilities/EligibilityCheckerFactory';

describe('EligibilityCheckerFactory', () => {
  const mockLogger = createMockLogger();

  describe('createContentEligibilityChecker()', () => {
    it('should return ContentEligibilityChecker instance', () => {
      const factory = new EligibilityCheckerFactory(mockLogger);

      const checker = factory.createContentEligibilityChecker();

      expect(checker).toBeInstanceOf(ContentEligibilityChecker);
    });

    it('should create new instance on each call', () => {
      const factory = new EligibilityCheckerFactory(mockLogger);

      const checker1 = factory.createContentEligibilityChecker();
      const checker2 = factory.createContentEligibilityChecker();

      expect(checker1).not.toBe(checker2);
      expect(checker1).toBeInstanceOf(ContentEligibilityChecker);
      expect(checker2).toBeInstanceOf(ContentEligibilityChecker);
    });
  });
});
