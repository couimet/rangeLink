import { createMockLogger } from 'barebone-logger-testing';

import {
  createMockDocument,
  createMockEditor,
  createMockLineAt,
  createMockPos,
  createMockSelection,
  createMockVscodeAdapter,
} from '../../__tests__/helpers';
import { SelectionValidator } from '../SelectionValidator';

describe('SelectionValidator', () => {
  const mockLogger = createMockLogger();

  describe('validateSelectionsAndShowError', () => {
    it('returns editor and selections when editor has non-empty selections', () => {
      const selection = createMockSelection({ start: createMockPos(0, 0), end: createMockPos(0, 10), isEmpty: false });
      const editor = createMockEditor({ selections: [selection] });
      const mockAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: editor },
      });
      const validator = new SelectionValidator(mockAdapter, mockLogger);

      const result = validator.validateSelectionsAndShowError();

      expect(result).toBeDefined();
      expect(result!.editor).toBe(editor);
      expect(result!.selections).toStrictEqual([selection]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ fn: 'SelectionValidator.validateSelectionsAndShowError' }),
        'Selection validation starting',
      );
    });

    it('returns undefined and shows no-editor error when no active editor', () => {
      const mockAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: undefined },
      });
      const showErrorSpy = jest.spyOn(mockAdapter, 'showErrorMessage');
      const validator = new SelectionValidator(mockAdapter, mockLogger);

      const result = validator.validateSelectionsAndShowError();

      expect(result).toBeUndefined();
      expect(showErrorSpy).toHaveBeenCalledWith(
        'RangeLink: No active editor',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'SelectionValidator.validateSelectionsAndShowError',
          hasEditor: false,
          errorCode: 'ERROR_NO_ACTIVE_EDITOR',
        }),
        'Selection validation failed - full diagnostic context',
      );
    });

    it('returns undefined and shows no-selection error when editor has only empty selections', () => {
      const emptySelection = createMockSelection({ start: createMockPos(5, 0), end: createMockPos(5, 0), isEmpty: true });
      const editor = createMockEditor({ selections: [emptySelection] });
      const mockAdapter = createMockVscodeAdapter({
        windowOptions: { activeTextEditor: editor },
      });
      const showErrorSpy = jest.spyOn(mockAdapter, 'showErrorMessage');
      const validator = new SelectionValidator(mockAdapter, mockLogger);

      const result = validator.validateSelectionsAndShowError();

      expect(result).toBeUndefined();
      expect(showErrorSpy).toHaveBeenCalledWith(
        'RangeLink: No text selected. Click in the file, select text, and try again.',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'SelectionValidator.validateSelectionsAndShowError',
          hasEditor: true,
          errorCode: 'ERROR_NO_TEXT_SELECTED',
        }),
        'Selection validation failed - full diagnostic context',
      );
    });
  });

  describe('mapSelectionsForLogging', () => {
    it('maps selections to logging format with start/end positions', () => {
      const selection = createMockSelection({ start: createMockPos(2, 5), end: createMockPos(10, 15), isEmpty: false });
      const mockAdapter = createMockVscodeAdapter();
      const validator = new SelectionValidator(mockAdapter, mockLogger);

      const result = validator.mapSelectionsForLogging([selection]);

      expect(result).toStrictEqual([
        {
          index: 0,
          start: { line: 2, char: 5 },
          end: { line: 10, char: 15 },
          isEmpty: false,
        },
      ]);
    });

    it('maps empty selection array to empty result', () => {
      const mockAdapter = createMockVscodeAdapter();
      const validator = new SelectionValidator(mockAdapter, mockLogger);

      const result = validator.mapSelectionsForLogging([]);

      expect(result).toStrictEqual([]);
    });
  });

  describe('getLineContentAtSelectionBoundaries', () => {
    it('extracts line content at selection start and end', () => {
      const document = createMockDocument({
        lineCount: 10,
        lineAt: createMockLineAt('line content'),
      });
      const selection = createMockSelection({ start: createMockPos(2, 0), end: createMockPos(5, 10), isEmpty: false });
      const mockAdapter = createMockVscodeAdapter();
      const validator = new SelectionValidator(mockAdapter, mockLogger);

      const result = validator.getLineContentAtSelectionBoundaries(document, [selection]);

      expect(result).toStrictEqual([
        { index: 0, startLineContent: 'line content', endLineContent: 'line content' },
      ]);
    });

    it('returns undefined for out-of-bounds line numbers', () => {
      const document = createMockDocument({
        lineCount: 5,
        lineAt: createMockLineAt('content'),
      });
      const selection = createMockSelection({ start: createMockPos(10, 0), end: createMockPos(20, 0), isEmpty: false });
      const mockAdapter = createMockVscodeAdapter();
      const validator = new SelectionValidator(mockAdapter, mockLogger);

      const result = validator.getLineContentAtSelectionBoundaries(document, [selection]);

      expect(result).toStrictEqual([
        { index: 0, startLineContent: undefined, endLineContent: undefined },
      ]);
    });

    it('returns undefined when lineAt throws', () => {
      const document = createMockDocument({
        lineCount: 10,
        lineAt: jest.fn(() => {
          throw new Error('stale document');
        }),
      });
      const selection = createMockSelection({ start: createMockPos(2, 0), end: createMockPos(5, 0), isEmpty: false });
      const mockAdapter = createMockVscodeAdapter();
      const validator = new SelectionValidator(mockAdapter, mockLogger);

      const result = validator.getLineContentAtSelectionBoundaries(document, [selection]);

      expect(result).toStrictEqual([
        { index: 0, startLineContent: undefined, endLineContent: undefined },
      ]);
    });

    it('handles negative line numbers as out-of-bounds', () => {
      const document = createMockDocument({
        lineCount: 10,
        lineAt: createMockLineAt('content'),
      });
      const selection = createMockSelection({ start: createMockPos(-1, 0), end: createMockPos(5, 0), isEmpty: false });
      const mockAdapter = createMockVscodeAdapter();
      const validator = new SelectionValidator(mockAdapter, mockLogger);

      const result = validator.getLineContentAtSelectionBoundaries(document, [selection]);

      expect(result).toStrictEqual([
        { index: 0, startLineContent: undefined, endLineContent: 'content' },
      ]);
    });
  });
});
