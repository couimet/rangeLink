import type { LinkPosition } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { convertRangeLinkPosition } from '../../utils';

// Mock document
const createMockDocument = (lineCount: number, lineLengths: number[]): vscode.TextDocument => {
  return {
    lineCount,
    lineAt: (line: number) => ({
      text: 'x'.repeat(lineLengths[line] || 0),
    }),
  } as vscode.TextDocument;
};

describe('convertRangeLinkPosition', () => {
  describe('Line conversion (1-indexed to 0-indexed)', () => {
    it('should convert line 1 to 0', () => {
      const position: LinkPosition = { line: 1 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(0);
      expect(result.character).toStrictEqual(0);
    });

    it('should convert line 10 to 9', () => {
      const position: LinkPosition = { line: 10 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(9);
    });

    it('should convert line 100 to 99', () => {
      const position: LinkPosition = { line: 100 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(99);
    });
  });

  describe('Character conversion (1-indexed to 0-indexed)', () => {
    it('should convert char 1 to 0', () => {
      const position: LinkPosition = { line: 1, character: 1 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(0);
      expect(result.character).toStrictEqual(0);
    });

    it('should convert char 10 to 9', () => {
      const position: LinkPosition = { line: 1, character: 10 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toStrictEqual(9);
    });

    it('should default to 0 when char is undefined', () => {
      const position: LinkPosition = { line: 10 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toStrictEqual(0);
    });
  });

  describe('Line clamping to document bounds', () => {
    it('should clamp line 0 to 0 (minimum)', () => {
      const position: LinkPosition = { line: 0 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(0);
    });

    it('should clamp negative line to 0', () => {
      const position: LinkPosition = { line: -10 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(0);
    });

    it('should clamp line beyond document to last line', () => {
      const position: LinkPosition = { line: 9999 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(99); // lineCount - 1
    });

    it('should clamp to last line when line equals lineCount + 1', () => {
      const position: LinkPosition = { line: 101 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(99);
    });
  });

  describe('Character clamping to line length', () => {
    it('should clamp character 0 to 0 (minimum)', () => {
      const position: LinkPosition = { line: 1, character: 0 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toStrictEqual(0);
    });

    it('should clamp negative character to 0', () => {
      const position: LinkPosition = { line: 1, character: -5 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toStrictEqual(0);
    });

    it('should clamp character beyond line length to line length', () => {
      const position: LinkPosition = { line: 1, character: 9999 };
      const document = createMockDocument(100, [50]); // Line 0 has 50 chars

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toStrictEqual(50); // lineLength
    });

    it('should clamp to line length when char equals lineLength + 1', () => {
      const position: LinkPosition = { line: 1, character: 51 };
      const document = createMockDocument(100, [50]); // Line 0 has 50 chars

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toStrictEqual(50);
    });
  });

  describe('Variable line lengths', () => {
    it('should handle different line lengths correctly', () => {
      // Line 0: 10 chars, Line 1: 20 chars, Line 2: 5 chars
      const document = createMockDocument(3, [10, 20, 5]);

      // Line 1 (index 0)
      const result1 = convertRangeLinkPosition({ line: 1, character: 15 }, document);
      expect(result1).toStrictEqual({ line: 0, character: 10 }); // Clamped to line length 10

      // Line 2 (index 1)
      const result2 = convertRangeLinkPosition({ line: 2, character: 15 }, document);
      expect(result2).toStrictEqual({ line: 1, character: 14 }); // Within line length 20

      // Line 3 (index 2)
      const result3 = convertRangeLinkPosition({ line: 3, character: 10 }, document);
      expect(result3).toStrictEqual({ line: 2, character: 5 }); // Clamped to line length 5
    });
  });

  describe('Empty document', () => {
    it('should handle single empty line', () => {
      const position: LinkPosition = { line: 1, character: 5 };
      const document = createMockDocument(1, [0]); // 1 line, 0 characters

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({ line: 0, character: 0 });
    });
  });

  describe('Edge cases', () => {
    it('should handle exact line boundary (last line)', () => {
      const position: LinkPosition = { line: 100 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(99);
      expect(result.character).toStrictEqual(0);
    });

    it('should handle exact character boundary (last char)', () => {
      const position: LinkPosition = { line: 1, character: 50 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(0);
      expect(result.character).toStrictEqual(49); // 50 - 1 (conversion)
    });

    it('should handle both line and char at exact boundaries', () => {
      const position: LinkPosition = { line: 100, character: 50 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(99);
      expect(result.character).toStrictEqual(49);
    });

    it('should handle large document (10000 lines)', () => {
      const position: LinkPosition = { line: 5000, character: 100 };
      const document = createMockDocument(10000, Array(10000).fill(200));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toStrictEqual(4999);
      expect(result.character).toStrictEqual(99);
    });
  });

  describe('Realistic scenarios', () => {
    it('should handle typical code file position', () => {
      // Simulate a 500-line file with varying line lengths
      const lineLengths = Array(500)
        .fill(0)
        .map((_, i) => (i % 10 === 0 ? 120 : 80)); // Some long lines
      const document = createMockDocument(500, lineLengths);

      const position: LinkPosition = { line: 42, character: 15 };
      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({ line: 41, character: 14 });
    });

    it('should handle end of file navigation', () => {
      const document = createMockDocument(500, Array(500).fill(80));

      const position: LinkPosition = { line: 500 }; // Exact last line
      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({ line: 499, character: 0 });
    });

    it('should handle middle of long line', () => {
      const document = createMockDocument(100, [200]); // Line 0 has 200 chars

      const position: LinkPosition = { line: 1, character: 100 };
      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({ line: 0, character: 99 });
    });
  });
});
