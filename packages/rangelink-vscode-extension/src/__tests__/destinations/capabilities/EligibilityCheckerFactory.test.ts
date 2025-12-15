import { createMockLogger } from 'barebone-logger-testing';

import { AlwaysEligibleChecker } from '../../../destinations/capabilities/AlwaysEligibleChecker';
import { EligibilityCheckerFactory } from '../../../destinations/capabilities/EligibilityCheckerFactory';
import { SelfPasteChecker } from '../../../destinations/capabilities/SelfPasteChecker';

describe('EligibilityCheckerFactory', () => {
  const mockLogger = createMockLogger();

  describe('createAlwaysEligible()', () => {
    it('should return AlwaysEligibleChecker instance', () => {
      const factory = new EligibilityCheckerFactory(mockLogger);

      const checker = factory.createAlwaysEligible();

      expect(checker).toBeInstanceOf(AlwaysEligibleChecker);
    });

    it('should return same singleton instance on multiple calls', () => {
      const factory = new EligibilityCheckerFactory(mockLogger);

      const checker1 = factory.createAlwaysEligible();
      const checker2 = factory.createAlwaysEligible();
      const checker3 = factory.createAlwaysEligible();

      expect(checker1).toBe(checker2);
      expect(checker2).toBe(checker3);
    });

    it('should create singleton at construction time', () => {
      const factory1 = new EligibilityCheckerFactory(mockLogger);
      const factory2 = new EligibilityCheckerFactory(mockLogger);

      const checker1 = factory1.createAlwaysEligible();
      const checker2 = factory2.createAlwaysEligible();

      // Different factory instances have different singletons
      expect(checker1).not.toBe(checker2);
      expect(checker1).toBeInstanceOf(AlwaysEligibleChecker);
      expect(checker2).toBeInstanceOf(AlwaysEligibleChecker);
    });

    it('should return checker that always returns true', async () => {
      const factory = new EligibilityCheckerFactory(mockLogger);

      const checker = factory.createAlwaysEligible();
      const result = await checker.isEligible('any content', { fn: 'test' });

      expect(result).toBe(true);
    });
  });

  describe('createSelfPasteChecker()', () => {
    it('should return SelfPasteChecker instance', () => {
      const factory = new EligibilityCheckerFactory(mockLogger);

      const checker = factory.createSelfPasteChecker();

      expect(checker).toBeInstanceOf(SelfPasteChecker);
    });

    it('should create new instance on each call', () => {
      const factory = new EligibilityCheckerFactory(mockLogger);

      const checker1 = factory.createSelfPasteChecker();
      const checker2 = factory.createSelfPasteChecker();

      expect(checker1).not.toBe(checker2);
      expect(checker1).toBeInstanceOf(SelfPasteChecker);
      expect(checker2).toBeInstanceOf(SelfPasteChecker);
    });
  });

  describe('factory reuse', () => {
    it('should create different checker types from same factory', () => {
      const factory = new EligibilityCheckerFactory(mockLogger);

      const alwaysEligible = factory.createAlwaysEligible();
      const selfPaste = factory.createSelfPasteChecker();

      expect(alwaysEligible).toBeInstanceOf(AlwaysEligibleChecker);
      expect(selfPaste).toBeInstanceOf(SelfPasteChecker);
      expect(alwaysEligible).not.toBe(selfPaste);
    });
  });
});
