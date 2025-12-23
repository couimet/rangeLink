import type { ErrorFeedbackProvider } from '../../ide/ErrorFeedbackProvider';

/**
 * Creates a mock ErrorFeedbackProvider for testing error notification code.
 *
 * @returns A mocked ErrorFeedbackProvider with jest mock functions
 */
export const createMockErrorFeedbackProvider = (): jest.Mocked<ErrorFeedbackProvider> => ({
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
});
