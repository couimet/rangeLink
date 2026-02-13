import type { QuickPickProvider } from '../../ide/QuickPickProvider';

export const createMockQuickPickProvider = (): jest.Mocked<QuickPickProvider> => ({
  showQuickPick: jest.fn(),
});
