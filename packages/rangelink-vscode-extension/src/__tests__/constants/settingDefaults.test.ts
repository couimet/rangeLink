import {
  DEFAULT_DELIMITER_HASH,
  DEFAULT_DELIMITER_LINE,
  DEFAULT_DELIMITER_POSITION,
  DEFAULT_DELIMITER_RANGE,
  DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_START_DELAY_MS,
  DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_REFOCUS_INTERVAL_MS,
  DEFAULT_SMART_PADDING_PASTE_BOOKMARK,
  DEFAULT_SMART_PADDING_PASTE_CONTENT,
  DEFAULT_SMART_PADDING_PASTE_LINK,
} from '../../constants/settingDefaults';

/**
 * Contract tests for setting defaults.
 *
 * These values are user-facing contracts defined in package.json.
 * Changes here require corresponding package.json updates.
 */
describe('settingDefaults', () => {
  describe('delimiter defaults', () => {
    it('DEFAULT_DELIMITER_HASH is #', () => {
      expect(DEFAULT_DELIMITER_HASH).toBe('#');
    });

    it('DEFAULT_DELIMITER_LINE is L', () => {
      expect(DEFAULT_DELIMITER_LINE).toBe('L');
    });

    it('DEFAULT_DELIMITER_POSITION is C', () => {
      expect(DEFAULT_DELIMITER_POSITION).toBe('C');
    });

    it('DEFAULT_DELIMITER_RANGE is -', () => {
      expect(DEFAULT_DELIMITER_RANGE).toBe('-');
    });
  });

  describe('smart padding defaults', () => {
    it('DEFAULT_SMART_PADDING_PASTE_BOOKMARK is both', () => {
      expect(DEFAULT_SMART_PADDING_PASTE_BOOKMARK).toBe('both');
    });

    it('DEFAULT_SMART_PADDING_PASTE_CONTENT is none', () => {
      expect(DEFAULT_SMART_PADDING_PASTE_CONTENT).toBe('none');
    });

    it('DEFAULT_SMART_PADDING_PASTE_LINK is both', () => {
      expect(DEFAULT_SMART_PADDING_PASTE_LINK).toBe('both');
    });
  });

  describe('destination defaults', () => {
    it('DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_START_DELAY_MS is 1500', () => {
      expect(DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_START_DELAY_MS).toBe(1500);
    });

    it('DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_REFOCUS_INTERVAL_MS is 300', () => {
      expect(DEFAULT_DESTINATIONS_CLAUDE_CODE_COLD_REFOCUS_INTERVAL_MS).toBe(300);
    });
  });
});
