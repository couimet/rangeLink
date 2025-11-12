import { RangeLinkError } from '../errors/RangeLinkError';
import { RangeLinkErrorCodes } from '../errors/RangeLinkErrorCodes';
import { InputSelection } from '../types/InputSelection';

/**
 * Validates Normal mode selections.
 *
 * Normal mode only supports single selections. Multiple non-contiguous
 * selections are not yet implemented.
 *
 * @param selections Array of selections to validate
 * @throws {RangeLinkError} If validation fails
 */
export const validateNormalMode = (selections: InputSelection['selections']): void => {
  if (selections.length !== 1) {
    throw new RangeLinkError({
      code: RangeLinkErrorCodes.SELECTION_NORMAL_MULTIPLE,
      message: `Normal mode does not support multiple selections (got ${selections.length}). Multiple non-contiguous selections are not yet implemented.`,
      functionName: 'validateNormalMode',
      details: { selectionsLength: selections.length },
    });
  }
};
