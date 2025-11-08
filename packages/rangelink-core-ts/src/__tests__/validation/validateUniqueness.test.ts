import { DelimiterConfig } from '../../types/DelimiterConfig';
import { validateUniqueness } from '../../validation/validateUniqueness';

describe('validateUniqueness', () => {
  it('should return Ok for unique delimiters', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };
    const result = validateUniqueness(delimiters);
    expect(result).toBeOk();
  });

  it('should return Err when line and position are the same', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'L',
      hash: '#',
      range: '-',
    };
    const result = validateUniqueness(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_NOT_UNIQUE', {
      message: 'Delimiters must be unique (case-insensitive)',
      functionName: 'validateUniqueness',
      details: { delimiters },
    });
  });

  it('should return Err when hash and range are the same', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '-',
      range: '-',
    };
    const result = validateUniqueness(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_NOT_UNIQUE', {
      message: 'Delimiters must be unique (case-insensitive)',
      functionName: 'validateUniqueness',
      details: { delimiters },
    });
  });

  it('should treat delimiters as case-insensitive (L and l are the same)', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'l',
      hash: '#',
      range: '-',
    };
    const result = validateUniqueness(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_NOT_UNIQUE', {
      message: 'Delimiters must be unique (case-insensitive)',
      functionName: 'validateUniqueness',
      details: { delimiters },
    });
  });

  it('should return Ok for multi-character delimiters that are unique', () => {
    const delimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'COL',
      hash: '#',
      range: 'TO',
    };
    const result = validateUniqueness(delimiters);
    expect(result).toBeOk();
  });

  it('should return Err for multi-character delimiters that match', () => {
    const delimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'LINE',
      hash: '#',
      range: '-',
    };
    const result = validateUniqueness(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_NOT_UNIQUE', {
      message: 'Delimiters must be unique (case-insensitive)',
      functionName: 'validateUniqueness',
      details: { delimiters },
    });
  });

  it('should be case-insensitive for multi-character delimiters', () => {
    const delimiters: DelimiterConfig = {
      line: 'Line',
      position: 'line',
      hash: '#',
      range: '-',
    };
    const result = validateUniqueness(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_NOT_UNIQUE', {
      message: 'Delimiters must be unique (case-insensitive)',
      functionName: 'validateUniqueness',
      details: { delimiters },
    });
  });
});
