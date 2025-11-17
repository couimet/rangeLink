import * as vscode from 'vscode';

import { createMockEditor } from '../../__tests__/helpers/mockVSCode';
import { ActiveSelections } from '../ActiveSelections';

describe('ActiveSelections', () => {
  describe('create', () => {
    it('should create instance with editor and selections', () => {
      const mockEditor = createMockEditor({
        selections: [
          { isEmpty: false, start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        ] as any,
      });

      const result = ActiveSelections.create(mockEditor);

      expect(result.editor).toBe(mockEditor);
      expect(result.selections).toStrictEqual(mockEditor.selections);
    });

    it('should create instance with undefined editor', () => {
      const result = ActiveSelections.create(undefined);

      expect(result.editor).toBeUndefined();
      expect(result.selections).toStrictEqual([]);
    });

    it('should create instance with empty selections array', () => {
      const mockEditor = createMockEditor({
        selections: [],
      });

      const result = ActiveSelections.create(mockEditor);

      expect(result.editor).toBe(mockEditor);
      expect(result.selections).toStrictEqual([]);
    });
  });

  describe('getNonEmptySelections', () => {
    describe('when editor is undefined', () => {
      it('should return undefined', () => {
        const activeSelections = ActiveSelections.create(undefined);

        const result = activeSelections.getNonEmptySelections();

        expect(result).toBeUndefined();
      });
    });

    describe('when selections array is empty', () => {
      it('should return undefined', () => {
        const mockEditor = createMockEditor({
          selections: [],
        });

        const activeSelections = ActiveSelections.create(mockEditor);
        const result = activeSelections.getNonEmptySelections();

        expect(result).toBeUndefined();
      });
    });

    describe('when all selections are empty', () => {
      it('should return undefined', () => {
        const mockEditor = createMockEditor({
          selections: [
            { isEmpty: true, start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            { isEmpty: true, start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
          ] as any,
        });

        const activeSelections = ActiveSelections.create(mockEditor);
        const result = activeSelections.getNonEmptySelections();

        expect(result).toBeUndefined();
      });
    });

    describe('when all selections are non-empty', () => {
      it('should return all selections', () => {
        const selection1 = {
          isEmpty: false,
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        } as vscode.Selection;
        const selection2 = {
          isEmpty: false,
          start: { line: 1, character: 0 },
          end: { line: 1, character: 10 },
        } as vscode.Selection;

        const mockEditor = createMockEditor({
          selections: [selection1, selection2],
        });

        const activeSelections = ActiveSelections.create(mockEditor);
        const result = activeSelections.getNonEmptySelections();

        expect(result).toStrictEqual([selection1, selection2]);
      });
    });

    describe('when some selections are empty', () => {
      it('should return only non-empty selections', () => {
        const emptySelection = {
          isEmpty: true,
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        } as vscode.Selection;
        const nonEmptySelection1 = {
          isEmpty: false,
          start: { line: 1, character: 0 },
          end: { line: 1, character: 5 },
        } as vscode.Selection;
        const nonEmptySelection2 = {
          isEmpty: false,
          start: { line: 2, character: 0 },
          end: { line: 2, character: 10 },
        } as vscode.Selection;

        const mockEditor = createMockEditor({
          selections: [emptySelection, nonEmptySelection1, nonEmptySelection2],
        });

        const activeSelections = ActiveSelections.create(mockEditor);
        const result = activeSelections.getNonEmptySelections();

        expect(result).toStrictEqual([nonEmptySelection1, nonEmptySelection2]);
      });

      it('should preserve order of non-empty selections', () => {
        const selection1 = {
          isEmpty: false,
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        } as vscode.Selection;
        const emptySelection = {
          isEmpty: true,
          start: { line: 1, character: 0 },
          end: { line: 1, character: 0 },
        } as vscode.Selection;
        const selection2 = {
          isEmpty: false,
          start: { line: 2, character: 0 },
          end: { line: 2, character: 10 },
        } as vscode.Selection;

        const mockEditor = createMockEditor({
          selections: [selection1, emptySelection, selection2],
        });

        const activeSelections = ActiveSelections.create(mockEditor);
        const result = activeSelections.getNonEmptySelections();

        expect(result).toStrictEqual([selection1, selection2]);
        expect(result?.[0]).toBe(selection1);
        expect(result?.[1]).toBe(selection2);
      });
    });
  });

  describe('immutability', () => {
    it('should have readonly editor property (compile-time check)', () => {
      const mockEditor = createMockEditor({
        selections: [{ isEmpty: false }] as any,
      });

      const activeSelections = ActiveSelections.create(mockEditor);

      // TypeScript enforces readonly at compile time
      // This test documents the contract - assignment would be a TS error
      expect(activeSelections.editor).toBeDefined();
    });

    it('should have readonly selections property (compile-time check)', () => {
      const mockEditor = createMockEditor({
        selections: [{ isEmpty: false }] as any,
      });

      const activeSelections = ActiveSelections.create(mockEditor);

      // TypeScript enforces readonly at compile time
      // This test documents the contract - assignment would be a TS error
      expect(activeSelections.selections).toBeDefined();
    });

    it('should return new array from getNonEmptySelections', () => {
      const selection = {
        isEmpty: false,
        start: { line: 0, character: 0 },
        end: { line: 0, character: 5 },
      } as vscode.Selection;

      const mockEditor = createMockEditor({
        selections: [selection],
      });

      const activeSelections = ActiveSelections.create(mockEditor);
      const result1 = activeSelections.getNonEmptySelections();
      const result2 = activeSelections.getNonEmptySelections();

      // Should return new arrays each time (not same reference)
      expect(result1).not.toBe(result2);
      // But should contain same selections
      expect(result1).toStrictEqual(result2);
    });
  });

  describe('edge cases', () => {
    it('should handle editor with null selections gracefully', () => {
      const mockEditor = createMockEditor({
        selections: null as any,
      });

      // Should not throw - factory handles gracefully
      const activeSelections = ActiveSelections.create(mockEditor);

      expect(activeSelections.editor).toBe(mockEditor);
      expect(activeSelections.selections).toStrictEqual([]);
    });

    it('should handle editor with undefined selections gracefully', () => {
      const mockEditor = createMockEditor({
        selections: undefined as any,
      });

      const activeSelections = ActiveSelections.create(mockEditor);

      expect(activeSelections.editor).toBe(mockEditor);
      expect(activeSelections.selections).toStrictEqual([]);
    });
  });
});
