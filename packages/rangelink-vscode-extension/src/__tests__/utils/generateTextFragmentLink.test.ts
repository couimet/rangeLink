import { generateTextFragmentLink, GenerateTextFragmentLinkOptions } from '../../utils/generateTextFragmentLink';
import { createMockDocument, createMockPosition, createMockSelection, spyOnFormatTextFragment } from '../helpers';

import type { Logger } from '@couimet/logger-contract';
import { createMockLogger } from '@couimet/logger-contract-testing';
import { TextFragmentError, TextFragmentErrorCodes, TextFragmentResult } from 'text-fragment-ts';
import * as vscode from 'vscode';

const REFERENCE_PATH = 'src/utils/test.ts';

const mockSelection = (startLine: number, startCharacter: number, endLine: number, endCharacter: number, isEmpty = false): vscode.Selection => {
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

// `getText()` returns the full document; `getText(range)` returns the selected
// text. Positions in `range` are not honored here - the range-aware geometry is
// exercised by the integration test against a real offset model.
const createMockDocumentForTest = (fullText: string, selectionText: string): vscode.TextDocument =>
  createMockDocument({
    uri: { fsPath: '/project/src/utils/test.ts' } as vscode.Uri,
    getText: jest.fn((range?: vscode.Range): string => (range === undefined ? fullText : selectionText)),
  });

describe('generateTextFragmentLink', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('input validation', () => {
    it('returns error when selections array is empty', () => {
      const document = createMockDocumentForTest('', '');

      const options: GenerateTextFragmentLinkOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [],
        logger: mockLogger,
      };

      const result = generateTextFragmentLink(options);

      expect(result).toHaveDetailedError('GENERATE_LINK_NO_SELECTION', {
        message: 'No selections provided',
        functionName: 'generateTextFragmentLink',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'generateTextFragmentLink' }, 'No selections provided');
    });

    it('returns error when the single selection is empty', () => {
      const document = createMockDocumentForTest('', '');
      const emptySelection = mockSelection(0, 5, 0, 5, true);

      const options: GenerateTextFragmentLinkOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [emptySelection],
        logger: mockLogger,
      };

      const result = generateTextFragmentLink(options);

      expect(result).toHaveDetailedError('GENERATE_LINK_SELECTION_EMPTY', {
        message: 'All selections are empty',
        functionName: 'generateTextFragmentLink',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'generateTextFragmentLink' }, 'All selections are empty');
    });

    it('returns error when multiple selections are present', () => {
      const document = createMockDocumentForTest('', '');
      const firstSelection = mockSelection(0, 0, 0, 3);
      const secondSelection = mockSelection(1, 0, 1, 3);

      const options: GenerateTextFragmentLinkOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [firstSelection, secondSelection],
        logger: mockLogger,
      };

      const result = generateTextFragmentLink(options);

      expect(result).toHaveDetailedError('GENERATE_TEXT_FRAGMENT_MULTIPLE_SELECTIONS', {
        message: 'Text fragment links require exactly one selection',
        functionName: 'generateTextFragmentLink',
        details: { selectionCount: 2 },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'generateTextFragmentLink', selectionCount: 2 }, 'Text fragment links require exactly one selection');
    });
  });

  describe('successful link generation', () => {
    it('generates a text fragment link from a unique single-line selection', () => {
      const selectionText = 'const value = 1;';
      const document = createMockDocumentForTest(`line before\n${selectionText}\nline after`, selectionText);
      const selection = mockSelection(1, 0, 1, selectionText.length);
      const expectedLink = 'src/utils/test.ts:~:text=const%20value%20%3D%201%3B';
      const formatTextFragmentSpy = spyOnFormatTextFragment().mockReturnValue(TextFragmentResult.ok(expectedLink));

      const options: GenerateTextFragmentLinkOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [selection],
        logger: mockLogger,
      };

      const result = generateTextFragmentLink(options);

      expect(formatTextFragmentSpy).toHaveBeenCalledWith(REFERENCE_PATH, { start: selectionText });
      expect(result).toBeSuccessWith((link: string) => {
        expect(link).toBe(expectedLink);
      });
      expect(mockLogger.info).toHaveBeenCalledWith({ fn: 'generateTextFragmentLink', link: expectedLink }, `Generated text fragment link: ${expectedLink}`);
    });

    it('normalizes CRLF selection text to LF before formatting', () => {
      const document = createMockDocumentForTest('head\r\nfirst\r\nsecond\r\ntail', 'first\r\nsecond');
      const selection = mockSelection(1, 0, 2, 6);
      const expectedLink = 'src/utils/test.ts:~:text=first%0Asecond';
      const formatTextFragmentSpy = spyOnFormatTextFragment().mockReturnValue(TextFragmentResult.ok(expectedLink));

      const options: GenerateTextFragmentLinkOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [selection],
        logger: mockLogger,
      };

      const result = generateTextFragmentLink(options);

      expect(formatTextFragmentSpy).toHaveBeenCalledWith(REFERENCE_PATH, { start: 'first\nsecond' });
      expect(result).toBeSuccessWith((link: string) => {
        expect(link).toBe(expectedLink);
      });
    });
  });

  describe('error handling', () => {
    it('returns error when selected text occurs more than once in the document', () => {
      const document = createMockDocumentForTest('token and token', 'token');
      const selection = mockSelection(0, 0, 0, 5);
      const formatTextFragmentSpy = spyOnFormatTextFragment();

      const options: GenerateTextFragmentLinkOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [selection],
        logger: mockLogger,
      };

      const result = generateTextFragmentLink(options);

      expect(result).toHaveDetailedError('GENERATE_TEXT_FRAGMENT_TEXT_NOT_UNIQUE', {
        message: 'Selected text must be unique to generate a text fragment link',
        functionName: 'generateTextFragmentLink',
        details: { count: 2 },
      });
      expect(formatTextFragmentSpy).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'generateTextFragmentLink', count: 2 }, 'Selected text is not unique in document');
    });

    it('propagates the error when formatTextFragment fails', () => {
      const selectionText = 'const value = 1;';
      const document = createMockDocumentForTest(`line before\n${selectionText}\nline after`, selectionText);
      const selection = mockSelection(1, 0, 1, selectionText.length);
      const formatError = new TextFragmentError({
        code: TextFragmentErrorCodes.PARSE_LINK_TOO_LONG,
        message: 'Link exceeds maximum length of 3000 characters',
        functionName: 'formatTextFragment',
      });
      spyOnFormatTextFragment().mockReturnValue(TextFragmentResult.err(formatError));

      const options: GenerateTextFragmentLinkOptions = {
        referencePath: REFERENCE_PATH,
        document,
        selections: [selection],
        logger: mockLogger,
      };

      const result = generateTextFragmentLink(options);

      expect(result).toHaveDetailedError('PARSE_LINK_TOO_LONG', {
        message: 'Link exceeds maximum length of 3000 characters',
        functionName: 'formatTextFragment',
      });
      expect(mockLogger.error).toHaveBeenCalledWith({ fn: 'generateTextFragmentLink', error: formatError }, 'Failed to generate text fragment link');
    });
  });
});
