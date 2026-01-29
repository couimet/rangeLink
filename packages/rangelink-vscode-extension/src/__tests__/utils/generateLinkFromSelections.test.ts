import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';
import {
  CoreResult,
  DelimiterConfig,
  type FormattedLink,
  LinkType,
  SelectionCoverage,
  SelectionType,
} from 'rangelink-core-ts';
import * as rangeLinkCore from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { RangeLinkExtensionError } from '../../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../../errors/RangeLinkExtensionErrorCodes';
import { ExtensionResult } from '../../types';
import {
  generateLinkFromSelections,
  GenerateLinkFromSelectionsOptions,
} from '../../utils/generateLinkFromSelections';
import * as toInputSelectionModule from '../../utils/toInputSelection';
import {
  createMockDocument,
  createMockFormattedLink,
  createMockPosition,
  createMockSelection,
} from '../helpers';

const DELIMITERS: DelimiterConfig = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
};

const REFERENCE_PATH = 'src/utils/test.ts';

const mockSelection = (
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
  isEmpty = false,
): vscode.Selection => {
  const start = createMockPosition({ line: startLine, character: startCharacter });
  const end = createMockPosition({ line: endLine, character: endCharacter });
  return createMockSelection({
    anchor: start,
    active: end,
    start,
    end,
    isReversed: false,
    isEmpty,
  });
};

const createMockDocumentForTest = (): vscode.TextDocument => {
  const lines = ['const foo = "bar";', 'const baz = 42;', ''];
  return createMockDocument({
    uri: { fsPath: '/project/src/utils/test.ts' } as vscode.Uri,
    lineCount: lines.length,
    getText: jest.fn(() => lines.join('\n')),
    lineAt: jest.fn((line: number) => ({
      text: lines[line] || '',
      lineNumber: line,
      range: { end: { character: (lines[line] || '').length } },
      rangeIncludingLineBreak: { end: { character: (lines[line] || '').length + 1 } },
      firstNonWhitespaceCharacterIndex: 0,
      isEmptyOrWhitespace: (lines[line] || '').trim() === '',
    })) as unknown as vscode.TextDocument['lineAt'],
  });
};

