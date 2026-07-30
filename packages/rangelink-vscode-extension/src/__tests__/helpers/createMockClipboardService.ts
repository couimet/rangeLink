import type { ClipboardService } from '../../clipboard/ClipboardService';

import { DetailedResult } from '@couimet/detailed-result';

export const createMockClipboardService = (): jest.Mocked<ClipboardService> =>
  ({
    stage: jest.fn((_text: string, fn: () => Promise<unknown>) =>
      fn()
        .then((v) => DetailedResult.success(v))
        .catch((err) => DetailedResult.failure(err)),
    ),
    route: jest.fn((fn: () => Promise<unknown>, _shouldRestore?: () => boolean) =>
      fn()
        .then((v) => DetailedResult.success(v))
        .catch((err) => DetailedResult.failure(err)),
    ),
    read: jest.fn().mockResolvedValue(DetailedResult.success('')),
    write: jest.fn().mockResolvedValue(DetailedResult.success(undefined)),
    restoreClipboard: jest.fn().mockResolvedValue(undefined),
    capture: jest.fn((producer: () => Promise<unknown>) =>
      producer()
        .then((produced) => DetailedResult.success({ clipboard: '', produced }))
        .catch((err) => DetailedResult.failure(err)),
    ),
  }) as unknown as jest.Mocked<ClipboardService>;
