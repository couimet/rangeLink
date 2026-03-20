import type { ConvertedPosition } from '../../utils/convertRangeLinkPosition';
import { formatClampingSummary } from '../../utils/formatClampingSummary';

const NO_CLAMPING: ConvertedPosition = {
  line: 0,
  character: 0,
  lineClamped: false,
  characterClamped: false,
};

const LINE_CLAMPED: ConvertedPosition = {
  line: 99,
  character: 0,
  lineClamped: true,
  characterClamped: false,
};

const CHARACTER_CLAMPED: ConvertedPosition = {
  line: 0,
  character: 50,
  lineClamped: false,
  characterClamped: true,
};

const BOTH_CLAMPED: ConvertedPosition = {
  line: 99,
  character: 50,
  lineClamped: true,
  characterClamped: true,
};

describe('formatClampingSummary', () => {
  describe('single-axis clamping', () => {
    it('should return line summary when start line is clamped', () => {
      const result = formatClampingSummary(LINE_CLAMPED, NO_CLAMPING);

      expect(result).toBe('line exceeded file length');
    });

    it('should return character summary when start character is clamped', () => {
      const result = formatClampingSummary(CHARACTER_CLAMPED, NO_CLAMPING);

      expect(result).toBe('column exceeded line length');
    });

    it('should return line summary when end line is clamped', () => {
      const result = formatClampingSummary(NO_CLAMPING, LINE_CLAMPED);

      expect(result).toBe('line exceeded file length');
    });

    it('should return character summary when end character is clamped', () => {
      const result = formatClampingSummary(NO_CLAMPING, CHARACTER_CLAMPED);

      expect(result).toBe('column exceeded line length');
    });
  });

  describe('multi-axis clamping', () => {
    it('should return both summary when line and character are clamped on same position', () => {
      const result = formatClampingSummary(BOTH_CLAMPED, NO_CLAMPING);

      expect(result).toBe('line and column exceeded bounds');
    });

    it('should return both summary when line clamped on start and character clamped on end', () => {
      const result = formatClampingSummary(LINE_CLAMPED, CHARACTER_CLAMPED);

      expect(result).toBe('line and column exceeded bounds');
    });

    it('should return both summary when both start and end are fully clamped', () => {
      const result = formatClampingSummary(BOTH_CLAMPED, BOTH_CLAMPED);

      expect(result).toBe('line and column exceeded bounds');
    });
  });

  describe('no clamping (unexpected code path)', () => {
    it('should throw UNEXPECTED_CODE_PATH when no clamping flags are set', () => {
      expect(() => formatClampingSummary(NO_CLAMPING, NO_CLAMPING))
        .toThrowRangeLinkExtensionError('UNEXPECTED_CODE_PATH', {
          message: 'formatClampingSummary called with no clamping flags set',
          functionName: 'formatClampingSummary',
        });
    });
  });
});
