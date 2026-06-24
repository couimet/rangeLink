import { getRandomInt, getUniqueInt } from '@couimet/dynamic-testing';
import type { Logger } from '@couimet/logger-contract';
import { createMockLogger } from '@couimet/logger-contract-testing';
import { InputSelection } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { isRectangularSelection } from '../isRectangularSelection';
import { toInputSelection } from '../utils';

// Mock the isRectangularSelection function
jest.mock('../isRectangularSelection');

let mockLogger: Logger;

/**
 * Helper to create a mock vscode.Selection
 */
const createSelection = (
  startLine: number,
  startPosition: number,
  endLine: number,
  endPosition: number,
): vscode.Selection => {
  return {
    start: { line: startLine, character: startPosition },
    end: { line: endLine, character: endPosition },
    anchor: { line: startLine, character: startPosition },
    active: { line: endLine, character: endPosition },
    isReversed: false,
    isEmpty: startLine === endLine && startPosition === endPosition,
  } as vscode.Selection;
};

/**
 * Helper to create a mock TextEditor
 */
const createMockEditor = (
  selections: vscode.Selection[],
  lineTexts: string[],
): vscode.TextEditor => {
  const mockDocument = {
    lineAt: jest.fn((lineNumber: number) => {
      const text = lineTexts[lineNumber] ?? '';
      return {
        text,
        range: {
          start: { character: 0 },
          end: { character: text.length },
        },
      };
    }),
    lineCount: lineTexts.length,
  } as unknown as vscode.TextDocument;

  return {
    document: mockDocument,
    selections,
  } as unknown as vscode.TextEditor;
};

