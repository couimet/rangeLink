import { getUniqueInt } from '@couimet/dynamic-testing';

import { RangeLinkError } from '../../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../../errors/RangeLinkErrorCodes';
import { validateInputSelection } from '../../selection/validateInputSelection';
import { validateNormalMode } from '../../selection/validateNormalMode';
import { validateRectangularMode } from '../../selection/validateRectangularMode';
import { InputSelection } from '../../types/InputSelection';
import { SelectionCoverage } from '../../types/SelectionCoverage';
import { SelectionType } from '../../types/SelectionType';

jest.mock('../../selection/validateNormalMode');
jest.mock('../../selection/validateRectangularMode');

const mockValidateNormalMode = validateNormalMode as jest.MockedFunction<typeof validateNormalMode>;
const mockValidateRectangularMode = validateRectangularMode as jest.MockedFunction<
  typeof validateRectangularMode
>;

describe('validateInputSelection', () => {
  describe('Empty selections array', () => {
    it('should throw error for empty selections array', () => {
      const inputSelection: InputSelection = {
        selections: [],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_EMPTY',
        {
          message: 'Selections array must not be empty',
          functionName: 'validateInputSelection',
          details: { selectionsLength: 0 },
        },
      );
    });
  });

  describe('Backward line selection', () => {
    it('should throw error when startLine > endLine', () => {
      const base = getUniqueInt();
      const startLine = base + 10;
      const endLine = base;
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: getUniqueInt() },
            end: { line: endLine, character: getUniqueInt() },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_BACKWARD_LINE',
        {
          message: `Backward selection not allowed (startLine=${startLine} > endLine=${endLine})`,
          functionName: 'validateInputSelection',
          details: {
            selectionIndex: 0,
            startLine,
            endLine,
          },
        },
      );
    });
  });

  describe('Backward character selection', () => {
    it('should throw error when startCharacter > endCharacter on same line', () => {
      const base = getUniqueInt();
      const line = getUniqueInt();
      const startPosition = base + 15;
      const endPosition = base;
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line, character: startPosition },
            end: { line, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_BACKWARD_CHARACTER',
        {
          message: `Backward character selection not allowed (startCharacter=${startPosition} > endCharacter=${endPosition} on line ${line})`,
          functionName: 'validateInputSelection',
          details: {
            selectionIndex: 0,
            line,
            startCharacter: startPosition,
            endCharacter: endPosition,
          },
        },
      );
    });

    it('should allow startCharacter > endCharacter when on different lines', () => {
      const base = getUniqueInt();
      const startLine = getUniqueInt();
      const endLine = startLine + 5;
      const startPosition = base + 15;
      const endPosition = base;
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: startLine, character: startPosition },
            end: { line: endLine, character: endPosition },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      validateInputSelection(inputSelection);
    });
  });

  describe('Negative coordinates', () => {
    it('should throw error for negative startLine', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: -1, character: 0 },

            end: { line: 10, character: 10 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_NEGATIVE_COORDINATES',
        {
          message:
            'Negative coordinates not allowed (startLine=-1, endLine=10, startCharacter=0, endCharacter=10)',
          functionName: 'validateInputSelection',
          details: {
            selectionIndex: 0,
            startLine: -1,
            endLine: 10,
            startCharacter: 0,
            endCharacter: 10,
          },
        },
      );
    });

    it('should throw error for negative endLine', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 0, character: 0 },

            end: { line: -1, character: 10 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_NEGATIVE_COORDINATES',
        {
          message:
            'Negative coordinates not allowed (startLine=0, endLine=-1, startCharacter=0, endCharacter=10)',
          functionName: 'validateInputSelection',
          details: {
            selectionIndex: 0,
            startLine: 0,
            endLine: -1,
            startCharacter: 0,
            endCharacter: 10,
          },
        },
      );
    });

    it('should throw error for negative startCharacter', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 0, character: -1 },

            end: { line: 10, character: 10 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_NEGATIVE_COORDINATES',
        {
          message:
            'Negative coordinates not allowed (startLine=0, endLine=10, startCharacter=-1, endCharacter=10)',
          functionName: 'validateInputSelection',
          details: {
            selectionIndex: 0,
            startLine: 0,
            endLine: 10,
            startCharacter: -1,
            endCharacter: 10,
          },
        },
      );
    });

    it('should throw error for negative endCharacter', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 0, character: 0 },

            end: { line: 10, character: -1 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_NEGATIVE_COORDINATES',
        {
          message:
            'Negative coordinates not allowed (startLine=0, endLine=10, startCharacter=0, endCharacter=-1)',
          functionName: 'validateInputSelection',
          details: {
            selectionIndex: 0,
            startLine: 0,
            endLine: 10,
            startCharacter: 0,
            endCharacter: -1,
          },
        },
      );
    });
  });

  describe('ERR_3010: Unknown SelectionType', () => {
    it('should throw error for unknown SelectionType', () => {
      const inputSelection = {
        selections: [
          {
            start: { line: 10, character: 5 },

            end: { line: 10, character: 15 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: 'InvalidType' as any,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_UNKNOWN_TYPE',
        {
          message: 'Unknown SelectionType: "InvalidType"',
          functionName: 'validateInputSelection',
          details: { selectionType: 'InvalidType' },
        },
      );
    });
  });

  describe('ERR_3011: Zero-width selection', () => {
    it('should throw error for zero-width selection (cursor position)', () => {
      const line = getUniqueInt();
      const position = getUniqueInt();
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line, character: position },
            end: { line, character: position },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_ZERO_WIDTH',
        {
          message: `Zero-width selection not allowed (cursor position at line ${line}, character ${position})`,
          functionName: 'validateInputSelection',
          details: {
            selectionIndex: 0,
            line,
            character: position,
          },
        },
      );
    });

    it('should throw error for zero-width selection at line start', () => {
      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: 0, character: 0 },

            end: { line: 0, character: 0 },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      expect(() => validateInputSelection(inputSelection)).toThrowRangeLinkError(
        'SELECTION_ZERO_WIDTH',
        {
          message: 'Zero-width selection not allowed (cursor position at line 0, character 0)',
          functionName: 'validateInputSelection',
          details: {
            selectionIndex: 0,
            line: 0,
            character: 0,
          },
        },
      );
    });
  });

  describe('Mode-specific validation delegation', () => {
    describe('Normal mode', () => {
      it('should call validateNormalMode with selections array', () => {
        mockValidateNormalMode.mockImplementation(() => {});

        const inputSelection: InputSelection = {
          selections: [
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        };

        validateInputSelection(inputSelection);

        expect(mockValidateNormalMode).toHaveBeenCalledTimes(1);
        expect(mockValidateNormalMode).toHaveBeenCalledWith(inputSelection.selections);
      });

      it('should propagate errors from validateNormalMode', () => {
        const expectedError = new RangeLinkError({
          code: RangeLinkErrorCodes.SELECTION_NORMAL_MULTIPLE,
          message: 'Normal mode does not support multiple selections (got 2)',
          functionName: 'validateNormalMode',
        });

        mockValidateNormalMode.mockImplementation(() => {
          throw expectedError;
        });

        const inputSelection: InputSelection = {
          selections: [
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        };

        expect(() => validateInputSelection(inputSelection)).toThrow(expectedError);
      });

      it('should not call validateRectangularMode for Normal mode', () => {
        mockValidateNormalMode.mockImplementation(() => {});

        const inputSelection: InputSelection = {
          selections: [
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Normal,
        };

        validateInputSelection(inputSelection);

        expect(mockValidateRectangularMode).not.toHaveBeenCalled();
      });
    });

    describe('Rectangular mode', () => {
      it('should call validateRectangularMode with selections array', () => {
        mockValidateRectangularMode.mockImplementation(() => {});

        const inputSelection: InputSelection = {
          selections: [
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Rectangular,
        };

        validateInputSelection(inputSelection);

        expect(mockValidateRectangularMode).toHaveBeenCalledTimes(1);
        expect(mockValidateRectangularMode).toHaveBeenCalledWith(inputSelection.selections);
      });

      it('should propagate errors from validateRectangularMode', () => {
        const expectedError = new RangeLinkError({
          code: RangeLinkErrorCodes.SELECTION_RECTANGULAR_UNSORTED,
          message: 'Rectangular mode selections must be sorted by line number',
          functionName: 'validateRectangularMode',
        });

        mockValidateRectangularMode.mockImplementation(() => {
          throw expectedError;
        });

        const inputSelection: InputSelection = {
          selections: [
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Rectangular,
        };

        expect(() => validateInputSelection(inputSelection)).toThrow(expectedError);
      });

      it('should not call validateNormalMode for Rectangular mode', () => {
        mockValidateRectangularMode.mockImplementation(() => {});

        const inputSelection: InputSelection = {
          selections: [
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
            {
              start: { line: getUniqueInt(), character: getUniqueInt() },
              end: { line: getUniqueInt(), character: getUniqueInt() },
              coverage: SelectionCoverage.PartialLine,
            },
          ],
          selectionType: SelectionType.Rectangular,
        };

        validateInputSelection(inputSelection);

        expect(mockValidateNormalMode).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration: Valid selections', () => {
    it('should not throw for valid Normal selection', () => {
      mockValidateNormalMode.mockImplementation(() => {});

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: getUniqueInt(), character: getUniqueInt() },
            end: { line: getUniqueInt(), character: getUniqueInt() },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Normal,
      };

      validateInputSelection(inputSelection);
      expect(mockValidateNormalMode).toHaveBeenCalledWith(inputSelection.selections);
    });

    it('should not throw for valid Rectangular selections', () => {
      mockValidateRectangularMode.mockImplementation(() => {});

      const inputSelection: InputSelection = {
        selections: [
          {
            start: { line: getUniqueInt(), character: getUniqueInt() },
            end: { line: getUniqueInt(), character: getUniqueInt() },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: getUniqueInt(), character: getUniqueInt() },
            end: { line: getUniqueInt(), character: getUniqueInt() },
            coverage: SelectionCoverage.PartialLine,
          },
          {
            start: { line: getUniqueInt(), character: getUniqueInt() },
            end: { line: getUniqueInt(), character: getUniqueInt() },
            coverage: SelectionCoverage.PartialLine,
          },
        ],
        selectionType: SelectionType.Rectangular,
      };

      validateInputSelection(inputSelection);
      expect(mockValidateRectangularMode).toHaveBeenCalledWith(inputSelection.selections);
    });
  });
});
