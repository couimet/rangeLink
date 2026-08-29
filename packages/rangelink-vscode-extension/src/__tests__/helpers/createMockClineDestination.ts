import { createBaseMockPasteDestination, type MockDestinationOptions } from './createBaseMockPasteDestination';

/**
 * Create a mock Cline destination for testing (Paradigm A).
 *
 * Uses Paradigm A (pure jest mocks). For Paradigm B (real class with mocked
 * capabilities), use createMockClineComposableDestination.
 *
 * @param overrides - Optional overrides for mock behavior
 * @returns Mock PasteDestination configured as Cline
 */
export const createMockClineDestination = (overrides?: Omit<MockDestinationOptions, 'id'>) =>
  createBaseMockPasteDestination({
    id: 'cline',
    displayName: 'Cline',
    ...overrides,
  });