describe('toInputSelection', () => {
  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('Selection coverage detection', () => {
    describe('FullLine coverage', () => {
      it('should detect FullLine when selection starts at column 0 and ends at line end', () => {
        const lineText = 'const x = 5;';
        const editor = createMockEditor([createSelection(0, 0, 0, lineText.length)], [lineText]);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          expect(value.selections).toHaveLength(1);
          expect(value.selections[0].coverage).toBe('FullLine');
          expect(value.selections[0].start).toStrictEqual({ line: 0, character: 0 });
          expect(value.selections[0].end).toStrictEqual({ line: 0, character: lineText.length });
        });
      });

      it('should detect FullLine when selection extends beyond actual line end', () => {
        const lineText = 'const x = 5;';
        const editor = createMockEditor(
          [createSelection(0, 0, 0, lineText.length + 10)],
          [lineText],
        );

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          expect(value.selections[0].coverage).toBe('FullLine');
        });
      });

      it('should detect FullLine for multi-line selection ending at start of next line (char 0)', () => {
        const lineTexts = ['line one', 'line two', 'line three'];
        const editor = createMockEditor([createSelection(0, 0, 2, 0)], lineTexts);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          // The selection is processed as a single selection from line 0 to line 2
          // Character 0 at end of multi-line selection counts as full line
          expect(value.selections[0].coverage).toBe('FullLine');
          // Verify normalized coordinates: end line adjusted from 2 to 1
          expect(value.selections[0].start).toStrictEqual({ line: 0, character: 0 });
          expect(value.selections[0].end).toStrictEqual({ line: 1, character: 8 });
        });
      });

      it('should normalize end line when single-line selection includes trailing newline', () => {
        // VSCode reports L0 C0 → L1 C0 when selecting line 0 + newline
        const lineTexts = ['line zero content', 'line one'];
        const editor = createMockEditor([createSelection(0, 0, 1, 0)], lineTexts);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          expect(value.selections[0].coverage).toBe('FullLine');
          expect(value.selections[0].start).toStrictEqual({ line: 0, character: 0 });
          expect(value.selections[0].end).toStrictEqual({ line: 0, character: 17 });
        });
      });

      it('should normalize end line when multi-line selection includes trailing newline', () => {
        // VSCode reports L0 C0 → L3 C0 when selecting lines 0-2 + newline
        const lineTexts = ['line zero', 'line one', 'line two', 'line three'];
        const editor = createMockEditor([createSelection(0, 0, 3, 0)], lineTexts);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          expect(value.selections[0].coverage).toBe('FullLine');
          expect(value.selections[0].start).toStrictEqual({ line: 0, character: 0 });
          expect(value.selections[0].end).toStrictEqual({ line: 2, character: 8 });
        });
      });
    });

    describe('PartialLine coverage', () => {
      it('should detect PartialLine when selection does not start at column 0', () => {
        const lineText = 'const x = 5;';
        const startPosition = getUniqueInt();
        const editor = createMockEditor(
          [createSelection(0, startPosition, 0, lineText.length)],
          [lineText],
        );

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          expect(value.selections[0].coverage).toBe('PartialLine');
          expect(value.selections[0].start).toStrictEqual({ line: 0, character: startPosition });
        });
      });

      it('should detect PartialLine when selection does not reach end of line', () => {
        const lineText = 'const x = 5; more text';
        const endPosition = getRandomInt(1, lineText.length - 1);
        const editor = createMockEditor([createSelection(0, 0, 0, endPosition)], [lineText]);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          expect(value.selections[0].coverage).toBe('PartialLine');
          expect(value.selections[0].end).toStrictEqual({ line: 0, character: endPosition });
        });
      });

      it('should detect PartialLine when selection starts mid-line and ends mid-line', () => {
        const lineText = 'const x = 5; more text';
        const startPosition = getUniqueInt();
        const endPosition = startPosition + 5;
        const editor = createMockEditor(
          [createSelection(0, startPosition, 0, endPosition)],
          [lineText],
        );

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          expect(value.selections[0].coverage).toBe('PartialLine');
        });
      });

      it('should detect PartialLine for empty line when selection is not full coverage', () => {
        const editor = createMockEditor([createSelection(0, 0, 0, 0)], ['']);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          // Empty selection at start of empty line - technically FullLine
          expect(value.selections[0].coverage).toBe('FullLine');
        });
      });

      it('should normalize end line for partial selection ending at next line char 0', () => {
        // User selects from L0 C5 to L1 C0 (partial start, includes newline)
        const startPosition = getUniqueInt();
        const lineTexts = ['line zero content', 'line one'];
        const editor = createMockEditor([createSelection(0, startPosition, 1, 0)], lineTexts);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor.document, editor.selections, mockLogger);

        expect(result).toBeOkWith((value: InputSelection) => {
          expect(value.selections[0].coverage).toBe('PartialLine'); // NOT FullLine (start != 0)
          expect(value.selections[0].start).toStrictEqual({ line: 0, character: startPosition });
          expect(value.selections[0].end).toStrictEqual({
            line: 0,
            character: lineTexts[0].length,
          });
        });
      });
    });
  });

  describe('Rectangular selection delegation', () => {
    it('should call isRectangularSelection with provided selections', () => {
      const startLine = getUniqueInt();
      const startPosition = getUniqueInt();
      const endPosition = startPosition + 5;
      const selections = [
        createSelection(startLine, startPosition, startLine, endPosition),
        createSelection(startLine + 1, startPosition, startLine + 1, endPosition),
        createSelection(startLine + 2, startPosition, startLine + 2, endPosition),
      ];
      const lineTexts: string[] = [];
      lineTexts[startLine] = 'line one';
      lineTexts[startLine + 1] = 'line two';
      lineTexts[startLine + 2] = 'line three';
      const editor = createMockEditor(selections, lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(true);

      toInputSelection(editor.document, selections, mockLogger);

      expect(isRectangularSelection).toHaveBeenCalledWith(selections);
      expect(isRectangularSelection).toHaveBeenCalledTimes(1);
    });

    it('should return SelectionType.Rectangular when isRectangularSelection returns true', () => {
      const startLine = getUniqueInt();
      const startPosition = getUniqueInt();
      const endPosition = startPosition + 5;
      const selections = [
        createSelection(startLine, startPosition, startLine, endPosition),
        createSelection(startLine + 1, startPosition, startLine + 1, endPosition),
      ];
      const lineTexts: string[] = [];
      lineTexts[startLine] = 'line one';
      lineTexts[startLine + 1] = 'line two';
      const editor = createMockEditor(selections, lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(true);

      const result = toInputSelection(editor.document, selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selectionType).toBe('Rectangular');
        expect(value.selections).toHaveLength(2); // Both selections converted
      });
    });

    it('should return SelectionType.Normal when isRectangularSelection returns false', () => {
      const startLine = getUniqueInt();
      const startPosition = getUniqueInt();
      const endPosition = startPosition + 5;
      const selections = [
        createSelection(startLine, startPosition, startLine, endPosition),
        createSelection(startLine + 2, startPosition + 1, startLine + 2, endPosition + 1), // Non-rectangular
      ];
      const lineTexts: string[] = [];
      lineTexts[startLine] = 'line one';
      lineTexts[startLine + 1] = 'line two';
      lineTexts[startLine + 2] = 'line three';
      const editor = createMockEditor(selections, lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selectionType).toBe('Normal');
        expect(value.selections).toHaveLength(1); // Only first selection used
      });
    });

    it('should convert all selections when rectangular', () => {
      const startLine = getUniqueInt();
      const startPosition = getUniqueInt();
      const endPosition = startPosition + 5;
      const selections = [
        createSelection(startLine, startPosition, startLine, endPosition),
        createSelection(startLine + 1, startPosition, startLine + 1, endPosition),
        createSelection(startLine + 2, startPosition, startLine + 2, endPosition),
      ];
      const lineTexts: string[] = [];
      lineTexts[startLine] = 'aaaaa12345';
      lineTexts[startLine + 1] = 'bbbbb12345';
      lineTexts[startLine + 2] = 'ccccc12345';
      const editor = createMockEditor(selections, lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(true);

      const result = toInputSelection(editor.document, selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selections).toHaveLength(3);
        expect(value.selections[0]).toStrictEqual({
          start: { line: startLine, character: startPosition },
          end: { line: startLine, character: endPosition },
          coverage: 'PartialLine',
        });
        expect(value.selections[1]).toStrictEqual({
          start: { line: startLine + 1, character: startPosition },
          end: { line: startLine + 1, character: endPosition },
          coverage: 'PartialLine',
        });
        expect(value.selections[2]).toStrictEqual({
          start: { line: startLine + 2, character: startPosition },
          end: { line: startLine + 2, character: endPosition },
          coverage: 'PartialLine',
        });
      });
    });

    it('should only convert first selection when not rectangular', () => {
      const startLine = getUniqueInt();
      const startPosition = getUniqueInt();
      const endPosition = startPosition + 5;
      const selections = [
        createSelection(startLine, startPosition, startLine, endPosition),
        createSelection(startLine + 5, startPosition + 1, startLine + 5, endPosition + 1), // Different line - not rectangular
      ];
      const lineTexts: string[] = [];
      lineTexts[startLine] = 'aaaaa12345';
      lineTexts[startLine + 1] = 'line2';
      lineTexts[startLine + 2] = 'line3';
      lineTexts[startLine + 3] = 'line4';
      lineTexts[startLine + 4] = 'line5';
      lineTexts[startLine + 5] = 'bbb12345';
      const editor = createMockEditor(selections, lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selections).toHaveLength(1);
        expect(value.selections[0].start).toStrictEqual({
          line: startLine,
          character: startPosition,
        });
      });
    });
  });

  describe('Multi-line selections', () => {
    it('should handle multi-line selection with FullLine coverage', () => {
      const lineTexts = ['const x = 5;', 'const y = 10;', 'const z = 15;'];
      const editor = createMockEditor([createSelection(0, 0, 2, lineTexts[2].length)], lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, editor.selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selections).toHaveLength(1);
        expect(value.selections[0].start).toStrictEqual({ line: 0, character: 0 });
        expect(value.selections[0].end).toStrictEqual({ line: 2, character: lineTexts[2].length });
        expect(value.selections[0].coverage).toBe('FullLine');
      });
    });

    it('should handle multi-line selection with PartialLine coverage (both partial)', () => {
      const lineTexts = ['const x = 5;', 'const y = 10;', 'const z = 15;'];
      const editor = createMockEditor([createSelection(0, 5, 2, 8)], lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, editor.selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selections[0].coverage).toBe('PartialLine');
        expect(value.selections[0].start).toStrictEqual({ line: 0, character: 5 });
        expect(value.selections[0].end).toStrictEqual({ line: 2, character: 8 });
      });
    });

    it('should handle multi-line with full start, partial end (no normalization)', () => {
      // Start at beginning of line 0, end mid-line on line 2
      // This should NOT trigger newline normalization (end.character !== 0)
      const lineTexts = ['const x = 5;', 'const y = 10;', 'const z = 15;'];
      const editor = createMockEditor([createSelection(0, 0, 2, 8)], lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, editor.selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selections[0].coverage).toBe('PartialLine');
        expect(value.selections[0].start).toStrictEqual({ line: 0, character: 0 });
        expect(value.selections[0].end).toStrictEqual({ line: 2, character: 8 }); // NOT normalized
      });
    });

    it('should handle multi-line with partial start, full end (no normalization)', () => {
      // Start mid-line on line 0, end at end of line 2
      // This should NOT trigger newline normalization (end.character !== 0)
      const lineTexts = ['const x = 5;', 'const y = 10;', 'const z = 15;'];
      const editor = createMockEditor([createSelection(0, 5, 2, lineTexts[2].length)], lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, editor.selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selections[0].coverage).toBe('PartialLine');
        expect(value.selections[0].start).toStrictEqual({ line: 0, character: 5 });
        expect(value.selections[0].end).toStrictEqual({ line: 2, character: lineTexts[2].length }); // NOT normalized
      });
    });
  });

  describe('Error handling', () => {
    it('should return error Result when lineAt throws (document modified)', () => {
      const mockDocument = {
        lineAt: jest.fn(() => {
          throw new Error('Line out of bounds');
        }),
        lineCount: 10,
      } as unknown as vscode.TextDocument;

      const editor = {
        document: mockDocument,
        selections: [createSelection(99, 0, 99, 10)],
      } as unknown as vscode.TextEditor;

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, editor.selections, mockLogger);

      expect(result).toBeRangeLinkExtensionErrorErr('SELECTION_CONVERSION_FAILED', {
        message:
          'Cannot generate link: document was modified and selection is no longer valid. Please reselect and try again.',
        functionName: 'toInputSelection',
      });
    });

    it('should retrieve start line content when end line is out of bounds', () => {
      const LINE_COUNT = 5;
      const VALID_START_LINE = 2;
      const VALID_LINE_CONTENT = 'valid line content';
      const INVALID_END_LINE = 10;
      const lineAtError = new Error('Line out of bounds');

      const mockDocument = {
        lineAt: jest.fn((line: number) => {
          if (line === INVALID_END_LINE) {
            throw lineAtError;
          }
          return {
            text: VALID_LINE_CONTENT,
            range: { start: { character: 0 }, end: { character: VALID_LINE_CONTENT.length } },
          };
        }),
        lineCount: LINE_COUNT,
        version: 42,
      } as unknown as vscode.TextDocument;

      const selections = [createSelection(VALID_START_LINE, 0, INVALID_END_LINE, 10)];

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(mockDocument, selections, mockLogger);

      expect(result).toBeRangeLinkExtensionErrorErr('SELECTION_CONVERSION_FAILED', {
        message:
          'Cannot generate link: document was modified and selection is no longer valid. Please reselect and try again.',
        functionName: 'toInputSelection',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'toInputSelection',
          error: lineAtError,
          selection: {
            start: { line: VALID_START_LINE, char: 0 },
            end: { line: INVALID_END_LINE, char: 10 },
            isEmpty: false,
          },
          documentVersion: 42,
          documentLineCount: LINE_COUNT,
          startLineContent: VALID_LINE_CONTENT,
          endLineContent: undefined,
        },
        'Document modified during link generation - selection out of bounds',
      );
    });

    it('should return undefined for all lines when lineAt throws for in-bounds lines', () => {
      const LINE_COUNT = 5;
      const VALID_LINE = 2;
      const lineAtError = new Error('Document corrupt');

      const mockDocument = {
        lineAt: jest.fn(() => {
          throw lineAtError;
        }),
        lineCount: LINE_COUNT,
        version: 3,
      } as unknown as vscode.TextDocument;

      const selections = [createSelection(VALID_LINE, 0, VALID_LINE, 10)];

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(mockDocument, selections, mockLogger);

      expect(result).toBeRangeLinkExtensionErrorErr('SELECTION_CONVERSION_FAILED', {
        message:
          'Cannot generate link: document was modified and selection is no longer valid. Please reselect and try again.',
        functionName: 'toInputSelection',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'toInputSelection',
          error: lineAtError,
          selection: {
            start: { line: VALID_LINE, char: 0 },
            end: { line: VALID_LINE, char: 10 },
            isEmpty: false,
          },
          documentVersion: 3,
          documentLineCount: LINE_COUNT,
          startLineContent: undefined,
          endLineContent: undefined,
        },
        'Document modified during link generation - selection out of bounds',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty line (length 0)', () => {
      const editor = createMockEditor([createSelection(0, 0, 0, 0)], ['']);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, editor.selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selections[0].coverage).toBe('FullLine');
        expect(value.selections[0].start).toStrictEqual({ line: 0, character: 0 });
        expect(value.selections[0].end).toStrictEqual({ line: 0, character: 0 });
      });
    });

    it('should handle very long lines', () => {
      const longLine = 'x'.repeat(10000);
      const editor = createMockEditor([createSelection(0, 0, 0, longLine.length)], [longLine]);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, editor.selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selections[0].coverage).toBe('FullLine');
      });
    });

    it('should handle line 0 selections', () => {
      const editor = createMockEditor([createSelection(0, 0, 0, 10)], ['first line']);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, editor.selections, mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        expect(value.selections[0].start.line).toBe(0);
      });
    });

    it('should handle selections with reversed anchor/active', () => {
      // VSCode allows selections where anchor > active (backwards selection)
      const selection = {
        start: { line: 0, character: 5 },
        end: { line: 0, character: 10 },
        anchor: { line: 0, character: 10 }, // Reversed
        active: { line: 0, character: 5 },
        isReversed: true,
        isEmpty: false,
      } as vscode.Selection;

      const editor = createMockEditor([selection], ['const x = 5; more']);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, [selection], mockLogger);

      expect(result).toBeOkWith((value: InputSelection) => {
        // Should use start/end, not anchor/active
        expect(value.selections[0].start).toStrictEqual({ line: 0, character: 5 });
        expect(value.selections[0].end).toStrictEqual({ line: 0, character: 10 });
      });
    });
  });

  /**
   * Diagnostic logging tests for issue #258 (stale selection debugging)
   *
   * Exception to T007: These tests are intentionally separate from behavior tests.
   * The diagnostic logging captures detailed state for debugging production issues
   * where external file modifications cause stale selections. The verbose payloads
   * warrant explicit verification rather than inline assertions.
   */
  describe('Diagnostic logging', () => {
    it('should log DEBUG on entry with input selections and document state', () => {
      const lineTexts = ['const x = 5;', 'const y = 10;'];
      const editor = createMockEditor(
        [createSelection(0, 0, 0, 12), createSelection(1, 0, 1, 13)],
        lineTexts,
      );

      (isRectangularSelection as jest.Mock).mockReturnValue(true);

      toInputSelection(editor.document, editor.selections, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'toInputSelection',
          selectionCount: 2,
          documentVersion: undefined,
          documentLineCount: 2,
          inputSelections: [
            { index: 0, start: { line: 0, char: 0 }, end: { line: 0, char: 12 }, isEmpty: false },
            { index: 1, start: { line: 1, char: 0 }, end: { line: 1, char: 13 }, isEmpty: false },
          ],
        },
        'Converting VSCode selections to InputSelection',
      );
    });

    it('should log DEBUG on completion with output selections and selection type', () => {
      const lineTexts = ['const x = 5;'];
      const editor = createMockEditor([createSelection(0, 0, 0, 12)], lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      toInputSelection(editor.document, editor.selections, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'toInputSelection',
          isRectangular: false,
          outputSelections: [
            {
              index: 0,
              start: { line: 0, character: 0 },
              end: { line: 0, character: 12 },
              coverage: 'FullLine',
            },
          ],
          selectionType: 'Normal',
        },
        'Selection conversion complete',
      );
    });

    it('should log ERROR with diagnostic context when document was modified', () => {
      const lineAtError = new Error('Line out of bounds');

      const mockDocument = {
        lineAt: jest.fn(() => {
          throw lineAtError;
        }),
        lineCount: 5,
        version: 42,
      } as unknown as vscode.TextDocument;

      const editor = {
        document: mockDocument,
        selections: [createSelection(10, 5, 10, 15)],
      } as unknown as vscode.TextEditor;

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor.document, editor.selections, mockLogger);

      expect(result).toBeRangeLinkExtensionErrorErr('SELECTION_CONVERSION_FAILED', {
        message:
          'Cannot generate link: document was modified and selection is no longer valid. Please reselect and try again.',
        functionName: 'toInputSelection',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          fn: 'toInputSelection',
          error: lineAtError,
          selection: {
            start: { line: 10, char: 5 },
            end: { line: 10, char: 15 },
            isEmpty: false,
          },
          documentVersion: 42,
          documentLineCount: 5,
          startLineContent: undefined,
          endLineContent: undefined,
        },
        'Document modified during link generation - selection out of bounds',
      );
    });
  });
});
