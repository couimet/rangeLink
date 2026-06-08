import type { OperationFeedbackProvider } from '../../feedback/OperationFeedbackProvider';

export const createMockOperationFeedbackProvider = (): jest.Mocked<OperationFeedbackProvider> =>
  ({
    showError: jest.fn(),
    provideCopyFeedback: jest.fn(),
    provideSendFeedback: jest.fn(),
  }) as unknown as jest.Mocked<OperationFeedbackProvider>;
