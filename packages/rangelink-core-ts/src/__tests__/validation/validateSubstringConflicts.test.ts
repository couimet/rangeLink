import { DelimiterConfig } from '../../types/DelimiterConfig';
import { validateSubstringConflicts } from '../../validation/validateSubstringConflicts';

describe('validateSubstringConflicts', () => {
  it('should return Ok for non-conflicting delimiters', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };
    const result = validateSubstringConflicts(delimiters);
    expect(result).toBeOk();
  });

  it('should return Err when line contains position', () => {
    const delimiters: DelimiterConfig = {
      line: 'LC',
      position: 'C',
      hash: '#',
      range: '-',
    };
    const result = validateSubstringConflicts(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_SUBSTRING_CONFLICT', {
      message: 'Delimiters cannot be substrings of each other',
      functionName: 'validateSubstringConflicts',
      details: { delimiters },
    });
  });

  it('should return Err when position contains line', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'LINE',
      hash: '#',
      range: '-',
    };
    const result = validateSubstringConflicts(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_SUBSTRING_CONFLICT', {
      message: 'Delimiters cannot be substrings of each other',
      functionName: 'validateSubstringConflicts',
      details: { delimiters },
    });
  });

  it('should return Err for substring conflict in the middle', () => {
    const delimiters: DelimiterConfig = {
      line: 'XLINE',
      position: 'LIN',
      hash: '#',
      range: '-',
    };
    const result = validateSubstringConflicts(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_SUBSTRING_CONFLICT', {
      message: 'Delimiters cannot be substrings of each other',
      functionName: 'validateSubstringConflicts',
      details: { delimiters },
    });
  });

  it('should be case-insensitive for substring detection', () => {
    const delimiters: DelimiterConfig = {
      line: 'Line',
      position: 'line',
      hash: '#',
      range: '-',
    };
    const result = validateSubstringConflicts(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_SUBSTRING_CONFLICT', {
      message: 'Delimiters cannot be substrings of each other',
      functionName: 'validateSubstringConflicts',
      details: { delimiters },
    });
  });

  it('should be case-insensitive for partial matches', () => {
    const delimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'lin',
      hash: '#',
      range: '-',
    };
    const result = validateSubstringConflicts(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_SUBSTRING_CONFLICT', {
      message: 'Delimiters cannot be substrings of each other',
      functionName: 'validateSubstringConflicts',
      details: { delimiters },
    });
  });

  it('should return Ok for mixed case delimiters that do not conflict', () => {
    const delimiters: DelimiterConfig = {
      line: 'Line',
      position: 'Pos',
      hash: 'AT',
      range: 'thru',
    };
    const result = validateSubstringConflicts(delimiters);
    expect(result).toBeOk();
  });

  it('should return Err for hash substring conflict', () => {
    const delimiters: DelimiterConfig = {
      line: 'L#',
      position: 'C',
      hash: '#',
      range: '-',
    };
    const result = validateSubstringConflicts(delimiters);
    expect(result).toBeRangeLinkErrorErr('CONFIG_DELIMITER_SUBSTRING_CONFLICT', {
      message: 'Delimiters cannot be substrings of each other',
      functionName: 'validateSubstringConflicts',
      details: { delimiters },
    });
  });

  it('should handle empty string delimiters gracefully', () => {
    // This is defensive - empty delimiters should be rejected by validateDelimiter
    // but we test the defensive code path here
    const delimiters: DelimiterConfig = {
      line: '',
      position: 'C',
      hash: '#',
      range: '-',
    };
    const result = validateSubstringConflicts(delimiters);
    expect(result).toBeOk();
  });
});
