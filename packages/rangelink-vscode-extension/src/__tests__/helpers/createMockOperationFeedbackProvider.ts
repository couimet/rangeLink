import type { BindingFeedback } from '../../feedback/BindingFeedback';
import type { LifecycleFeedbackProvider } from '../../feedback/LifecycleFeedbackProvider';
import type { OperationFeedbackProvider } from '../../feedback/OperationFeedbackProvider';

export const createMockOperationFeedbackProvider = (): jest.Mocked<
  OperationFeedbackProvider & LifecycleFeedbackProvider & BindingFeedback
> =>
  ({
    showError: jest.fn(),
    provideCopyFeedback: jest.fn(),
    provideSendFeedback: jest.fn(),
    notifyAutoUnbind: jest.fn(),
    notifyDuplicateTabWarning: jest.fn(),
    notifyBound: jest.fn(),
    notifyAlreadyBound: jest.fn(),
    notifyBindFailedEditor: jest.fn(),
    notifyBindFailedNotAvailable: jest.fn(),
    notifyBackgroundTabOpened: jest.fn(),
    notifyUnbound: jest.fn(),
    notifyNothingToUnbind: jest.fn(),
    notifyJumpFocused: jest.fn(),
    notifyJumpFailed: jest.fn(),
  }) as unknown as jest.Mocked<
    OperationFeedbackProvider & LifecycleFeedbackProvider & BindingFeedback
  >;
