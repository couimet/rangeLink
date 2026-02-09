import { createMockLogger } from 'barebone-logger-testing';

import { EditorFocusCapability } from '../../../destinations/capabilities/EditorFocusCapability';
import type { FocusedDestination } from '../../../destinations/capabilities/FocusCapability';
import {
  createMockDocument,
  createMockEditor,
  createMockInsertFactory,
  createMockUri,
  createMockVscodeAdapter,
} from '../../helpers';

const DOCUMENT_URI = createMockUri('/workspace/src/file.ts');
const DOCUMENT_URI_STRING = DOCUMENT_URI.toString();

const LOGGING_CONTEXT = { fn: 'test' };

describe('EditorFocusCapability', () => {
  const mockLogger = createMockLogger();

  describe('dynamic viewColumn resolution', () => {
    it('uses current viewColumn when document is visible in 1 tab group', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const visibleEditor = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
        viewColumn: 2,
      });
      jest.spyOn(mockAdapter, 'findVisibleEditorsByUri').mockReturnValue([visibleEditor]);

      const freshEditor = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
      });
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(freshEditor);

      const mockInserterFn = jest.fn().mockResolvedValue(true);
      const mockInsertFactory = createMockInsertFactory();
      mockInsertFactory.forTarget.mockReturnValue(mockInserterFn);

      const capability = new EditorFocusCapability(
        mockAdapter,
        DOCUMENT_URI,
        mockInsertFactory,
        mockLogger,
      );

      const result = await capability.focus(LOGGING_CONTEXT);

      expect(result).toBeOkWith((value: FocusedDestination) => {
        expect(value.inserter).toBe(mockInserterFn);
      });
      expect(mockAdapter.findVisibleEditorsByUri).toHaveBeenCalledWith(DOCUMENT_URI);
      expect(mockAdapter.showTextDocument).toHaveBeenCalledWith(DOCUMENT_URI, { viewColumn: 2 });
      expect(mockInsertFactory.forTarget).toHaveBeenCalledWith(freshEditor);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { ...LOGGING_CONTEXT, editorUri: DOCUMENT_URI_STRING, viewColumn: 2 },
        'Resolved editor viewColumn dynamically',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { ...LOGGING_CONTEXT, editorUri: DOCUMENT_URI_STRING },
        'Editor focused via showTextDocument()',
      );
    });

    it('returns error when document is not visible (0 matches — defensive)', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'findVisibleEditorsByUri').mockReturnValue([]);
      const showErrorSpy = jest.spyOn(mockAdapter, 'showErrorMessage');

      const mockInsertFactory = createMockInsertFactory();
      const capability = new EditorFocusCapability(
        mockAdapter,
        DOCUMENT_URI,
        mockInsertFactory,
        mockLogger,
      );

      const result = await capability.focus(LOGGING_CONTEXT);

      expect(result).toBeErrWith((error) => {
        expect(error).toStrictEqual({ reason: 'EDITOR_NOT_VISIBLE' });
      });
      expect(showErrorSpy).toHaveBeenCalledWith(
        'RangeLink: Bound editor is no longer visible. Re-open the file and bind again.',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { ...LOGGING_CONTEXT, editorUri: DOCUMENT_URI_STRING },
        'Bound editor not visible — cannot determine target tab group (defensive: auto-unbind should prevent this)',
      );
    });

    it('returns error when document is visible in 2+ tab groups', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const editor1 = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
        viewColumn: 1,
      });
      const editor2 = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
        viewColumn: 2,
      });
      jest.spyOn(mockAdapter, 'findVisibleEditorsByUri').mockReturnValue([editor1, editor2]);
      const showErrorSpy = jest.spyOn(mockAdapter, 'showErrorMessage');

      const mockInsertFactory = createMockInsertFactory();
      const capability = new EditorFocusCapability(
        mockAdapter,
        DOCUMENT_URI,
        mockInsertFactory,
        mockLogger,
      );

      const result = await capability.focus(LOGGING_CONTEXT);

      expect(result).toBeErrWith((error) => {
        expect(error).toStrictEqual({ reason: 'EDITOR_AMBIGUOUS_COLUMNS' });
      });
      expect(showErrorSpy).toHaveBeenCalledWith(
        'RangeLink: Bound editor is open in multiple tab groups. Close the duplicate tab and try again.',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { ...LOGGING_CONTEXT, editorUri: DOCUMENT_URI_STRING, matchCount: 2 },
        'Bound editor open in multiple tab groups — ambiguous target',
      );
    });

    it('returns error when viewColumn is undefined (defensive)', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const visibleEditor = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
        viewColumn: undefined,
      });
      jest.spyOn(mockAdapter, 'findVisibleEditorsByUri').mockReturnValue([visibleEditor]);
      const showErrorSpy = jest.spyOn(mockAdapter, 'showErrorMessage');

      const mockInsertFactory = createMockInsertFactory();
      const capability = new EditorFocusCapability(
        mockAdapter,
        DOCUMENT_URI,
        mockInsertFactory,
        mockLogger,
      );

      const result = await capability.focus(LOGGING_CONTEXT);

      expect(result).toBeErrWith((error) => {
        expect(error).toStrictEqual({ reason: 'EDITOR_VIEWCOLUMN_UNDEFINED' });
      });
      expect(showErrorSpy).toHaveBeenCalledWith(
        'RangeLink: Could not determine editor position. Try closing and reopening the file.',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { ...LOGGING_CONTEXT, editorUri: DOCUMENT_URI_STRING },
        'Visible editor has no viewColumn (defensive)',
      );
    });
  });

  describe('showTextDocument failure', () => {
    it('returns SHOW_DOCUMENT_FAILED error with cause', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const visibleEditor = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
        viewColumn: 1,
      });
      jest.spyOn(mockAdapter, 'findVisibleEditorsByUri').mockReturnValue([visibleEditor]);

      const showDocError = new Error('Tab group disposed');
      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(showDocError);

      const mockInsertFactory = createMockInsertFactory();
      const capability = new EditorFocusCapability(
        mockAdapter,
        DOCUMENT_URI,
        mockInsertFactory,
        mockLogger,
      );

      const result = await capability.focus(LOGGING_CONTEXT);

      expect(result).toBeErrWith((error) => {
        expect(error).toStrictEqual({ reason: 'SHOW_DOCUMENT_FAILED', cause: showDocError });
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { ...LOGGING_CONTEXT, editorUri: DOCUMENT_URI_STRING, error: showDocError },
        'Failed to focus editor',
      );
    });
  });

  describe('inserter', () => {
    it('returns inserter from InsertFactory.forTarget with fresh editor', async () => {
      const mockAdapter = createMockVscodeAdapter();
      const visibleEditor = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
        viewColumn: 1,
      });
      jest.spyOn(mockAdapter, 'findVisibleEditorsByUri').mockReturnValue([visibleEditor]);

      const freshEditor = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
      });
      jest.spyOn(mockAdapter, 'showTextDocument').mockResolvedValue(freshEditor);

      const mockInserterFn = jest.fn().mockResolvedValue(true);
      const mockInsertFactory = createMockInsertFactory();
      mockInsertFactory.forTarget.mockReturnValue(mockInserterFn);

      const capability = new EditorFocusCapability(
        mockAdapter,
        DOCUMENT_URI,
        mockInsertFactory,
        mockLogger,
      );

      const result = await capability.focus(LOGGING_CONTEXT);

      expect(result).toBeOkWith((value: FocusedDestination) => {
        expect(value.inserter).toBe(mockInserterFn);
      });
      expect(mockInsertFactory.forTarget).toHaveBeenCalledWith(freshEditor);
    });
  });
});
