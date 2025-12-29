import { createMockLogger } from 'barebone-logger-testing';
import {
  DEFAULT_DELIMITERS,
  LinkType,
  SelectionCoverage,
  SelectionType,
} from 'rangelink-core-ts';
import type * as vscode from 'vscode';

import { generateLinkFromSelections } from '../../utils/generateLinkFromSelections';
import { toInputSelection } from '../../utils/toInputSelection';

jest.mock('../../utils/toInputSelection');

const createMockSelection = (
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
): vscode.Selection =>
  ({
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar },
    anchor: { line: startLine, character: startChar },
    active: { line: endLine, character: endChar },
    isReversed: false,
    isEmpty: startLine === endLine && startChar === endChar,
  }) as vscode.Selection;

const createMockDocument = (): vscode.TextDocument =>
  ({
    uri: { fsPath: '/test/file.ts' },
    lineAt: jest.fn(),
    lineCount: 100,
  }) as unknown as vscode.TextDocument;

describe('generateLinkFromSelections', () => {
  const mockToInputSelection = toInputSelection as jest.MockedFunction<typeof toInputSelection>;
  const mockLogger = createMockLogger();

  describe('empty selection rejection', () => {
    it('returns error when selections array is empty', () => {
      const result = generateLinkFromSelections({
        referencePath: '/test/file.ts',
        document: createMockDocument(),
        selections: [],
        delimiters: DEFAULT_DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      });

      expect(result).toBeRangeLinkExtensionErrorErr('GENERATE_LINK_SELECTION_EMPTY', {
        message: 'No text selected',
        functionName: 'generateLinkFromSelections',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections' },
        'Empty selections - rejecting',
      );
    });

    it('returns error when all selections are empty (cursor positions)', () => {
      const result = generateLinkFromSelections({
        referencePath: '/test/file.ts',
        document: createMockDocument(),
        selections: [createMockSelection(5, 10, 5, 10), createMockSelection(6, 5, 6, 5)],
        delimiters: DEFAULT_DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      });

      expect(result).toBeRangeLinkExtensionErrorErr('GENERATE_LINK_SELECTION_EMPTY', {
        message: 'No text selected',
        functionName: 'generateLinkFromSelections',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections' },
        'Empty selections - rejecting',
      );
    });
  });

  describe('successful link generation', () => {
    it('generates Regular link for single-line selection', () => {
      mockToInputSelection.mockReturnValue({
        selections: [
          {
            start: { line: 9, char: 0 },
            end: { line: 9, char: 20 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      });

      const result = generateLinkFromSelections({
        referencePath: 'src/utils/helper.ts',
        document: createMockDocument(),
        selections: [createMockSelection(9, 0, 9, 20)],
        delimiters: DEFAULT_DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      });

      expect(result.success).toBe(true);
      expect(result.value.link).toBe('src/utils/helper.ts#L10');
      expect(result.value.linkType).toBe('regular');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections', link: 'src/utils/helper.ts#L10' },
        'Generated regular link: src/utils/helper.ts#L10',
      );
    });

    it('generates Portable link when linkType is Portable', () => {
      mockToInputSelection.mockReturnValue({
        selections: [
          {
            start: { line: 4, char: 2 },
            end: { line: 4, char: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      });

      const result = generateLinkFromSelections({
        referencePath: '/absolute/path/file.ts',
        document: createMockDocument(),
        selections: [createMockSelection(4, 2, 4, 15)],
        delimiters: DEFAULT_DELIMITERS,
        linkType: LinkType.Portable,
        logger: mockLogger,
      });

      expect(result.success).toBe(true);
      expect(result.value.linkType).toBe('portable');
      expect(result.value.link).toContain('/absolute/path/file.ts#');
      expect(result.value.link).toContain('L5C3');
    });

    it('generates multi-line link for range selection', () => {
      mockToInputSelection.mockReturnValue({
        selections: [
          {
            start: { line: 10, char: 0 },
            end: { line: 15, char: 0 },
            coverage: SelectionCoverage.FullLine,
          },
        ],
        selectionType: SelectionType.Normal,
      });

      const result = generateLinkFromSelections({
        referencePath: 'src/component.tsx',
        document: createMockDocument(),
        selections: [createMockSelection(10, 0, 15, 0)],
        delimiters: DEFAULT_DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      });

      expect(result.success).toBe(true);
      expect(result.value.link).toBe('src/component.tsx#L11-L16');
    });
  });

  describe('toInputSelection error handling', () => {
    it('returns error when toInputSelection throws', () => {
      const testError = new Error('Document was modified');
      mockToInputSelection.mockImplementation(() => {
        throw testError;
      });

      const result = generateLinkFromSelections({
        referencePath: '/test/file.ts',
        document: createMockDocument(),
        selections: [createMockSelection(0, 0, 0, 10)],
        delimiters: DEFAULT_DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      });

      expect(result).toBeRangeLinkExtensionErrorErr('GENERATE_LINK_SELECTION_CONVERSION_FAILED', {
        message: 'Document was modified',
        functionName: 'generateLinkFromSelections',
        cause: testError,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        { fn: 'generateLinkFromSelections', error: testError },
        'Failed to convert selections to InputSelection',
      );
    });
  });

  describe('formatLink error handling', () => {
    it('wraps formatLink error in extension error', () => {
      mockToInputSelection.mockReturnValue({
        selections: [
          {
            start: { line: 10, char: 5 },
            end: { line: 5, char: 0 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      });

      const result = generateLinkFromSelections({
        referencePath: 'test.ts',
        document: createMockDocument(),
        selections: [createMockSelection(10, 5, 5, 0)],
        delimiters: DEFAULT_DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      });

      expect(result).toBeRangeLinkExtensionErrorErr('GENERATE_LINK_FORMAT_FAILED', {
        message: 'Backward selection not allowed (startLine=10 > endLine=5)',
        functionName: 'generateLinkFromSelections',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ fn: 'generateLinkFromSelections' }),
        'formatLink failed',
      );
    });
  });

  describe('toInputSelection delegation', () => {
    it('passes document and selections to toInputSelection', () => {
      const mockDoc = createMockDocument();
      const selections = [createMockSelection(0, 0, 0, 10)];

      mockToInputSelection.mockReturnValue({
        selections: [
          {
            start: { line: 0, char: 0 },
            end: { line: 0, char: 10 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      });

      generateLinkFromSelections({
        referencePath: 'test.ts',
        document: mockDoc,
        selections,
        delimiters: DEFAULT_DELIMITERS,
        linkType: LinkType.Regular,
        logger: mockLogger,
      });

      expect(mockToInputSelection).toHaveBeenCalledWith(mockDoc, selections);
    });
  });
});
