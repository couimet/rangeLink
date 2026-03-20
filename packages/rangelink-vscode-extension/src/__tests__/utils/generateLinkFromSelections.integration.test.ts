/**
 * Integration tests for trailing newline normalization (issue #306).
 *
 * These tests verify the full flow from VSCode selection to link output WITHOUT mocking
 * toInputSelection or formatLink. They ensure that selections ending at the start of the
 * next line (e.g., Ctrl+L) produce line-only links (#L5, #L5-L10) without character positions.
 *
 * Purpose: Ensure mocks used in unit tests accurately represent real rangelink-core-ts behavior.
 */
import { createMockLogger } from 'barebone-logger-testing';
import { type DelimiterConfig, type FormattedLink, LinkType } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import {
  generateLinkFromSelections,
  type GenerateLinkFromSelectionsOptions,
} from '../../utils/generateLinkFromSelections';
import { createMockDocument, createMockPosition, createMockSelection } from '../helpers';

const DELIMITERS: DelimiterConfig = {
  line: 'L',
  position: 'C',
  hash: '#',
  range: '-',
};

let mockLogger: ReturnType<typeof createMockLogger>;

const mockSelection = (
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number,
): vscode.Selection => {
  const start = createMockPosition({ line: startLine, character: startCharacter });
  const end = createMockPosition({ line: endLine, character: endCharacter });
  return createMockSelection({
    anchor: start,
    active: end,
    start,
    end,
    isReversed: false,
    isEmpty: false,
  });
};

const createDocumentWithLines = (lines: string[]): vscode.TextDocument => {
  return createMockDocument({
    uri: { fsPath: '/project/src/file.ts' } as vscode.Uri,
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

describe('trailing newline normalization integration', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('single full-line selection (Ctrl+L) produces #L5 without character positions', () => {
    const lines = ['line 0', 'line 1', 'line 2', 'line 3', 'line 4 content here', 'line 5'];
    const doc = createDocumentWithLines(lines);
    const selection = mockSelection(4, 0, 5, 0);

    const options: GenerateLinkFromSelectionsOptions = {
      referencePath: 'src/file.ts',
      document: doc,
      selections: [selection],
      delimiters: DELIMITERS,
      linkType: LinkType.Regular,
      logger: mockLogger,
    };

    const result = generateLinkFromSelections(options);

    const expectedFormattedLink = {
      link: 'src/file.ts#L5',
      rawLink: 'src/file.ts#L5',
      linkType: 'regular',
      delimiters: DELIMITERS,
      computedSelection: {
        startLine: 5,
        endLine: 5,
        rangeFormat: 'LineOnly',
      },
      rangeFormat: 'LineOnly',
      selectionType: 'Normal',
    };
    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual(expectedFormattedLink);
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'generateLinkFromSelections', formattedLink: expectedFormattedLink },
      'Generated link: src/file.ts#L5',
    );
  });

  it('multi-line full selection (Ctrl+L x3) produces #L5-L7 without character positions', () => {
    const lines = ['line 0', 'line 1', 'line 2', 'line 3', 'line 4', 'line 5', 'line 6', 'line 7'];
    const doc = createDocumentWithLines(lines);
    const selection = mockSelection(4, 0, 7, 0);

    const options: GenerateLinkFromSelectionsOptions = {
      referencePath: 'src/file.ts',
      document: doc,
      selections: [selection],
      delimiters: DELIMITERS,
      linkType: LinkType.Regular,
      logger: mockLogger,
    };

    const result = generateLinkFromSelections(options);

    const expectedFormattedLink = {
      link: 'src/file.ts#L5-L7',
      rawLink: 'src/file.ts#L5-L7',
      linkType: 'regular',
      delimiters: DELIMITERS,
      computedSelection: {
        startLine: 5,
        endLine: 7,
        rangeFormat: 'LineOnly',
      },
      rangeFormat: 'LineOnly',
      selectionType: 'Normal',
    };
    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual(expectedFormattedLink);
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'generateLinkFromSelections', formattedLink: expectedFormattedLink },
      'Generated link: src/file.ts#L5-L7',
    );
  });

  it('partial selection ending at next line start produces link with character positions', () => {
    const lines = ['line 0', 'line 1', 'line 2', 'line 3', 'partial start here', 'line 5'];
    const doc = createDocumentWithLines(lines);
    const selection = mockSelection(4, 8, 5, 0);

    const options: GenerateLinkFromSelectionsOptions = {
      referencePath: 'src/file.ts',
      document: doc,
      selections: [selection],
      delimiters: DELIMITERS,
      linkType: LinkType.Regular,
      logger: mockLogger,
    };

    const result = generateLinkFromSelections(options);

    const expectedFormattedLink = {
      link: 'src/file.ts#L5C9-L5C19',
      rawLink: 'src/file.ts#L5C9-L5C19',
      linkType: 'regular',
      delimiters: DELIMITERS,
      computedSelection: {
        startLine: 5,
        endLine: 5,
        startPosition: 9,
        endPosition: 19,
        rangeFormat: 'WithPositions',
      },
      rangeFormat: 'WithPositions',
      selectionType: 'Normal',
    };
    expect(result).toBeOkWith((value: FormattedLink) => {
      expect(value).toStrictEqual(expectedFormattedLink);
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'generateLinkFromSelections', formattedLink: expectedFormattedLink },
      'Generated link: src/file.ts#L5C9-L5C19',
    );
  });
});
