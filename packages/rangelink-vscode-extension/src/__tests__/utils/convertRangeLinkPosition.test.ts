import type { LinkPosition } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { convertRangeLinkPosition } from '../../utils';

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

      expect(result).toStrictEqual({
        line: 0,
        character: 0,
        lineClamped: false,
        characterClamped: false,
      });
    });

    it('should convert line 10 to 9', () => {
      const position: LinkPosition = { line: 10 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toBe(9);
      expect(result.lineClamped).toBe(false);
    });

    it('should convert line 100 to 99', () => {
      const position: LinkPosition = { line: 100 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toBe(99);
      expect(result.lineClamped).toBe(false);
    });
  });

  describe('Character conversion (1-indexed to 0-indexed)', () => {
    it('should convert char 1 to 0', () => {
      const position: LinkPosition = { line: 1, character: 1 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 0,
        character: 0,
        lineClamped: false,
        characterClamped: false,
      });
    });

    it('should convert char 10 to 9', () => {
      const position: LinkPosition = { line: 1, character: 10 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(9);
      expect(result.characterClamped).toBe(false);
    });

    it('should default to 0 when char is undefined', () => {
      const position: LinkPosition = { line: 10 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(0);
      expect(result.characterClamped).toBe(false);
    });
  });

  describe('Line clamping to document bounds', () => {
    it('should clamp line 0 to 0 (minimum)', () => {
      const position: LinkPosition = { line: 0 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toBe(0);
      expect(result.lineClamped).toBe(false);
    });

    it('should clamp negative line to 0', () => {
      const position: LinkPosition = { line: -10 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toBe(0);
      expect(result.lineClamped).toBe(false);
    });

    it('should clamp line beyond document to last line', () => {
      const position: LinkPosition = { line: 9999 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toBe(99);
      expect(result.lineClamped).toBe(true);
    });

    it('should clamp to last line when line equals lineCount + 1', () => {
      const position: LinkPosition = { line: 101 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toBe(99);
      expect(result.lineClamped).toBe(true);
    });
  });

  describe('Character clamping to line length', () => {
    it('should clamp character 0 to 0 (minimum)', () => {
      const position: LinkPosition = { line: 1, character: 0 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(0);
      expect(result.characterClamped).toBe(false);
    });

    it('should clamp negative character to 0', () => {
      const position: LinkPosition = { line: 1, character: -5 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(0);
      expect(result.characterClamped).toBe(false);
    });

    it('should clamp character beyond line length to line length', () => {
      const position: LinkPosition = { line: 1, character: 9999 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(50);
      expect(result.characterClamped).toBe(true);
    });

    it('should not clamp when char converts exactly to lineLength (1-indexed lineLength + 1)', () => {
      const position: LinkPosition = { line: 1, character: 51 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(50);
      expect(result.characterClamped).toBe(false);
    });

    it('should clamp when char exceeds lineLength after conversion (1-indexed lineLength + 2)', () => {
      const position: LinkPosition = { line: 1, character: 52 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(50);
      expect(result.characterClamped).toBe(true);
    });
  });

  describe('Clamping detection', () => {
    it('should report no clamping when position is within bounds', () => {
      const position: LinkPosition = { line: 10, character: 5 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 9,
        character: 4,
        lineClamped: false,
        characterClamped: false,
      });
    });

    it('should report lineClamped when line exceeds document length', () => {
      const position: LinkPosition = { line: 200, character: 5 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 99,
        character: 4,
        lineClamped: true,
        characterClamped: false,
      });
    });

    it('should report characterClamped when character exceeds line length', () => {
      const position: LinkPosition = { line: 1, character: 100 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 0,
        character: 50,
        lineClamped: false,
        characterClamped: true,
      });
    });

    it('should report both clamped when line and character exceed bounds', () => {
      const position: LinkPosition = { line: 200, character: 100 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 99,
        character: 50,
        lineClamped: true,
        characterClamped: true,
      });
    });

    it('should not report characterClamped when character is undefined', () => {
      const position: LinkPosition = { line: 200 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 99,
        character: 0,
        lineClamped: true,
        characterClamped: false,
      });
    });

    it('should report lineClamped at exact boundary (line === lineCount + 1 in 1-indexed)', () => {
      const position: LinkPosition = { line: 101 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toBe(99);
      expect(result.lineClamped).toBe(true);
    });

    it('should not report lineClamped at exact last line (line === lineCount in 1-indexed)', () => {
      const position: LinkPosition = { line: 100 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result.line).toBe(99);
      expect(result.lineClamped).toBe(false);
    });

    it('should report characterClamped at exact boundary (char === lineLength + 2 in 1-indexed)', () => {
      const position: LinkPosition = { line: 1, character: 52 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(50);
      expect(result.characterClamped).toBe(true);
    });

    it('should not report characterClamped when char lands exactly at lineLength (char === lineLength + 1 in 1-indexed)', () => {
      const position: LinkPosition = { line: 1, character: 51 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(50);
      expect(result.characterClamped).toBe(false);
    });

    it('should not report characterClamped when char is within line length', () => {
      const position: LinkPosition = { line: 1, character: 50 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result.character).toBe(49);
      expect(result.characterClamped).toBe(false);
    });
  });

  describe('Variable line lengths', () => {
    it('should handle different line lengths correctly', () => {
      const document = createMockDocument(3, [10, 20, 5]);

      const result1 = convertRangeLinkPosition({ line: 1, character: 15 }, document);
      expect(result1).toStrictEqual({
        line: 0,
        character: 10,
        lineClamped: false,
        characterClamped: true,
      });

      const result2 = convertRangeLinkPosition({ line: 2, character: 15 }, document);
      expect(result2).toStrictEqual({
        line: 1,
        character: 14,
        lineClamped: false,
        characterClamped: false,
      });

      const result3 = convertRangeLinkPosition({ line: 3, character: 10 }, document);
      expect(result3).toStrictEqual({
        line: 2,
        character: 5,
        lineClamped: false,
        characterClamped: true,
      });
    });
  });

  describe('Empty document', () => {
    it('should handle single empty line', () => {
      const position: LinkPosition = { line: 1, character: 5 };
      const document = createMockDocument(1, [0]);

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 0,
        character: 0,
        lineClamped: false,
        characterClamped: true,
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle exact line boundary (last line)', () => {
      const position: LinkPosition = { line: 100 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 99,
        character: 0,
        lineClamped: false,
        characterClamped: false,
      });
    });

    it('should handle exact character boundary (last char)', () => {
      const position: LinkPosition = { line: 1, character: 50 };
      const document = createMockDocument(100, [50]);

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 0,
        character: 49,
        lineClamped: false,
        characterClamped: false,
      });
    });

    it('should handle both line and char at exact boundaries', () => {
      const position: LinkPosition = { line: 100, character: 50 };
      const document = createMockDocument(100, Array(100).fill(50));

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 99,
        character: 49,
        lineClamped: false,
        characterClamped: false,
      });
    });

    it('should handle large document (10000 lines)', () => {
      const position: LinkPosition = { line: 5000, character: 100 };
      const document = createMockDocument(10000, Array(10000).fill(200));

      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 4999,
        character: 99,
        lineClamped: false,
        characterClamped: false,
      });
    });
  });

  describe('Realistic scenarios', () => {
    it('should handle typical code file position', () => {
      const lineLengths = Array(500)
        .fill(0)
        .map((_, i) => (i % 10 === 0 ? 120 : 80));
      const document = createMockDocument(500, lineLengths);

      const position: LinkPosition = { line: 42, character: 15 };
      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 41,
        character: 14,
        lineClamped: false,
        characterClamped: false,
      });
    });

    it('should handle end of file navigation', () => {
      const document = createMockDocument(500, Array(500).fill(80));

      const position: LinkPosition = { line: 500 };
      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 499,
        character: 0,
        lineClamped: false,
        characterClamped: false,
      });
    });

    it('should handle middle of long line', () => {
      const document = createMockDocument(100, [200]);

      const position: LinkPosition = { line: 1, character: 100 };
      const result = convertRangeLinkPosition(position, document);

      expect(result).toStrictEqual({
        line: 0,
        character: 99,
        lineClamped: false,
        characterClamped: false,
      });
    });
  });
});