describe('generateLinkFromSelections', () => {
  let mockLogger: Logger;
  let document: vscode.TextDocument;

  beforeEach(() => {
    mockLogger = createMockLogger();
    document = createMockDocumentForTest();
  });

  describe('input validation', () => {
    it('returns error when selections array is empty', () => {
      const options: GenerateLinkFromSelectionsOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [],
        delimiters: DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      };

      const result = generateLinkFromSelections(options);

      expect(result).toBeRangeLinkExtensionErrorErr('GENERATE_LINK_NO_SELECTION', {
        message: 'No selections provided',
        functionName: 'generateLinkFromSelections',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections' },
        'No selections provided',
      );
    });

    it('returns error when all selections are empty', () => {
      const emptySelection = mockSelection(0, 5, 0, 5, true);

      const options: GenerateLinkFromSelectionsOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [emptySelection],
        delimiters: DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      };

      const result = generateLinkFromSelections(options);

      expect(result).toBeRangeLinkExtensionErrorErr('GENERATE_LINK_SELECTION_EMPTY', {
        message: 'All selections are empty',
        functionName: 'generateLinkFromSelections',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections' },
        'All selections are empty',
      );
    });
  });

  describe('successful link generation', () => {
    it('generates regular link for single line selection', () => {
      const selection = mockSelection(0, 0, 0, 10);
      const expectedLink = createMockFormattedLink('src/utils/test.ts#L1C1-C11');

      jest.spyOn(toInputSelectionModule, 'toInputSelection').mockReturnValue(
        ExtensionResult.ok({
          selections: [
            {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        }),
      );

      jest.spyOn(rangeLinkCore, 'formatLink').mockReturnValue(CoreResult.ok(expectedLink));

      const options: GenerateLinkFromSelectionsOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [selection],
        delimiters: DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      };

      const result = generateLinkFromSelections(options);

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value.link).toBe('src/utils/test.ts#L1C1-C11');
        expect(value.linkType).toBe('regular');
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections', formattedLink: expectedLink },
        'Generated link: src/utils/test.ts#L1C1-C11',
      );
    });

    it('generates portable link when linkType is Portable', () => {
      const selection = mockSelection(0, 0, 0, 10);
      const expectedLink = createMockFormattedLink('src/utils/test.ts#[L:C:_:-]L1C1-C11', {
        linkType: LinkType.Portable,
      });

      jest.spyOn(toInputSelectionModule, 'toInputSelection').mockReturnValue(
        ExtensionResult.ok({
          selections: [
            {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        }),
      );

      jest.spyOn(rangeLinkCore, 'formatLink').mockReturnValue(CoreResult.ok(expectedLink));

      const options: GenerateLinkFromSelectionsOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [selection],
        delimiters: DELIMITERS,
        linkType: LinkType.Portable,
        logger: mockLogger,
      };

      const result = generateLinkFromSelections(options);

      expect(result).toBeOkWith((value: FormattedLink) => {
        expect(value.linkType).toBe('portable');
      });
      expect(rangeLinkCore.formatLink).toHaveBeenCalledWith(
        REFERENCE_PATH,
        {
          selections: [
            {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        },
        DELIMITERS,
        { linkType: LinkType.Portable },
      );
    });
  });

  describe('error handling', () => {
    it('returns error when toInputSelection returns error Result', () => {
      const selection = mockSelection(0, 0, 0, 10);
      const conversionError = new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.SELECTION_CONVERSION_FAILED,
        message: 'Document modified during selection',
        functionName: 'toInputSelection',
      });

      jest
        .spyOn(toInputSelectionModule, 'toInputSelection')
        .mockReturnValue(ExtensionResult.err(conversionError));

      const options: GenerateLinkFromSelectionsOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [selection],
        delimiters: DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      };

      const result = generateLinkFromSelections(options);

      expect(result).toBeRangeLinkExtensionErrorErr('GENERATE_LINK_SELECTION_CONVERSION_FAILED', {
        message: 'Document modified during selection',
        functionName: 'generateLinkFromSelections',
        cause: conversionError,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections', error: conversionError },
        'Failed to convert selections to InputSelection',
      );
    });

    it('returns error when formatLink fails', () => {
      const selection = mockSelection(0, 0, 0, 10);

      jest.spyOn(toInputSelectionModule, 'toInputSelection').mockReturnValue(
        ExtensionResult.ok({
          selections: [
            {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        }),
      );

      const formatLinkError = new rangeLinkCore.RangeLinkError({
        code: rangeLinkCore.RangeLinkErrorCodes.VALIDATION,
        message: 'Invalid selection range',
        functionName: 'formatLink',
      });
      jest.spyOn(rangeLinkCore, 'formatLink').mockReturnValue(CoreResult.err(formatLinkError));

      const options: GenerateLinkFromSelectionsOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [selection],
        delimiters: DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      };

      const result = generateLinkFromSelections(options);

      expect(result).toBeRangeLinkExtensionErrorErr('GENERATE_LINK_FORMAT_FAILED', {
        message: 'Failed to generate link',
        functionName: 'generateLinkFromSelections',
        cause: formatLinkError,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections', error: formatLinkError },
        'Failed to generate link',
      );
    });

    it('returns error with portable link type name when portable link fails', () => {
      const selection = mockSelection(0, 0, 0, 10);

      jest.spyOn(toInputSelectionModule, 'toInputSelection').mockReturnValue(
        ExtensionResult.ok({
          selections: [
            {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        }),
      );

      const formatLinkError = new rangeLinkCore.RangeLinkError({
        code: rangeLinkCore.RangeLinkErrorCodes.VALIDATION,
        message: 'Invalid selection range',
        functionName: 'formatLink',
      });
      jest.spyOn(rangeLinkCore, 'formatLink').mockReturnValue(CoreResult.err(formatLinkError));

      const options: GenerateLinkFromSelectionsOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [selection],
        delimiters: DELIMITERS,
        linkType: LinkType.Portable,
        logger: mockLogger,
      };

      const result = generateLinkFromSelections(options);

      expect(result).toBeRangeLinkExtensionErrorErr('GENERATE_LINK_FORMAT_FAILED', {
        message: 'Failed to generate portable link',
        functionName: 'generateLinkFromSelections',
        cause: formatLinkError,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections', error: formatLinkError },
        'Failed to generate portable link',
      );
    });
  });
});
