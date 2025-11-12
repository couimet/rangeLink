import { composePortableMetadata } from '../../formatting/composePortableMetadata';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { RangeFormat } from '../../types/RangeFormat';

describe('composePortableMetadata', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  it('should compose metadata with position delimiter', () => {
    const result = composePortableMetadata(defaultDelimiters, RangeFormat.WithPositions);
    expect(result).toBe('~#~L~-~C~');
  });

  it('should compose metadata without position delimiter', () => {
    const result = composePortableMetadata(defaultDelimiters, RangeFormat.LineOnly);
    expect(result).toBe('~#~L~-~');
  });

  it('should work with custom delimiters including position', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'line',
      position: 'pos',
      hash: '>>',
      range: 'thru',
    };
    const result = composePortableMetadata(customDelimiters, RangeFormat.WithPositions);
    expect(result).toBe('~>>~line~thru~pos~');
  });

  it('should work with custom delimiters without position', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'line',
      position: 'pos',
      hash: '>>',
      range: 'thru',
    };
    const result = composePortableMetadata(customDelimiters, RangeFormat.LineOnly);
    expect(result).toBe('~>>~line~thru~');
  });
});
