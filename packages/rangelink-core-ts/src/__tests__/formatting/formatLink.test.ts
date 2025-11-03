import { formatLink } from '../../formatting/formatLink';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { InputSelection } from '../../types/InputSelection';
import { RangeLinkMessageCode } from '../../types/RangeLinkMessageCode';
import { RangeNotation } from '../../types/RangeNotation';
import { SelectionCoverage } from '../../types/SelectionCoverage';
import { SelectionType } from '../../types/SelectionType';

describe('formatLink', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  it('should format a simple multi-line selection', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          startLine: 10,
          startCharacter: 5,
          endLine: 20,
          endCharacter: 15,
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

    expect(result).toBeOkWith((value) => {
      expect(value).toBe('src/file.ts#L11C6-L21C16');
    });
  });

  it('should format a single-line selection', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          startLine: 10,
          startCharacter: 5,
          endLine: 10,
          endCharacter: 15,
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

    expect(result).toBeOkWith((value) => {
      expect(value).toBe('src/file.ts#L11C6-L11C16');
    });
  });

  it('should use line-only format for full-block selection with FullLine coverage', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          startLine: 10,
          startCharacter: 0,
          endLine: 20,
          endCharacter: 0,
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

    expect(result).toBeOkWith((value) => {
      expect(value).toBe('src/file.ts#L11-L21');
    });
  });

  it('should use simple line reference format for single line with FullLine coverage', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          startLine: 41,
          startCharacter: 0,
          endLine: 41,
          endCharacter: 50,
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

    expect(result).toBeOkWith((value) => {
      expect(value).toBe('src/file.ts#L42');
    });
  });

  it('should use line-only format with EnforceFullLine notation even for PartialLine', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          startLine: 10,
          startCharacter: 5,
          endLine: 10,
          endCharacter: 15,
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
      notation: RangeNotation.EnforceFullLine,
    });

    expect(result).toBeOkWith((value) => {
      expect(value).toBe('src/file.ts#L11');
    });
  });

  it('should return error for empty selections array', () => {
    const inputSelection: InputSelection = {
      selections: [],
      selectionType: SelectionType.Normal,
    };

    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);
    expect(result).toBeErrWith((error) => {
      expect(error).toBe(RangeLinkMessageCode.SELECTION_ERR_EMPTY);
    });
  });

  it('should work with custom delimiters', () => {
    const customDelimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'COL',
      hash: '>>',
      range: 'thru',
    };
    const inputSelection: InputSelection = {
      selections: [
        {
          startLine: 9,
          startCharacter: 4,
          endLine: 19,
          endCharacter: 14,
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('path/to/file.ts', inputSelection, customDelimiters);

    expect(result).toBeOkWith((value) => {
      expect(value).toBe('path/to/file.ts>>LINE10COL5thruLINE20COL15');
    });
  });
});
