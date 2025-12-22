import { SelectionCoverage, SelectionType } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { isRectangularSelection } from '../isRectangularSelection';
import { toInputSelection } from '../utils';

// Mock the isRectangularSelection function
jest.mock('../isRectangularSelection');

/**
 * Helper to create a mock vscode.Selection
 */
const createSelection = (
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
): vscode.Selection => {
  return {
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar },
    anchor: { line: startLine, character: startChar },
    active: { line: endLine, character: endChar },
    isReversed: false,
    isEmpty: startLine === endLine && startChar === endChar,
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
  describe('Selection coverage detection', () => {
    describe('FullLine coverage', () => {
      it('should detect FullLine when selection starts at column 0 and ends at line end', () => {
        const lineText = 'const x = 5;';
        const editor = createMockEditor([createSelection(0, 0, 0, lineText.length)], [lineText]);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        expect(result.selections).toHaveLength(1);
        expect(result.selections[0].coverage).toBe(SelectionCoverage.FullLine);
        expect(result.selections[0].start).toStrictEqual({ line: 0, char: 0 });
        expect(result.selections[0].end).toStrictEqual({ line: 0, char: lineText.length });
      });

      it('should detect FullLine when selection extends beyond actual line end', () => {
        const lineText = 'const x = 5;';
        const editor = createMockEditor(
          [createSelection(0, 0, 0, lineText.length + 10)],
          [lineText],
        );

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        expect(result.selections[0].coverage).toBe(SelectionCoverage.FullLine);
      });

      it('should detect FullLine for multi-line selection ending at start of next line (char 0)', () => {
        const lineTexts = ['line one', 'line two', 'line three'];
        const editor = createMockEditor([createSelection(0, 0, 2, 0)], lineTexts);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        // The selection is processed as a single selection from line 0 to line 2
        // Character 0 at end of multi-line selection counts as full line
        expect(result.selections[0].coverage).toBe(SelectionCoverage.FullLine);
        // Verify normalized coordinates: end line adjusted from 2 to 1
        expect(result.selections[0].start).toStrictEqual({ line: 0, char: 0 });
        expect(result.selections[0].end).toStrictEqual({ line: 1, char: 0 });
      });

      it('should normalize end line when single-line selection includes trailing newline', () => {
        // VSCode reports L0 C0 → L1 C0 when selecting line 0 + newline
        const lineTexts = ['line zero content', 'line one'];
        const editor = createMockEditor([createSelection(0, 0, 1, 0)], lineTexts);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        expect(result.selections[0].coverage).toBe(SelectionCoverage.FullLine);
        expect(result.selections[0].start).toStrictEqual({ line: 0, char: 0 });
        expect(result.selections[0].end).toStrictEqual({ line: 0, char: 0 }); // Normalized to line 0, not 1
      });

      it('should normalize end line when multi-line selection includes trailing newline', () => {
        // VSCode reports L0 C0 → L3 C0 when selecting lines 0-2 + newline
        const lineTexts = ['line zero', 'line one', 'line two', 'line three'];
        const editor = createMockEditor([createSelection(0, 0, 3, 0)], lineTexts);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        expect(result.selections[0].coverage).toBe(SelectionCoverage.FullLine);
        expect(result.selections[0].start).toStrictEqual({ line: 0, char: 0 });
        expect(result.selections[0].end).toStrictEqual({ line: 2, char: 0 }); // Normalized to line 2, not 3
      });
    });

    describe('PartialLine coverage', () => {
      it('should detect PartialLine when selection does not start at column 0', () => {
        const lineText = 'const x = 5;';
        const editor = createMockEditor([createSelection(0, 5, 0, lineText.length)], [lineText]);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        expect(result.selections[0].coverage).toBe(SelectionCoverage.PartialLine);
        expect(result.selections[0].start).toStrictEqual({ line: 0, char: 5 });
      });

      it('should detect PartialLine when selection does not reach end of line', () => {
        const lineText = 'const x = 5; more text';
        const editor = createMockEditor([createSelection(0, 0, 0, 10)], [lineText]);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        expect(result.selections[0].coverage).toBe(SelectionCoverage.PartialLine);
        expect(result.selections[0].end).toStrictEqual({ line: 0, char: 10 });
      });

      it('should detect PartialLine when selection starts mid-line and ends mid-line', () => {
        const lineText = 'const x = 5; more text';
        const editor = createMockEditor([createSelection(0, 6, 0, 11)], [lineText]);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        expect(result.selections[0].coverage).toBe(SelectionCoverage.PartialLine);
      });

      it('should detect PartialLine for empty line when selection is not full coverage', () => {
        const editor = createMockEditor([createSelection(0, 0, 0, 0)], ['']);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        // Empty selection at start of empty line - technically FullLine
        expect(result.selections[0].coverage).toBe(SelectionCoverage.FullLine);
      });

      it('should normalize end line for partial selection ending at next line char 0', () => {
        // User selects from L0 C5 to L1 C0 (partial start, includes newline)
        const lineTexts = ['line zero content', 'line one'];
        const editor = createMockEditor([createSelection(0, 5, 1, 0)], lineTexts);

        (isRectangularSelection as jest.Mock).mockReturnValue(false);

        const result = toInputSelection(editor, editor.selections);

        expect(result.selections[0].coverage).toBe(SelectionCoverage.PartialLine); // NOT FullLine (start != 0)
        expect(result.selections[0].start).toStrictEqual({ line: 0, char: 5 });
        expect(result.selections[0].end).toStrictEqual({ line: 0, char: 0 }); // Normalized to line 0
      });
    });
  });

  describe('Rectangular selection delegation', () => {
    it('should call isRectangularSelection with provided selections', () => {
      const selections = [
        createSelection(0, 5, 0, 10),
        createSelection(1, 5, 1, 10),
        createSelection(2, 5, 2, 10),
      ];
      const editor = createMockEditor(selections, ['line one', 'line two', 'line three']);

      (isRectangularSelection as jest.Mock).mockReturnValue(true);

      toInputSelection(editor, selections);

      expect(isRectangularSelection).toHaveBeenCalledWith(selections);
      expect(isRectangularSelection).toHaveBeenCalledTimes(1);
    });

    it('should return SelectionType.Rectangular when isRectangularSelection returns true', () => {
      const selections = [createSelection(0, 5, 0, 10), createSelection(1, 5, 1, 10)];
      const editor = createMockEditor(selections, ['line one', 'line two']);

      (isRectangularSelection as jest.Mock).mockReturnValue(true);

      const result = toInputSelection(editor, selections);

      expect(result.selectionType).toBe(SelectionType.Rectangular);
      expect(result.selections).toHaveLength(2); // Both selections converted
    });

    it('should return SelectionType.Normal when isRectangularSelection returns false', () => {
      const selections = [
        createSelection(0, 5, 0, 10),
        createSelection(2, 3, 2, 8), // Non-rectangular
      ];
      const editor = createMockEditor(selections, ['line one', 'line two', 'line three']);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor, selections);

      expect(result.selectionType).toBe(SelectionType.Normal);
      expect(result.selections).toHaveLength(1); // Only first selection used
    });

    it('should convert all selections when rectangular', () => {
      const selections = [
        createSelection(0, 5, 0, 10),
        createSelection(1, 5, 1, 10),
        createSelection(2, 5, 2, 10),
      ];
      const editor = createMockEditor(selections, ['aaaaa12345', 'bbbbb12345', 'ccccc12345']);

      (isRectangularSelection as jest.Mock).mockReturnValue(true);

      const result = toInputSelection(editor, selections);

      expect(result.selections).toHaveLength(3);
      expect(result.selections[0]).toStrictEqual({
        start: { line: 0, char: 5 },
        end: { line: 0, char: 10 },
        coverage: SelectionCoverage.PartialLine,
      });
      expect(result.selections[1]).toStrictEqual({
        start: { line: 1, char: 5 },
        end: { line: 1, char: 10 },
        coverage: SelectionCoverage.PartialLine,
      });
      expect(result.selections[2]).toStrictEqual({
        start: { line: 2, char: 5 },
        end: { line: 2, char: 10 },
        coverage: SelectionCoverage.PartialLine,
      });
    });

    it('should only convert first selection when not rectangular', () => {
      const selections = [
        createSelection(0, 5, 0, 10),
        createSelection(5, 3, 5, 8), // Different line - not rectangular
      ];
      const editor = createMockEditor(selections, [
        'aaaaa12345',
        'line2',
        'line3',
        'line4',
        'line5',
        'bbb12345',
      ]);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor, selections);

      expect(result.selections).toHaveLength(1);
      expect(result.selections[0].start).toStrictEqual({ line: 0, char: 5 });
    });
  });

  describe('Multi-line selections', () => {
    it('should handle multi-line selection with FullLine coverage', () => {
      const lineTexts = ['const x = 5;', 'const y = 10;', 'const z = 15;'];
      const editor = createMockEditor([createSelection(0, 0, 2, lineTexts[2].length)], lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor, editor.selections);

      expect(result.selections).toHaveLength(1);
      expect(result.selections[0].start).toStrictEqual({ line: 0, char: 0 });
      expect(result.selections[0].end).toStrictEqual({ line: 2, char: lineTexts[2].length });
      expect(result.selections[0].coverage).toBe(SelectionCoverage.FullLine);
    });

    it('should handle multi-line selection with PartialLine coverage', () => {
      const lineTexts = ['const x = 5;', 'const y = 10;', 'const z = 15;'];
      const editor = createMockEditor([createSelection(0, 5, 2, 8)], lineTexts);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor, editor.selections);

      expect(result.selections[0].coverage).toBe(SelectionCoverage.PartialLine);
    });
  });

  describe('Error handling', () => {
    it('should throw error when lineAt throws (document modified)', () => {
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

      expect(() => toInputSelection(editor, editor.selections)).toThrow(
        'Cannot generate link: document was modified and selection is no longer valid',
      );
    });

    it('should include helpful message when document modified', () => {
      const mockDocument = {
        lineAt: jest.fn(() => {
          throw new Error('Invalid line number');
        }),
        lineCount: 5,
      } as unknown as vscode.TextDocument;

      const editor = {
        document: mockDocument,
        selections: [createSelection(10, 0, 10, 5)],
      } as unknown as vscode.TextEditor;

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      expect(() => toInputSelection(editor, editor.selections)).toThrow(
        'Please reselect and try again',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty line (length 0)', () => {
      const editor = createMockEditor([createSelection(0, 0, 0, 0)], ['']);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor, editor.selections);

      expect(result.selections[0].coverage).toBe(SelectionCoverage.FullLine);
      expect(result.selections[0].start).toStrictEqual({ line: 0, char: 0 });
      expect(result.selections[0].end).toStrictEqual({ line: 0, char: 0 });
    });

    it('should handle very long lines', () => {
      const longLine = 'x'.repeat(10000);
      const editor = createMockEditor([createSelection(0, 0, 0, longLine.length)], [longLine]);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor, editor.selections);

      expect(result.selections[0].coverage).toBe(SelectionCoverage.FullLine);
    });

    it('should handle line 0 selections', () => {
      const editor = createMockEditor([createSelection(0, 0, 0, 10)], ['first line']);

      (isRectangularSelection as jest.Mock).mockReturnValue(false);

      const result = toInputSelection(editor, editor.selections);

      expect(result.selections[0].start.line).toBe(0);
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

      const result = toInputSelection(editor, [selection]);

      // Should use start/end, not anchor/active
      expect(result.selections[0].start).toStrictEqual({ line: 0, char: 5 });
      expect(result.selections[0].end).toStrictEqual({ line: 0, char: 10 });
    });
  });
});
