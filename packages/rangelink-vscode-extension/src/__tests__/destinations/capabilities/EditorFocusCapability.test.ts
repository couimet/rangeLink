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
const BOUND_VIEW_COLUMN = 1;

const LOGGING_CONTEXT = { fn: 'test' };

describe('EditorFocusCapability', () => {
  const mockLogger = createMockLogger();

  describe('fast path — file at bound viewColumn', () => {
    it('focuses editor at bound viewColumn when still there', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'hasVisibleEditorAt').mockReturnValue(true);

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
        BOUND_VIEW_COLUMN,
        mockInsertFactory,
        mockLogger,
      );

      const result = await capability.focus(LOGGING_CONTEXT);

      expect(result).toBeOkWith((value: FocusedDestination) => {
        expect(value.inserter).toBe(mockInserterFn);
      });
      expect(mockAdapter.hasVisibleEditorAt).toHaveBeenCalledWith(DOCUMENT_URI, BOUND_VIEW_COLUMN);
      expect(mockAdapter.showTextDocument).toHaveBeenCalledWith(DOCUMENT_URI, {
        viewColumn: BOUND_VIEW_COLUMN,
      });
      expect(mockInsertFactory.forTarget).toHaveBeenCalledWith(freshEditor);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'EditorFocusCapability.resolveViewColumn',
          editorUri: DOCUMENT_URI_STRING,
          viewColumn: BOUND_VIEW_COLUMN,
        },
        'Editor at bound viewColumn',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { ...LOGGING_CONTEXT, editorUri: DOCUMENT_URI_STRING, viewColumn: BOUND_VIEW_COLUMN },
        'Editor focused via showTextDocument()',
      );
    });
  });

  describe('fallback — file moved to different viewColumn', () => {
    it('follows file to its new viewColumn', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'hasVisibleEditorAt').mockReturnValue(false);

      const movedEditor = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
        viewColumn: 2,
      });
      jest.spyOn(mockAdapter, 'findVisibleEditorsByUri').mockReturnValue([movedEditor]);

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
        BOUND_VIEW_COLUMN,
        mockInsertFactory,
        mockLogger,
      );

      const result = await capability.focus(LOGGING_CONTEXT);

      expect(result).toBeOkWith((value: FocusedDestination) => {
        expect(value.inserter).toBe(mockInserterFn);
      });
      expect(mockAdapter.showTextDocument).toHaveBeenCalledWith(DOCUMENT_URI, { viewColumn: 2 });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'EditorFocusCapability.resolveViewColumn',
          editorUri: DOCUMENT_URI_STRING,
          boundViewColumn: BOUND_VIEW_COLUMN,
          movedViewColumn: 2,
        },
        'Editor moved to different viewColumn, following it',
      );
    });

    it('returns error when file is not visible anywhere', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'hasVisibleEditorAt').mockReturnValue(false);
      jest.spyOn(mockAdapter, 'findVisibleEditorsByUri').mockReturnValue([]);
      const showErrorSpy = jest.spyOn(mockAdapter, 'showErrorMessage');

      const mockInsertFactory = createMockInsertFactory();
      const capability = new EditorFocusCapability(
        mockAdapter,
        DOCUMENT_URI,
        BOUND_VIEW_COLUMN,
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
        { fn: 'EditorFocusCapability.resolveViewColumn', editorUri: DOCUMENT_URI_STRING },
        'Bound editor not visible (defensive: auto-unbind should prevent this)',
      );
    });

    it('returns error when file moved but is in multiple tab groups', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'hasVisibleEditorAt').mockReturnValue(false);

      const editor1 = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
        viewColumn: 2,
      });
      const editor2 = createMockEditor({
        document: createMockDocument({ uri: DOCUMENT_URI }),
        viewColumn: 3,
      });
      jest.spyOn(mockAdapter, 'findVisibleEditorsByUri').mockReturnValue([editor1, editor2]);
      const showErrorSpy = jest.spyOn(mockAdapter, 'showErrorMessage');

      const mockInsertFactory = createMockInsertFactory();
      const capability = new EditorFocusCapability(
        mockAdapter,
        DOCUMENT_URI,
        BOUND_VIEW_COLUMN,
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
        {
          fn: 'EditorFocusCapability.resolveViewColumn',
          editorUri: DOCUMENT_URI_STRING,
          matchCount: 2,
        },
        'Bound editor moved but found in multiple tab groups — ambiguous target',
      );
    });
  });

  describe('showTextDocument failure', () => {
    it('returns SHOW_DOCUMENT_FAILED error with cause', async () => {
      const mockAdapter = createMockVscodeAdapter();
      jest.spyOn(mockAdapter, 'hasVisibleEditorAt').mockReturnValue(true);

      const showDocError = new Error('Tab group disposed');
      jest.spyOn(mockAdapter, 'showTextDocument').mockRejectedValue(showDocError);

      const mockInsertFactory = createMockInsertFactory();
      const capability = new EditorFocusCapability(
        mockAdapter,
        DOCUMENT_URI,
        BOUND_VIEW_COLUMN,
        mockInsertFactory,
        mockLogger,
      );

      const result = await capability.focus(LOGGING_CONTEXT);

      expect(result).toBeErrWith((error) => {
        expect(error).toStrictEqual({ reason: 'SHOW_DOCUMENT_FAILED', cause: showDocError });
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          ...LOGGING_CONTEXT,
          editorUri: DOCUMENT_URI_STRING,
          viewColumn: BOUND_VIEW_COLUMN,
          error: showDocError,
        },
        'Failed to focus editor',
      );
    });
  });
});
