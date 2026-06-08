import { Result } from 'rangelink-core-ts';

import type { ClipboardService } from '../../clipboard/ClipboardService';

export const createMockClipboardService = (): jest.Mocked<ClipboardService> =>
  ({
    stage: jest.fn((_text: string, fn: () => Promise<unknown>) => fn().then((v) => Result.ok(v))),
    route: jest.fn((fn: () => Promise<unknown>, _shouldRestore?: () => boolean) =>
      fn().then((v) => Result.ok(v)),
    ),
    read: jest.fn().mockResolvedValue(Result.ok('')),
    write: jest.fn().mockResolvedValue(Result.ok(undefined)),
    restoreClipboard: jest.fn().mockResolvedValue(undefined),
    capture: jest.fn((producer: () => Promise<unknown>) =>
      producer().then((produced) => Result.ok({ clipboard: '', produced })),
    ),
  }) as unknown as jest.Mocked<ClipboardService>;
