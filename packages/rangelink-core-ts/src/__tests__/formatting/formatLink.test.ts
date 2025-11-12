import { getLogger } from 'barebone-logger';

import { formatLink } from '../../formatting/formatLink';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { FormattedLink } from '../../types/FormattedLink';
import { InputSelection } from '../../types/InputSelection';
import { LinkType } from '../../types/LinkType';
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
          start: { line: 10, char: 5 },

          end: { line: 20, char: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: 'src/file.ts#L11C6-L21C16',
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Normal',
        delimiters: defaultDelimiters,
        computedSelection: {
          startLine: 11,
          endLine: 21,
          startPosition: 6,
          endPosition: 16,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should format a single-line selection', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: 10, char: 5 },

          end: { line: 10, char: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: 'src/file.ts#L11C6-L11C16',
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Normal',
        delimiters: defaultDelimiters,
        computedSelection: {
          startLine: 11,
          endLine: 11,
          startPosition: 6,
          endPosition: 16,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should use line-only format for full-block selection with FullLine coverage', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: 10, char: 0 },

          end: { line: 20, char: 0 },
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: 'src/file.ts#L11-L21',
        linkType: 'regular',
        rangeFormat: 'LineOnly',
        selectionType: 'Normal',
        delimiters: defaultDelimiters,
        computedSelection: {
          startLine: 11,
          endLine: 21,
          rangeFormat: 'LineOnly',
        },
      });
    });
  });

  it('should use simple line reference format for single line with FullLine coverage', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: 41, char: 0 },

          end: { line: 41, char: 50 },
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: 'src/file.ts#L42',
        linkType: 'regular',
        rangeFormat: 'LineOnly',
        selectionType: 'Normal',
        delimiters: defaultDelimiters,
        computedSelection: {
          startLine: 42,
          endLine: 42,
          rangeFormat: 'LineOnly',
        },
      });
    });
  });

  it('should use line-only format with EnforceFullLine notation even for PartialLine', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: 10, char: 5 },

          end: { line: 10, char: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
      notation: RangeNotation.EnforceFullLine,
    });

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: 'src/file.ts#L11',
        linkType: 'regular',
        rangeFormat: 'LineOnly',
        selectionType: 'Normal',
        delimiters: defaultDelimiters,
        computedSelection: {
          startLine: 11,
          endLine: 11,
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

    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);
    expect(result).toBeRangeLinkErrorErr('SELECTION_EMPTY', {
      message: 'Selections array must not be empty',
      functionName: 'validateInputSelection',
      details: { selectionsLength: 0 },
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
          start: { line: 9, char: 4 },

          end: { line: 19, char: 14 },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('path/to/file.ts', inputSelection, customDelimiters);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: 'path/to/file.ts>>LINE10COL5thruLINE20COL15',
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Normal',
        delimiters: customDelimiters,
        computedSelection: {
          startLine: 10,
          endLine: 20,
          startPosition: 5,
          endPosition: 15,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should format rectangular selection with double hash', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: 5, char: 10 },

          end: { line: 5, char: 20 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 6, char: 10 },

          end: { line: 6, char: 20 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 7, char: 10 },

          end: { line: 7, char: 20 },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Rectangular,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: 'src/file.ts##L6C11-L8C21',
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Rectangular',
        delimiters: defaultDelimiters,
        computedSelection: {
          startLine: 6,
          endLine: 8,
          startPosition: 11,
          endPosition: 21,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  it('should use WithPositions format with EnforcePositions notation even for FullLine', () => {
    const inputSelection: InputSelection = {
      selections: [
        {
          start: { line: 10, char: 0 },

          end: { line: 20, char: 0 },
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };
    const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
      notation: RangeNotation.EnforcePositions,
    });

    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual({
        link: 'src/file.ts#L11C1-L21C1',
        linkType: 'regular',
        rangeFormat: 'WithPositions',
        selectionType: 'Normal',
        delimiters: defaultDelimiters,
        computedSelection: {
          startLine: 11,
          endLine: 21,
          startPosition: 1,
          endPosition: 1,
          rangeFormat: 'WithPositions',
        },
      });
    });
  });

  describe('portable links', () => {
    it('should append BYOD metadata for single-line FullLine selection', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 41, char: 0 },
            end: { line: 41, char: 50 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: 'src/file.ts#L42~#~L~-~',
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: defaultDelimiters,
          computedSelection: {
            startLine: 42,
            endLine: 42,
            rangeFormat: 'LineOnly',
          },
        });
      });
    });

    it('should append BYOD metadata for multi-line FullLine selection', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 0 },
            end: { line: 20, char: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: 'src/file.ts#L11-L21~#~L~-~',
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: defaultDelimiters,
          computedSelection: {
            startLine: 11,
            endLine: 21,
            rangeFormat: 'LineOnly',
          },
        });
      });
    });

    it('should append BYOD metadata with positions for PartialLine selection', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },
            end: { line: 20, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: 'src/file.ts#L11C6-L21C16~#~L~-~C~',
          linkType: 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Normal',
          delimiters: defaultDelimiters,
          computedSelection: {
            startLine: 11,
            endLine: 21,
            startPosition: 6,
            endPosition: 16,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });

    it('should append BYOD metadata for rectangular selection', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 5, char: 10 },
            end: { line: 5, char: 20 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 6, char: 10 },
            end: { line: 6, char: 20 },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: 7, char: 10 },
            end: { line: 7, char: 20 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };
      const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: 'src/file.ts##L6C11-L8C21~#~L~-~C~',
          linkType: 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Rectangular',
          delimiters: defaultDelimiters,
          computedSelection: {
            startLine: 6,
            endLine: 8,
            startPosition: 11,
            endPosition: 21,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });

    it('should append BYOD metadata with custom delimiters (line-only)', () => {
      const customDelimiters: DelimiterConfig = {
        line: 'LINE',
        position: 'COL',
        hash: '>>',
        range: 'thru',
      };
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 9, char: 0 },
            end: { line: 19, char: 0 },
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
          link: 'path/to/file.ts>>LINE10thruLINE20~>>~LINE~thru~',
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: customDelimiters,
          computedSelection: {
            startLine: 10,
            endLine: 20,
            rangeFormat: 'LineOnly',
          },
        });
      });
    });

    it('should append BYOD metadata with custom delimiters (with positions)', () => {
      const customDelimiters: DelimiterConfig = {
        line: 'LINE',
        position: 'COL',
        hash: '>>',
        range: 'thru',
      };
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 9, char: 4 },
            end: { line: 19, char: 14 },
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
          link: 'path/to/file.ts>>LINE10COL5thruLINE20COL15~>>~LINE~thru~COL~',
          linkType: 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Normal',
          delimiters: customDelimiters,
          computedSelection: {
            startLine: 10,
            endLine: 20,
            startPosition: 5,
            endPosition: 15,
            rangeFormat: 'WithPositions',
          },
        });
      });
    });

    it('should append BYOD metadata for EnforceFullLine notation', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },
            end: { line: 10, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
        notation: RangeNotation.EnforceFullLine,
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: 'src/file.ts#L11~#~L~-~',
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: defaultDelimiters,
          computedSelection: {
            startLine: 11,
            endLine: 11,
            rangeFormat: 'LineOnly',
          },
        });
      });
    });

    it('should append BYOD metadata for EnforcePositions notation', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 0 },
            end: { line: 20, char: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };
      const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
        notation: RangeNotation.EnforcePositions,
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: 'src/file.ts#L11C1-L21C1~#~L~-~C~',
          linkType: 'portable',
          rangeFormat: 'WithPositions',
          selectionType: 'Normal',
          delimiters: defaultDelimiters,
          computedSelection: {
            startLine: 11,
            endLine: 21,
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
      { linkType: LinkType.Portable, suffix: '~#~L~-~C~' },
    ])(
      'should handle end-to-end link generation with linkType=$linkType',
      ({ linkType, suffix }) => {
        const inputSelection: InputSelection = {
          selections: [
            {
              start: { line: 10, char: 5 },
              end: { line: 20, char: 15 },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        };

        const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
          linkType,
        });

        expect(result).toBeOkWith((value: FormattedLink) => {
          expect(value).toStrictEqual({
            link: `src/file.ts#L11C6-L21C16${suffix}`,
            linkType: linkType === LinkType.Regular ? 'regular' : 'portable',
            rangeFormat: 'WithPositions',
            selectionType: 'Normal',
            delimiters: defaultDelimiters,
            computedSelection: {
              startLine: 11,
              endLine: 21,
              startPosition: 6,
              endPosition: 16,
              rangeFormat: 'WithPositions',
            },
          });
        });
      },
    );

    it.each([
      { linkType: LinkType.Regular, suffix: '' },
      { linkType: LinkType.Portable, suffix: '~#~L~-~C~' },
    ])(
      'should handle rectangular selection with linkType=$linkType',
      ({ linkType, suffix }) => {
        const inputSelection: InputSelection = {
          selections: [
            {
              start: { line: 5, char: 10 },
              end: { line: 5, char: 20 },
              coverage: SelectionCoverage.PartialLine,
            },
            {
              start: { line: 6, char: 10 },
              end: { line: 6, char: 20 },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Rectangular,
        };

        const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
          linkType,
        });

        expect(result).toBeOkWith((value: FormattedLink) => {
          expect(value).toStrictEqual({
            link: `src/file.ts##L6C11-L7C21${suffix}`,
            linkType: linkType === LinkType.Regular ? 'regular' : 'portable',
            rangeFormat: 'WithPositions',
            selectionType: 'Rectangular',
            delimiters: defaultDelimiters,
            computedSelection: {
              startLine: 6,
              endLine: 7,
              startPosition: 11,
              endPosition: 21,
              rangeFormat: 'WithPositions',
            },
          });
        });
      },
    );

    it.each([
      { linkType: LinkType.Regular },
      { linkType: LinkType.Portable },
    ])('should propagate errors correctly with linkType=$linkType', ({ linkType }) => {
      const inputSelection: InputSelection = {
        selections: [],
        selectionType: SelectionType.Normal,
      };

      const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
        linkType,
      });

      expect(result).toBeRangeLinkErrorErr('SELECTION_EMPTY', {
        message: 'Selections array must not be empty',
        functionName: 'validateInputSelection',
        details: { selectionsLength: 0 },
      });
    });
  });

  describe('logging integration', () => {
    it('should log with correct attributes through standard anchor path', () => {
      // Integration test: Verifies formatLink → finalizeLinkGeneration → logger flow
      // Tests standard anchor path (multi-line PartialLine selection)

      const mockDebug = jest.fn();
      jest.spyOn(getLogger(), 'debug').mockImplementation(mockDebug);

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 10, char: 5 },
            end: { line: 20, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      // Call formatLink (internally generates logContext that would collide)
      const result = formatLink('src/file.ts', inputSelection, defaultDelimiters);

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: 'src/file.ts#L11C6-L21C16',
          linkType: 'regular',
          rangeFormat: 'WithPositions',
          selectionType: 'Normal',
          delimiters: defaultDelimiters,
          computedSelection: {
            startLine: 11,
            endLine: 21,
            startPosition: 6,
            endPosition: 16,
            rangeFormat: 'WithPositions',
          },
        });
      });

      // Verify logger.debug was called
      expect(mockDebug).toHaveBeenCalledTimes(1);

      // Extract the actual context object passed to logger.debug
      const [[loggedContext, loggedMessage]] = mockDebug.mock.calls;

      // Verify core logging attributes
      expect(loggedContext).toHaveProperty('fn', 'formatLink');
      expect(loggedContext).toHaveProperty('link', 'src/file.ts#L11C6-L21C16');
      expect(loggedContext).toHaveProperty('linkLength', 24);

      // Verify extra context attributes from generator
      expect(loggedContext).toHaveProperty('selectionType', 'Normal');
      expect(loggedContext).toHaveProperty('rangeFormat', 'WithPositions');

      // Verify log message
      expect(loggedMessage).toBe('Generated link');

      mockDebug.mockRestore();
    });

    it('should log with correct attributes through simple line reference path', () => {
      // Integration test: Verifies portable link generation through simple line reference path
      // Tests single-line FullLine selection (uses formatSimpleLineReference)
      const mockDebug = jest.fn();
      jest.spyOn(getLogger(), 'debug').mockImplementation(mockDebug);

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 41, char: 0 },
            end: { line: 41, char: 50 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      const result = formatLink('src/file.ts', inputSelection, defaultDelimiters, {
        linkType: LinkType.Portable,
      });

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value).toStrictEqual({
          link: 'src/file.ts#L42~#~L~-~',
          linkType: 'portable',
          rangeFormat: 'LineOnly',
          selectionType: 'Normal',
          delimiters: defaultDelimiters,
          computedSelection: {
            startLine: 42,
            endLine: 42,
            rangeFormat: 'LineOnly',
          },
        });
      });

      expect(mockDebug).toHaveBeenCalledTimes(1);
      const [[loggedContext]] = mockDebug.mock.calls;

      // Verify core logging attributes
      expect(loggedContext).toHaveProperty('fn', 'formatLink');
      expect(loggedContext).toHaveProperty('link', 'src/file.ts#L42~#~L~-~');
      expect(loggedContext).toHaveProperty('linkLength', 22);

      // Verify simple line reference context
      expect(loggedContext).toHaveProperty('format', 'simple');

      mockDebug.mockRestore();
    });
  });
});
