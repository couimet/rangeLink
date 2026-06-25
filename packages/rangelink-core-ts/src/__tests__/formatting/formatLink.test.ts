import { getUniqueInt } from '@couimet/dynamic-testing';
import { getLogger } from '@couimet/logger-contract';

import { formatLink } from '../../formatting/formatLink';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { FormattedLink } from '../../types/FormattedLink';
import { InputSelection } from '../../types/InputSelection';
import { LinkType } from '../../types/LinkType';
import { RangeNotation } from '../../types/RangeNotation';
import { SelectionCoverage } from '../../types/SelectionCoverage';
import { SelectionType } from '../../types/SelectionType';

const DEFAULT_DELIMITERS = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
} as const;

const byodSuffix = (d: DelimiterConfig, withPositions: boolean): string => {
  const base = `~${d.hash}~${d.line}~${d.range}~`;
  return withPositions ? `${base}${d.position}~` : base;
};

describe('formatLink', () => {
  let startLine: number;
  let endLine: number;
  let startPosition: number;
  let endPosition: number;

  beforeEach(() => {
    startLine = getUniqueInt();
    endLine = getUniqueInt();
    startPosition = getUniqueInt();
    endPosition = getUniqueInt();
  });

  it('should format a simple multi-line selection', () => {
    const expectedStartLine = startLine + 1;
    const expectedEndLine = endLine + 1;
    const expectedStartPosition = startPosition + 1;
    const expectedEndPosition = endPosition + 1;

    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: startPosition },
          end: { line: endLine, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `src/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedEndLine}C${expectedEndPosition}`,
        rawLink: `src/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedEndLine}C${expectedEndPosition}`,
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Normal',
        delimiters: DEFAULT_DELIMITERS,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedEndLine,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should format a single-line selection', () => {
    const expectedStartLine = startLine + 1;
    const expectedStartPosition = startPosition + 1;
    const expectedEndPosition = endPosition + 1;

    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: startPosition },
          end: { line: startLine, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `src/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedStartLine}C${expectedEndPosition}`,
        rawLink: `src/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedStartLine}C${expectedEndPosition}`,
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Normal',
        delimiters: DEFAULT_DELIMITERS,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should use line-only format for full-block selection with FullLine coverage', () => {
    const expectedStartLine = startLine + 1;
    const expectedEndLine = endLine + 1;

    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: 0 },
          end: { line: endLine, character: 0 },
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `src/file.ts#L${expectedStartLine}-L${expectedEndLine}`,
        rawLink: `src/file.ts#L${expectedStartLine}-L${expectedEndLine}`,
        linkType: 'regular',
        rangeFormat: 'LineOnly',
        selectionType: 'Normal',
        delimiters: DEFAULT_DELIMITERS,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedEndLine,
          rangeFormat: 'LineOnly',
        },
      });
    });
  });

  it('should use simple line reference format for single line with FullLine coverage', () => {
    const expectedStartLine = startLine + 1;

    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: 0 },
          end: { line: startLine, character: endPosition },
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `src/file.ts#L${expectedStartLine}`,
        rawLink: `src/file.ts#L${expectedStartLine}`,
        linkType: 'regular',
        rangeFormat: 'LineOnly',
        selectionType: 'Normal',
        delimiters: DEFAULT_DELIMITERS,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          rangeFormat: 'LineOnly',
        },
      });
    });
  });

  it('should use line-only format with EnforceFullLine notation even for PartialLine', () => {
    const expectedStartLine = startLine + 1;

    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: startPosition },
          end: { line: startLine, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
      notation: RangeNotation.EnforceFullLine,
    });

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `src/file.ts#L${expectedStartLine}`,
        rawLink: `src/file.ts#L${expectedStartLine}`,
        linkType: 'regular',
        rangeFormat: 'LineOnly',
        selectionType: 'Normal',
        delimiters: DEFAULT_DELIMITERS,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedStartLine,
          rangeFormat: 'LineOnly',
        },
      });
    });
  });

  it('should return error for empty selections array', () => {
    const inputSelection: InputSelection = {
      selections: [],
      selectionType: SelectionType.Normal,
    };

    const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS);
    expect(result).toBeRangeLinkErrorErr('SELECTION_EMPTY', {
      message: 'Selections array must not be empty',
      functionName: 'validateInputSelection',
      details: { selectionsLength: 0 },
    });
  });

  it('should work with custom delimiters', () => {
    const expectedStartLine = startLine + 1;
    const expectedEndLine = endLine + 1;
    const expectedStartPosition = startPosition + 1;
    const expectedEndPosition = endPosition + 1;

    const customDelimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'COL',
      hash: '>>',
      range: 'thru',
    };
    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: startPosition },
          end: { line: endLine, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('path/to/file.ts', inputSelection, customDelimiters);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `path/to/file.ts>>LINE${expectedStartLine}COL${expectedStartPosition}thruLINE${expectedEndLine}COL${expectedEndPosition}`,
        rawLink: `path/to/file.ts>>LINE${expectedStartLine}COL${expectedStartPosition}thruLINE${expectedEndLine}COL${expectedEndPosition}`,
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Normal',
        delimiters: customDelimiters,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedEndLine,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should format rectangular selection with double hash', () => {
    const expectedStartLine = startLine + 1;
    const expectedStartPosition = startPosition + 1;
    const expectedEndPosition = endPosition + 1;

    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: startPosition },
          end: { line: startLine, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: startPosition },
          end: { line: startLine + 1, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 2, character: startPosition },
          end: { line: startLine + 2, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Rectangular,
    };
    const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `src/file.ts##L${expectedStartLine}C${expectedStartPosition}-L${expectedStartLine + 2}C${expectedEndPosition}`,
        rawLink: `src/file.ts##L${expectedStartLine}C${expectedStartPosition}-L${expectedStartLine + 2}C${expectedEndPosition}`,
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Rectangular',
        delimiters: DEFAULT_DELIMITERS,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedStartLine + 2,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should format rectangular selection with custom single-char delimiters', () => {
    const expectedStartLine = startLine + 1;
    const expectedStartPosition = startPosition + 1;
    const expectedEndPosition = endPosition + 1;

    const customDelimiters: DelimiterConfig = {
      line: 'X',
      position: 'Y',
      hash: '@',
      range: '..',
    };
    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: startPosition },
          end: { line: startLine, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: startPosition },
          end: { line: startLine + 1, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 2, character: startPosition },
          end: { line: startLine + 2, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Rectangular,
    };
    const result = formatLink('src/file.ts', inputSelection, customDelimiters);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `src/file.ts@@X${expectedStartLine}Y${expectedStartPosition}..X${expectedStartLine + 2}Y${expectedEndPosition}`,
        rawLink: `src/file.ts@@X${expectedStartLine}Y${expectedStartPosition}..X${expectedStartLine + 2}Y${expectedEndPosition}`,
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Rectangular',
        delimiters: customDelimiters,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedStartLine + 2,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should format rectangular selection with custom multi-char delimiters (hash doubling)', () => {
    const expectedStartLine = startLine + 1;
    const expectedStartPosition = startPosition + 1;
    const expectedEndPosition = endPosition + 1;

    const customDelimiters: DelimiterConfig = {
      line: 'LINE',
      position: 'COL',
      hash: '##',
      range: 'TO',
    };
    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: startPosition },
          end: { line: startLine, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 1, character: startPosition },
          end: { line: startLine + 1, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: startLine + 2, character: startPosition },
          end: { line: startLine + 2, character: endPosition },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Rectangular,
    };
    const result = formatLink('src/file.ts', inputSelection, customDelimiters);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `src/file.ts####LINE${expectedStartLine}COL${expectedStartPosition}TOLINE${expectedStartLine + 2}COL${expectedEndPosition}`,
        rawLink: `src/file.ts####LINE${expectedStartLine}COL${expectedStartPosition}TOLINE${expectedStartLine + 2}COL${expectedEndPosition}`,
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Rectangular',
        delimiters: customDelimiters,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedStartLine + 2,
          startPosition: expectedStartPosition,
          endPosition: expectedEndPosition,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should use WithPositions format with EnforcePositions notation even for FullLine', () => {
    const expectedStartLine = startLine + 1;
    const expectedEndLine = endLine + 1;

    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: startLine, character: 0 },
          end: { line: endLine, character: 0 },
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
      notation: RangeNotation.EnforcePositions,
    });

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: `src/file.ts#L${expectedStartLine}C1-L${expectedEndLine}C1`,
        rawLink: `src/file.ts#L${expectedStartLine}C1-L${expectedEndLine}C1`,
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Normal',
        delimiters: DEFAULT_DELIMITERS,
        computedSelection: {
          startLine: expectedStartLine,
          endLine: expectedEndLine,
          startPosition: 1,
          endPosition: 1,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  describe('portable links', () => {
    it('should append BYOD metadata for single-line FullLine selection', () => {
      const expectedStartLine = startLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `src/file.ts#L${expectedStartLine}${byodSuffix(DEFAULT_DELIMITERS, false)}`,
          rawLink: `src/file.ts#L${expectedStartLine}${byodSuffix(DEFAULT_DELIMITERS, false)}`,
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedStartLine,
            rangeFormat: 'LineOnly',
          },
        });
      });
    });

    it('should append BYOD metadata for multi-line FullLine selection', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: endLine, character: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `src/file.ts#L${expectedStartLine}-L${expectedEndLine}${byodSuffix(DEFAULT_DELIMITERS, false)}`,
          rawLink: `src/file.ts#L${expectedStartLine}-L${expectedEndLine}${byodSuffix(DEFAULT_DELIMITERS, false)}`,
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedEndLine,
            rangeFormat: 'LineOnly',
          },
        });
      });
    });

    it('should append BYOD metadata with positions for PartialLine selection', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: endLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `src/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedEndLine}C${expectedEndPosition}${byodSuffix(DEFAULT_DELIMITERS, true)}`,
          rawLink: `src/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedEndLine}C${expectedEndPosition}${byodSuffix(DEFAULT_DELIMITERS, true)}`,
          linkType: 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Normal',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedEndLine,
            startPosition: expectedStartPosition,
            endPosition: expectedEndPosition,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });

    it('should append BYOD metadata for rectangular selection', () => {
      const expectedStartLine = startLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: startLine + 1, character: startPosition },
            end: { line: startLine + 1, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: startLine + 2, character: startPosition },
            end: { line: startLine + 2, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };
      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `src/file.ts##L${expectedStartLine}C${expectedStartPosition}-L${expectedStartLine + 2}C${expectedEndPosition}${byodSuffix(DEFAULT_DELIMITERS, true)}`,
          rawLink: `src/file.ts##L${expectedStartLine}C${expectedStartPosition}-L${expectedStartLine + 2}C${expectedEndPosition}${byodSuffix(DEFAULT_DELIMITERS, true)}`,
          linkType: 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Rectangular',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedStartLine + 2,
            startPosition: expectedStartPosition,
            endPosition: expectedEndPosition,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });

    it('should append BYOD metadata for rectangular selection with custom delimiters', () => {
      const expectedStartLine = startLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const customDelimiters: DelimiterConfig = {
        line: 'LINE',
        position: 'COL',
        hash: '#',
        range: 'TO',
      };
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: startLine + 1, character: startPosition },
            end: { line: startLine + 1, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: startLine + 2, character: startPosition },
            end: { line: startLine + 2, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };
      const result = formatLink('src/file.ts', inputSelection, customDelimiters, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `src/file.ts##LINE${expectedStartLine}COL${expectedStartPosition}TOLINE${expectedStartLine + 2}COL${expectedEndPosition}${byodSuffix(customDelimiters, true)}`,
          rawLink: `src/file.ts##LINE${expectedStartLine}COL${expectedStartPosition}TOLINE${expectedStartLine + 2}COL${expectedEndPosition}${byodSuffix(customDelimiters, true)}`,
          linkType: 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Rectangular',
          delimiters: customDelimiters,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedStartLine + 2,
            startPosition: expectedStartPosition,
            endPosition: expectedEndPosition,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });

    it('should append BYOD metadata with custom delimiters (line-only)', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;

      const customDelimiters: DelimiterConfig = {
        line: 'LINE',
        position: 'COL',
        hash: '>>',
        range: 'thru',
      };
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: endLine, character: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('path/to/file.ts', inputSelection, customDelimiters, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `path/to/file.ts>>LINE${expectedStartLine}thruLINE${expectedEndLine}${byodSuffix(customDelimiters, false)}`,
          rawLink: `path/to/file.ts>>LINE${expectedStartLine}thruLINE${expectedEndLine}${byodSuffix(customDelimiters, false)}`,
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: customDelimiters,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedEndLine,
            rangeFormat: 'LineOnly',
          },
        });
      });
    });

    it('should append BYOD metadata with custom delimiters (with positions)', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const customDelimiters: DelimiterConfig = {
        line: 'LINE',
        position: 'COL',
        hash: '>>',
        range: 'thru',
      };
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: endLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('path/to/file.ts', inputSelection, customDelimiters, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `path/to/file.ts>>LINE${expectedStartLine}COL${expectedStartPosition}thruLINE${expectedEndLine}COL${expectedEndPosition}${byodSuffix(customDelimiters, true)}`,
          rawLink: `path/to/file.ts>>LINE${expectedStartLine}COL${expectedStartPosition}thruLINE${expectedEndLine}COL${expectedEndPosition}${byodSuffix(customDelimiters, true)}`,
          linkType: 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Normal',
          delimiters: customDelimiters,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedEndLine,
            startPosition: expectedStartPosition,
            endPosition: expectedEndPosition,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });

    it('should append BYOD metadata for EnforceFullLine notation', () => {
      const expectedStartLine = startLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
        notation: RangeNotation.EnforceFullLine,
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `src/file.ts#L${expectedStartLine}${byodSuffix(DEFAULT_DELIMITERS, false)}`,
          rawLink: `src/file.ts#L${expectedStartLine}${byodSuffix(DEFAULT_DELIMITERS, false)}`,
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedStartLine,
            rangeFormat: 'LineOnly',
          },
        });
      });
    });

    it('should append BYOD metadata for EnforcePositions notation', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: endLine, character: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
        notation: RangeNotation.EnforcePositions,
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `src/file.ts#L${expectedStartLine}C1-L${expectedEndLine}C1${byodSuffix(DEFAULT_DELIMITERS, true)}`,
          rawLink: `src/file.ts#L${expectedStartLine}C1-L${expectedEndLine}C1${byodSuffix(DEFAULT_DELIMITERS, true)}`,
          linkType: 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Normal',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedEndLine,
            startPosition: 1,
            endPosition: 1,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });
  });

  describe('integration', () => {
    it.each([
      { linkType: LinkType.Regular, suffix: '' },
      { linkType: LinkType.Portable, suffix: byodSuffix(DEFAULT_DELIMITERS, true) },
    ])(
      'should handle end-to-end link generation with linkType=$linkType',
      ({ linkType, suffix }) => {
        const expectedStartLine = startLine + 1;
        const expectedEndLine = endLine + 1;
        const expectedStartPosition = startPosition + 1;
        const expectedEndPosition = endPosition + 1;

        const inputSelection: InputSelection = {
          selections: [
            {
              start: { line: startLine, character: startPosition },
              end: { line: endLine, character: endPosition },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        };

        const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
          linkType,
        });

        expect(result).toBeOkWith((value: FormattedLink) => {
          expect(value).toStrictEqual({
            link: `src/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedEndLine}C${expectedEndPosition}${suffix}`,
            rawLink: `src/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedEndLine}C${expectedEndPosition}${suffix}`,
            linkType: linkType === LinkType.Regular ? 'regular' : 'portable',
            rangeFormat: 'WithPositions',
            selectionType: 'Normal',
            delimiters: DEFAULT_DELIMITERS,
            computedSelection: {
              startLine: expectedStartLine,
              endLine: expectedEndLine,
              startPosition: expectedStartPosition,
              endPosition: expectedEndPosition,
              rangeFormat: 'WithPositions',
            },
          });
        });
      },
    );

    it.each([
      { linkType: LinkType.Regular, suffix: '' },
      { linkType: LinkType.Portable, suffix: byodSuffix(DEFAULT_DELIMITERS, true) },
    ])('should handle rectangular selection with linkType=$linkType', ({ linkType, suffix }) => {
      const expectedStartLine = startLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: startLine + 1, character: startPosition },
            end: { line: startLine + 1, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };

      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
        linkType,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `src/file.ts##L${expectedStartLine}C${expectedStartPosition}-L${expectedStartLine + 1}C${expectedEndPosition}${suffix}`,
          rawLink: `src/file.ts##L${expectedStartLine}C${expectedStartPosition}-L${expectedStartLine + 1}C${expectedEndPosition}${suffix}`,
          linkType: linkType === LinkType.Regular ? 'regular' : 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Rectangular',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedStartLine + 1,
            startPosition: expectedStartPosition,
            endPosition: expectedEndPosition,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });

    it.each([{ linkType: LinkType.Regular }, { linkType: LinkType.Portable }])(
      'should propagate errors correctly with linkType=$linkType',
      ({ linkType }) => {
        const inputSelection: InputSelection = {
          selections: [],
          selectionType: SelectionType.Normal,
        };

        const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
          linkType,
        });

        expect(result).toBeRangeLinkErrorErr('SELECTION_EMPTY', {
          message: 'Selections array must not be empty',
          functionName: 'validateInputSelection',
          details: { selectionsLength: 0 },
        });
      },
    );
  });

  describe('quoting', () => {
    it('should quote link when path contains spaces', () => {
      const expectedStartLine = startLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      const result = formatLink('My Folder/file.ts', inputSelection, DEFAULT_DELIMITERS);

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `'My Folder/file.ts#L${expectedStartLine}'`,
          rawLink: `My Folder/file.ts#L${expectedStartLine}`,
          linkType: 'regular',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedStartLine,
            rangeFormat: 'LineOnly',
          },
        });
      });
    });

    it('should quote link when path contains parentheses', () => {
      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: endLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      const result = formatLink('src/(group)/file.ts', inputSelection, DEFAULT_DELIMITERS);

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: `'src/(group)/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedEndLine}C${expectedEndPosition}'`,
          rawLink: `src/(group)/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedEndLine}C${expectedEndPosition}`,
          linkType: 'regular',
          rangeFormat: 'WithPositions',
          selectionType: 'Normal',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedEndLine,
            startPosition: expectedStartPosition,
            endPosition: expectedEndPosition,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });

    it('should not quote link when path is safe', () => {
      const expectedStartLine = startLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS);

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value.link).toBe(`src/file.ts#L${expectedStartLine}`);
        expect(value.rawLink).toBe(`src/file.ts#L${expectedStartLine}`);
      });
    });
  });

  describe('logging integration', () => {
    it('should log with correct attributes through standard anchor path', () => {
      const mockDebug = jest.fn();
      jest.spyOn(getLogger(), 'debug').mockImplementation(mockDebug);

      const expectedStartLine = startLine + 1;
      const expectedEndLine = endLine + 1;
      const expectedStartPosition = startPosition + 1;
      const expectedEndPosition = endPosition + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: endLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS);

      const expectedLink = `src/file.ts#L${expectedStartLine}C${expectedStartPosition}-L${expectedEndLine}C${expectedEndPosition}`;
      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: expectedLink,
          rawLink: expectedLink,
          linkType: 'regular',
          rangeFormat: 'WithPositions',
          selectionType: 'Normal',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedEndLine,
            startPosition: expectedStartPosition,
            endPosition: expectedEndPosition,
            rangeFormat: 'WithPositions',
          },
        });
      });

      expect(mockDebug).toHaveBeenCalledWith(
        {
          fn: 'formatLink',
          link: expectedLink,
          rawLink: expectedLink,
          linkLength: expectedLink.length,
          selectionType: 'Normal',
          rangeFormat: 'WithPositions',
        },
        'Generated link',
      );

      mockDebug.mockRestore();
    });

    it('should log with correct attributes through simple line reference path', () => {
      const mockDebug = jest.fn();
      jest.spyOn(getLogger(), 'debug').mockImplementation(mockDebug);

      const expectedStartLine = startLine + 1;

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: 0 },
            end: { line: startLine, character: endPosition },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      const result = formatLink('src/file.ts', inputSelection, DEFAULT_DELIMITERS, {
        linkType: LinkType.Portable,
      });

      const expectedLink = `src/file.ts#L${expectedStartLine}${byodSuffix(DEFAULT_DELIMITERS, false)}`;
      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: expectedLink,
          rawLink: expectedLink,
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: DEFAULT_DELIMITERS,
          computedSelection: {
            startLine: expectedStartLine,
            endLine: expectedStartLine,
            rangeFormat: 'LineOnly',
          },
        });
      });

      expect(mockDebug).toHaveBeenCalledWith(
        {
          fn: 'formatLink',
          link: expectedLink,
          rawLink: expectedLink,
          linkLength: expectedLink.length,
          format: 'simple',
        },
        'Generated link',
      );

      mockDebug.mockRestore();
    });
  });
});
