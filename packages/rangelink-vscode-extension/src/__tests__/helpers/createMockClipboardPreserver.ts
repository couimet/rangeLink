import type { ClipboardPreserver } from '../../clipboard/ClipboardPreserver';

export const createMockClipboardPreserver = (): jest.Mocked<ClipboardPreserver> =>
  ({
    preserve: jest.fn((fn) => fn()),
  }) as unknown as jest.Mocked<ClipboardPreserver>;
