import { joinWithHash } from '../../formatting/joinWithHash';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { SelectionType } from '../../types/SelectionType';

describe('joinWithHash', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  it('should use single hash for normal selection', () => {
    const result = joinWithHash('src/file.ts', 'L10C5-L20C10', defaultDelimiters, SelectionType.Normal);
    expect(result).toBe('src/file.ts#L10C5-L20C10');
  });

  it('should use double hash for rectangular selection', () => {
    const result = joinWithHash(
      'src/file.ts',
      'L10C5-L20C10',
      defaultDelimiters,
      SelectionType.Rectangular,
    );
    expect(result).toBe('src/file.ts##L10C5-L20C10');
  });

  it('should default to normal selection when not specified', () => {
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
    const result = joinWithHash('path/file.ts', 'L10-L20', customDelimiters, SelectionType.Normal);
    expect(result).toBe('path/file.ts>>L10-L20');
  });

  it('should work with custom hash delimiter in rectangular mode', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'L',
      position: 'C',
      hash: '>>',
      range: '-',
    };
    const result = joinWithHash(
      'path/file.ts',
      'L10C5-L20C10',
      customDelimiters,
      SelectionType.Rectangular,
    );
    expect(result).toBe('path/file.ts>>>>L10C5-L20C10');
  });
});
