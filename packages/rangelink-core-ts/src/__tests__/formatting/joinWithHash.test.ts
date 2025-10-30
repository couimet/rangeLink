import { DelimiterConfig } from '../../types/DelimiterConfig';
import { HashMode } from '../../types/HashMode';
import { joinWithHash } from '../../formatting/joinWithHash';

describe('joinWithHash', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  it('should use single hash for normal mode', () => {
    const result = joinWithHash('src/file.ts', 'L10C5-L20C10', defaultDelimiters, HashMode.Normal);
    expect(result).toBe('src/file.ts#L10C5-L20C10');
  });

  it('should use double hash for column mode', () => {
    const result = joinWithHash('src/file.ts', 'L10C5-L20C10', defaultDelimiters, HashMode.ColumnMode);
    expect(result).toBe('src/file.ts##L10C5-L20C10');
  });

  it('should default to normal mode when not specified', () => {
    const result = joinWithHash('src/file.ts', 'L10-L20', defaultDelimiters);
    expect(result).toBe('src/file.ts#L10-L20');
  });

  it('should work with custom hash delimiter', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '>>',
      range: '-',
    };
    const result = joinWithHash('path/file.ts', 'L10-L20', customDelimiters, HashMode.Normal);
    expect(result).toBe('path/file.ts>>L10-L20');
  });

  it('should work with custom hash delimiter in column mode', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '>>',
      range: '-',
    };
    const result = joinWithHash('path/file.ts', 'L10C5-L20C10', customDelimiters, HashMode.ColumnMode);
    expect(result).toBe('path/file.ts>>>>L10C5-L20C10');
  });
});

