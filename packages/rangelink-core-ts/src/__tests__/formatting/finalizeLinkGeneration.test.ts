import { getLogger } from 'barebone-logger';

import {
  finalizeLinkGeneration,
  LinkGenerationResult,
} from '../../formatting/finalizeLinkGeneration';
import { DelimiterConfig } from '../../types/DelimiterConfig';
import { LinkType } from '../../types/LinkType';
import { RangeFormat } from '../../types/RangeFormat';
import { SelectionCoverage } from '../../types/SelectionCoverage';
import { SelectionType } from '../../types/SelectionType';

describe('finalizeLinkGeneration', () => {
  const defaultDelimiters: DelimiterConfig = {
    line: 'L',
    position: 'C',
    hash: '#',
    range: '-',
  };

  it('should finalize link generation with regular linkType', () => {
    const generateLink = (): LinkGenerationResult => ({
      link: 'src/file.ts#L10-L20',
      logContext: {
        format: 'standard',
      },
    });

    const spec = {
      startLine: 10,
      endLine: 20,
      rangeFormat: RangeFormat.LineOnly,
    };

    const inputSelection = {
      selections: [
        {
          start: { line: 9, char: 0 },
          end: { line: 19, char: 0 },
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };

    const result = finalizeLinkGeneration(
      generateLink,
      spec,
      inputSelection,
      LinkType.Regular,
      defaultDelimiters,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.link).toBe('src/file.ts#L10-L20');
      expect(result.value.linkType).toBe('regular');
    }
  });

  it('should append portable metadata for portable linkType', () => {
    const generateLink = (): LinkGenerationResult => ({
      link: 'src/file.ts#L10-L20',
      logContext: {},
    });

    const spec = {
      startLine: 10,
      endLine: 20,
      rangeFormat: RangeFormat.LineOnly,
    };

    const inputSelection = {
      selections: [
        {
          start: { line: 9, char: 0 },
          end: { line: 19, char: 0 },
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };

    const result = finalizeLinkGeneration(
      generateLink,
      spec,
      inputSelection,
      LinkType.Portable,
      defaultDelimiters,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.link).toBe('src/file.ts#L10-L20~#~L~-~');
      expect(result.value.linkType).toBe('portable');
    }
  });

  it('should protect core attributes from logContext collisions', () => {
    // CRITICAL TEST: Verifies that spread order protects core attributes
    // Even if logContext contains 'fn', 'link', or 'linkLength', our values must win

    const mockDebug = jest.fn();
    jest.spyOn(getLogger(), 'debug').mockImplementation(mockDebug);

    // Create malicious generator that returns logContext with colliding keys
    const maliciousGenerator = (): LinkGenerationResult => ({
      link: 'src/test.ts#L10',
      logContext: {
        fn: 'EVIL_FUNCTION', // Try to override fn
        link: 'EVIL_LINK', // Try to override link
        linkLength: 9999, // Try to override linkLength
        extraAttribute: 'should-be-preserved',
      },
    });

    const spec = {
      startLine: 10,
      endLine: 10,
      rangeFormat: RangeFormat.LineOnly,
    };

    const inputSelection = {
      selections: [
        {
          start: { line: 9, char: 0 },
          end: { line: 9, char: 50 },
          coverage: SelectionCoverage.FullLine,
        },
      ],
      selectionType: SelectionType.Normal,
    };

    const result = finalizeLinkGeneration(
      maliciousGenerator,
      spec,
      inputSelection,
      LinkType.Regular,
      defaultDelimiters,
    );

    // Verify function succeeded
    expect(result.success).toBe(true);

    // CRITICAL ASSERTIONS: Our attributes must win over malicious logContext
    expect(mockDebug).toHaveBeenCalledWith(
      {
        fn: 'formatLink', // NOT 'EVIL_FUNCTION'
        link: 'src/test.ts#L10', // NOT 'EVIL_LINK'
        linkLength: 15, // NOT 9999
        extraAttribute: 'should-be-preserved', // Extra attributes preserved
      },
      'Generated link',
    );

    mockDebug.mockRestore();
  });

  it('should include all fields in FormattedLink result', () => {
    const generateLink = (): LinkGenerationResult => ({
      link: 'src/file.ts#L5C10-L15C20',
      logContext: {},
    });

    const spec = {
      startLine: 5,
      endLine: 15,
      startPosition: 10,
      endPosition: 20,
      rangeFormat: RangeFormat.WithPositions,
    };

    const inputSelection = {
      selections: [
        {
          start: { line: 4, char: 9 },
          end: { line: 14, char: 19 },
          coverage: SelectionCoverage.PartialLine,
        },
      ],
      selectionType: SelectionType.Rectangular,
    };

    const result = finalizeLinkGeneration(
      generateLink,
      spec,
      inputSelection,
      LinkType.Regular,
      defaultDelimiters,
    );

    expect(result).toBeOkWith((value) => {
      expect(value).toStrictEqual({
        link: 'src/file.ts#L5C10-L15C20',
        linkType: 'regular',
        delimiters: defaultDelimiters,
        computedSelection: spec,
        rangeFormat: 'WithPositions',
        selectionType: 'Rectangular',
      });
    });
  });
});
