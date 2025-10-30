import { DelimiterConfig } from '../../types/DelimiterConfig';
import { Selection } from '../../types/Selection';
import { formatPortableLink } from '../../formatting/formatPortableLink';

describe('formatPortableLink', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  it('should format a portable link with metadata', () => {
    const selections: Selection[] = [
      {
        startLine: 10,
        startCharacter: 5,
        endLine: 20,
        endCharacter: 15,
      },
    ];
    const result = formatPortableLink('src/file.ts', selections, defaultDelimiters);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('src/file.ts#L11C6-L21C16~#~L~-~C~');
    }
  });

  it('should not include position delimiter in metadata for line-only format', () => {
    const selections: Selection[] = [
      {
        startLine: 10,
        startCharacter: 0,
        endLine: 20,
        endCharacter: 0,
      },
    ];
    const result = formatPortableLink('src/file.ts', selections, defaultDelimiters);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('src/file.ts#L11-L21~#~L~-~');
    }
  });

  it('should format column mode portable link', () => {
    const selections: Selection[] = [
      { startLine: 10, startCharacter: 5, endLine: 10, endCharacter: 15 },
      { startLine: 11, startCharacter: 5, endLine: 11, endCharacter: 15 },
      { startLine: 12, startCharacter: 5, endLine: 12, endCharacter: 15 },
    ];
    const result = formatPortableLink('src/file.ts', selections, defaultDelimiters);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('src/file.ts##L11C6-L13C16~#~L~-~C~');
    }
  });

  it('should work with custom delimiters', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'line',
      position: 'pos',
      hash: '>>',
      range: 'thru',
    };
    const selections: Selection[] = [
      {
        startLine: 9,
        startCharacter: 4,
        endLine: 19,
        endCharacter: 14,
      },
    ];
    const result = formatPortableLink('path/to/file.ts', selections, customDelimiters);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('path/to/file.ts>>line10pos5thruline20pos15~>>~line~thru~pos~');
    }
  });
});

