import { validateNormalMode } from '../../selection/validateNormalMode';
import { InputSelection } from '../../types/InputSelection';
import { SelectionCoverage } from '../../types/SelectionCoverage';

describe('validateNormalMode', () => {
  describe('Multiple selections not allowed', () => {
    it('should throw error for 2 selections', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 15, character: 0 },
          end: { line: 15, character: 10 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateNormalMode(selections)).toThrowRangeLinkError(
        'SELECTION_NORMAL_MULTIPLE',
        {
          message:
            'Normal mode does not support multiple selections (got 2). Multiple non-contiguous selections are not yet implemented.',
          functionName: 'validateNormalMode',
          details: { selectionsLength: 2 },
        },
      );
    });

    it('should throw error for 3 selections', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 15, character: 0 },
          end: { line: 15, character: 10 },
          coverage: SelectionCoverage.PartialLine,
        },
        {
          start: { line: 20, character: 0 },
          end: { line: 20, character: 10 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      expect(() => validateNormalMode(selections)).toThrowRangeLinkError(
        'SELECTION_NORMAL_MULTIPLE',
        {
          message:
            'Normal mode does not support multiple selections (got 3). Multiple non-contiguous selections are not yet implemented.',
          functionName: 'validateNormalMode',
          details: { selectionsLength: 3 },
        },
      );
    });

    it('should throw error for 10 selections', () => {
      const selections: InputSelection['selections'] = Array.from({ length: 10 }, (_, i) => ({
        start: { line: i * 10, character: 0 },
        end: { line: i * 10, character: 10 },
        coverage: SelectionCoverage.PartialLine,
      }));

      expect(() => validateNormalMode(selections)).toThrowRangeLinkError(
        'SELECTION_NORMAL_MULTIPLE',
        {
          message:
            'Normal mode does not support multiple selections (got 10). Multiple non-contiguous selections are not yet implemented.',
          functionName: 'validateNormalMode',
          details: { selectionsLength: 10 },
        },
      );
    });
  });

  describe('Empty selections array', () => {
    it('should throw error for 0 selections', () => {
      const selections: InputSelection['selections'] = [];

      expect(() => validateNormalMode(selections)).toThrowRangeLinkError(
        'SELECTION_NORMAL_MULTIPLE',
        {
          message:
            'Normal mode does not support multiple selections (got 0). Multiple non-contiguous selections are not yet implemented.',
          functionName: 'validateNormalMode',
          details: { selectionsLength: 0 },
        },
      );
    });
  });

  describe('Valid single selection', () => {
    it('should not throw for single selection', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 20, character: 15 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateNormalMode(selections);
    });

    it('should not throw for single-line selection', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 42, character: 10 },
          end: { line: 42, character: 50 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateNormalMode(selections);
    });

    it('should not throw for multi-line selection', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 10, character: 5 },
          end: { line: 100, character: 20 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateNormalMode(selections);
    });

    it('should not throw for selection at line 0', () => {
      const selections: InputSelection['selections'] = [
        {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
          coverage: SelectionCoverage.PartialLine,
        },
      ];

      validateNormalMode(selections);
    });
  });
});
