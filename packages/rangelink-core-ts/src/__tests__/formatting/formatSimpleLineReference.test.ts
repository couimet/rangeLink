import { formatSimpleLineReference } from '../../formatting/formatSimpleLineReference';
import { DelimiterConfig } from '../../types/DelimiterConfig';

describe('formatSimpleLineReference', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  it('should format simple line reference with default delimiters', () => {
    const result = formatSimpleLineReference('src/file.ts', 42, defaultDelimiters);
    expect(result).toBe('src/file.ts#L42');
  });

  it('should work with custom delimiters', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'COL',
      hash: '>>',
      range: '-',
    };
    const result = formatSimpleLineReference('path/to/file.ts', 10, customDelimiters);
    expect(result).toBe('path/to/file.ts>>LINE10');
  });
});

