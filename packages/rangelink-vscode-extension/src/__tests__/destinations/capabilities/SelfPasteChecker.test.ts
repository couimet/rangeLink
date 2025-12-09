import { createMockLogger } from 'barebone-logger-testing';

// Mock the isEligibleForPaste utility
jest.mock('../../../utils/isEligibleForPaste');

import { isEligibleForPaste } from '../../../utils/isEligibleForPaste';
import { SelfPasteChecker } from '../../../destinations/capabilities/SelfPasteChecker';

describe('SelfPasteChecker', () => {
  const mockLogger = createMockLogger();
  const testContext = { fn: 'test' };

  describe('isEligible()', () => {
    it('should delegate to isEligibleForPaste utility', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);

      const checker = new SelfPasteChecker(mockLogger);

      await checker.isEligible('test text', testContext);

      expect(isEligibleForPaste).toHaveBeenCalledTimes(1);
      expect(isEligibleForPaste).toHaveBeenCalledWith('test text');
    });

    it('should return true when utility returns true', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);

      const checker = new SelfPasteChecker(mockLogger);

      const result = await checker.isEligible('test text', testContext);

      expect(result).toStrictEqual(true);
    });

    it('should return false when utility returns false', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);

      const checker = new SelfPasteChecker(mockLogger);

      const result = await checker.isEligible('', testContext);

      expect(result).toStrictEqual(false);
    });

    it('should not log when content is eligible', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(true);

      const checker = new SelfPasteChecker(mockLogger);

      await checker.isEligible('test text', testContext);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should log when content is not eligible', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);

      const checker = new SelfPasteChecker(mockLogger);

      await checker.isEligible('', testContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test', contentLength: 0 },
        'Content not eligible for paste',
      );
    });

    it('should include content length in log', async () => {
      (isEligibleForPaste as jest.Mock).mockReturnValue(false);

      const checker = new SelfPasteChecker(mockLogger);

      await checker.isEligible('   ', testContext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'test', contentLength: 3 },
        'Content not eligible for paste',
      );
    });
  });
});
