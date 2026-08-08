import { validateNormalMode } from '../../selection/validateNormalMode';
import { InputSelection } from '../../types/InputSelection';
import { SelectionCoverage } from '../../types/SelectionCoverage';

import { getUniqueInt } from '@couimet/dynamic-testing';

const COORDINATE_OFFSET = 10;

describe('validateNormalMode', () => {
  let startLine: number;
  let endLine: number;
  let startChar: number;
  let endChar: number;

  beforeEach(() => {
    startLine = getUniqueInt();
    endLine = startLine + COORDINATE_OFFSET;
    startChar = getUniqueInt();
    endChar = startChar + COORDINATE_OFFSET;
  });

  describe('Multiple selections not allowed', () => {
    it('should throw error for 2 selections', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: endLine, character: 0 },
          end: { line: endLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateNormalMode(selections)).toThrowDetailedError('SELECTION_NORMAL_MULTIPLE', {
        message: 'Normal mode does not support multiple selections (got 2). Multiple non-contiguous selections are not yet implemented.',
        functionName: 'validateNormalMode',
        details: { selectionsLength: 2 },
      });
    });

    it('should throw error for 3 selections', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: endLine, character: 0 },
          end: { line: endLine, character: startChar },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: endLine + 5, character: 0 },
          end: { line: endLine + 5, character: startChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateNormalMode(selections)).toThrowDetailedError('SELECTION_NORMAL_MULTIPLE', {
        message: 'Normal mode does not support multiple selections (got 3). Multiple non-contiguous selections are not yet implemented.',
        functionName: 'validateNormalMode',
        details: { selectionsLength: 3 },
      });
    });

    it('should throw error for 10 selections', () => {
      const selections: InputSelection['selections'] = Array.from({ length: 10 }, (_, i) => ({
        start: { line: startLine + i * 5, character: 0 },
        end: { line: startLine + i * 5, character: endChar },
        coverage: SelectionCoverage.PartialLine,
      }));

      expect(() => validateNormalMode(selections)).toThrowDetailedError('SELECTION_NORMAL_MULTIPLE', {
        message: 'Normal mode does not support multiple selections (got 10). Multiple non-contiguous selections are not yet implemented.',
        functionName: 'validateNormalMode',
        details: { selectionsLength: 10 },
      });
    });
  });

  describe('Empty selections array', () => {
    it('should throw error for 0 selections', () => {
      const selections: InputSelection['selections'] = [];

      expect(() => validateNormalMode(selections)).toThrowDetailedError('SELECTION_NORMAL_MULTIPLE', {
        message: 'Normal mode does not support multiple selections (got 0). Multiple non-contiguous selections are not yet implemented.',
        functionName: 'validateNormalMode',
        details: { selectionsLength: 0 },
      });
    });
  });

  describe('Valid single selection', () => {
    it('should not throw for single selection', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: endLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateNormalMode(selections);
    });

    it('should not throw for single-line selection', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: startLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateNormalMode(selections);
    });

    it('should not throw for multi-line selection', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: startLine, character: startChar },
          end: { line: endLine, character: endChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateNormalMode(selections);
    });

    it('should not throw for selection at line 0', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 0, character: 0 },
          end: { line: 0, character: startChar },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateNormalMode(selections);
    });
  });
});
