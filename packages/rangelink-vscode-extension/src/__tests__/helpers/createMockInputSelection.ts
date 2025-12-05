/**
 * Create a mock InputSelection for testing
 */

import type { InputSelection } from 'rangelink-core-ts';

/**
 * Create a mock InputSelection with minimal helper pattern.
 *
 * **Minimal Helper Philosophy:**
 * - No smart defaults or hidden behaviors
 * - Caller provides exactly what they need
 *
 * @param overrides - InputSelection properties (selections, selectionType)
 * @returns Mock InputSelection with provided properties
 */
export const createMockInputSelection = (overrides: Partial<InputSelection>): InputSelection => {
  return {
    ...overrides,
  } as InputSelection;
};
