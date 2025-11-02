import { formatLink } from '../../formatting/formatLink';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { Selection } from '../../types/Selection';

describe('formatLink', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  it('should format a simple multi-line selection', () => {
    const selection: Selection = {
      startLine: 10,
      startCharacter: 5,
      endLine: 20,
      endCharacter: 15,
    };
    const result = formatLink('src/file.ts', [selection], defaultDelimiters);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('src/file.ts#L11C6-L21C16');
    }
  });

  it('should format a single-line selection', () => {
    const selection: Selection = {
      startLine: 10,
      startCharacter: 5,
      endLine: 10,
      endCharacter: 15,
    };
    const result = formatLink('src/file.ts', [selection], defaultDelimiters);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('src/file.ts#L11C6-L11C16');
    }
  });

  it('should use line-only format for full-block selection', () => {
    const selection: Selection = {
      startLine: 10,
      startCharacter: 0,
      endLine: 20,
      endCharacter: 0,
    };
    const result = formatLink('src/file.ts', [selection], defaultDelimiters);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('src/file.ts#L11-L21');
    }
  });

  it('should use simple line reference format for single line with isFullLine option', () => {
    const selection: Selection = {
      startLine: 41,
      startCharacter: 0,
      endLine: 41,
      endCharacter: 50,
    };
    const result = formatLink('src/file.ts', [selection], defaultDelimiters, { isFullLine: true });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('src/file.ts#L42');
    }
  });

  it('should reject empty selection', () => {
    const selection: Selection = {
      startLine: 10,
      startCharacter: 5,
      endLine: 10,
      endCharacter: 5,
    };
    const result = formatLink('src/file.ts', [selection], defaultDelimiters);

    expect(result.success).toBe(false);
  });

  it('should work with custom delimiters', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'COL',
      hash: '>>',
      range: 'thru',
    };
    const selection: Selection = {
      startLine: 9,
      startCharacter: 4,
      endLine: 19,
      endCharacter: 14,
    };
    const result = formatLink('path/to/file.ts', [selection], customDelimiters);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('path/to/file.ts>>LINE10COL5thruLINE20COL15');
    }
  });

  it('should reject empty selections array', () => {
    const result = formatLink('src/file.ts', [], defaultDelimiters);
    expect(result.success).toBe(false);
  });
});

