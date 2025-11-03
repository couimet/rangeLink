import { DelimiterConfig } from '../../types/DelimiterConfig';
import { haveSubstringConflicts } from '../../validation/haveSubstringConflicts';

describe('haveSubstringConflicts', () => {
  it('should return false for non-conflicting delimiters', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };
    expect(haveSubstringConflicts(delimiters)).toBe(false);
  });

  it('should detect substring conflict (line contains position)', () => {
    const delimiters: DelimiterConfig = {
      line: 'LC',
      position: 'C',
      hash: '#',
      range: '-',
    };
    expect(haveSubstringConflicts(delimiters)).toBe(true);
  });

  it('should detect substring conflict (position contains line)', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'LINE',
      hash: '#',
      range: '-',
    };
    expect(haveSubstringConflicts(delimiters)).toBe(true);
  });

  it('should detect substring conflict in the middle', () => {
    const delimiters: DelimiterConfig = {
      line: 'XLINE',
      position: 'LIN',
      hash: '#',
      range: '-',
    };
    expect(haveSubstringConflicts(delimiters)).toBe(true);
  });

  it('should be case-insensitive for substring detection', () => {
    const delimiters: DelimiterConfig = {
      line: 'Line',
      position: 'line',
      hash: '#',
      range: '-',
    };
    expect(haveSubstringConflicts(delimiters)).toBe(true);
  });

  it('should be case-insensitive for partial matches', () => {
    const delimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'lin',
      hash: '#',
      range: '-',
    };
    expect(haveSubstringConflicts(delimiters)).toBe(true);
  });

  it('should allow mixed case delimiters that do not conflict', () => {
    const delimiters: DelimiterConfig = {
      line: 'Line',
      position: 'Pos',
      hash: 'AT',
      range: 'thru',
    };
    expect(haveSubstringConflicts(delimiters)).toBe(false);
  });

  it('should detect hash substring conflict', () => {
    const delimiters: DelimiterConfig = {
      line: 'L#',
      position: 'C',
      hash: '#',
      range: '-',
    };
    expect(haveSubstringConflicts(delimiters)).toBe(true);
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
    expect(haveSubstringConflicts(delimiters)).toBe(false);
  });
});
