import { DEFAULT_DELIMITERS } from '../../constants/DEFAULT_DELIMITERS';
import { PORTABLE_METADATA_SEPARATOR } from '../../constants/PORTABLE_METADATA_SEPARATOR';
import { RESERVED_CHARS } from '../../constants/RESERVED_CHARS';

describe('Constants', () => {
  describe('DEFAULT_DELIMITERS', () => {
    it('should have GitHub-inspired defaults', () => {
      expect(DEFAULT_DELIMITERS).toEqual({
        line: 'L',
        position: 'C',
        hash: '#',
        range: '-',
      });
    });
  });

  describe('PORTABLE_METADATA_SEPARATOR', () => {
    it('should be tilde', () => {
      expect(PORTABLE_METADATA_SEPARATOR).toBe('~');
    });
  });

  describe('RESERVED_CHARS', () => {
    it('should contain all reserved characters', () => {
      expect(RESERVED_CHARS).toEqual(['~', '|', '/', '\\', ':', ',', '@']);
    });

    it('should have 7 reserved characters', () => {
      expect(RESERVED_CHARS).toHaveLength(7);
    });
  });
});
