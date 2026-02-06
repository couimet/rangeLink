import { supportedLocales } from '..';
import { MessageCode } from '../../types';

/**
 * Automated validation of locale completeness.
 *
 * Ensures all locales in supportedLocales registry have:
 * 1. Messages for all MessageCode enum values (no missing keys)
 * 2. No extra keys beyond MessageCode enum (no orphaned translations)
 *
 * Future enhancements (when needed):
 * - Placeholder consistency: {foo} in English must be in all locales
 * - Message length warnings: Flag translations significantly longer than English
 * - Missing placeholder warnings: Flag different placeholders across locales
 */
describe('Locale Completeness', () => {
  const allMessageCodes = Object.values(MessageCode);

  // Iterate over all supported locales
  Object.entries(supportedLocales).forEach(([locale, messages]) => {
    describe(`Locale: ${locale}`, () => {
      it('should have messages for all MessageCode values', () => {
        allMessageCodes.forEach((code) => {
          expect(messages[code]).toBeDefined();
          expect(messages[code]).not.toBe('');
        });
      });

      it('should not have extra keys beyond MessageCode enum', () => {
        const messageKeys = Object.keys(messages);
        messageKeys.forEach((key) => {
          expect(allMessageCodes).toContain(key);
        });
      });

      it('should have exactly the same number of keys as MessageCode enum', () => {
        const messageKeys = Object.keys(messages);
        expect(messageKeys).toHaveLength(allMessageCodes.length);
      });
    });
  });
});
