import { DelimiterConfig } from '../../types/DelimiterConfig';
import { areDelimitersUnique } from '../../validation/areDelimitersUnique';

describe('areDelimitersUnique', () => {
  it('should return true for unique delimiters', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '#',
      range: '-',
    };
    expect(areDelimitersUnique(delimiters)).toBe(true);
  });

  it('should return false when line and position are the same', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'L',
      hash: '#',
      range: '-',
    };
    expect(areDelimitersUnique(delimiters)).toBe(false);
  });

  it('should return false when hash and range are the same', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '-',
      range: '-',
    };
    expect(areDelimitersUnique(delimiters)).toBe(false);
  });

  it('should treat delimiters as case-insensitive (L and l are the same)', () => {
    const delimiters: DelimiterConfig = {
      line: 'L',
      position: 'l',
      hash: '#',
      range: '-',
    };
    expect(areDelimitersUnique(delimiters)).toBe(false);
  });

  it('should return true for multi-character delimiters that are unique', () => {
    const delimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'COL',
      hash: '#',
      range: 'TO',
    };
    expect(areDelimitersUnique(delimiters)).toBe(true);
  });

  it('should return false for multi-character delimiters that match', () => {
    const delimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'LINE',
      hash: '#',
      range: '-',
    };
    expect(areDelimitersUnique(delimiters)).toBe(false);
  });

  it('should be case-insensitive for multi-character delimiters', () => {
    const delimiters: DelimiterConfig = {
      line: 'Line',
      position: 'line',
      hash: '#',
      range: '-',
    };
    expect(areDelimitersUnique(delimiters)).toBe(false);
  });
});

