import type { ClipboardPreserver } from '../../clipboard/ClipboardPreserver';

export const createMockClipboardPreserver = (): jest.Mocked<ClipboardPreserver> =>
  ({
    preserve: jest.fn((fn: () => Promise<unknown>, _shouldRestore?: () => boolean) => fn()),
  }) as unknown as jest.Mocked<ClipboardPreserver>;
