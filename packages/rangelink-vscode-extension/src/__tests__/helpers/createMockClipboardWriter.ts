import type { ClipboardWriter } from '../../ide/ClipboardProvider';

export const createMockClipboardWriter = (): jest.Mocked<ClipboardWriter> => ({
  writeTextToClipboard: jest.fn().mockResolvedValue(undefined),
});
