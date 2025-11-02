import { composePortableMetadata } from '../../formatting/composePortableMetadata';
import { DelimiterConfig } from '../../types/DelimiterConfig';

describe('composePortableMetadata', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  it('should compose metadata with position delimiter', () => {
    const result = composePortableMetadata(defaultDelimiters, true);
    expect(result).toBe('~#~L~-~C~');
  });

  it('should compose metadata without position delimiter', () => {
    const result = composePortableMetadata(defaultDelimiters, false);
    expect(result).toBe('~#~L~-~');
  });

  it('should work with custom delimiters including position', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'line',
      position: 'pos',
      hash: '>>',
      range: 'thru',
    };
    const result = composePortableMetadata(customDelimiters, true);
    expect(result).toBe('~>>~line~thru~pos~');
  });

  it('should work with custom delimiters without position', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'line',
      position: 'pos',
      hash: '>>',
      range: 'thru',
    };
    const result = composePortableMetadata(customDelimiters, false);
    expect(result).toBe('~>>~line~thru~');
  });
});

