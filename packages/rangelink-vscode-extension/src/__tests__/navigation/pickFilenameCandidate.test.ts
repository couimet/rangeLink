import { pickFilenameCandidate } from '../../navigation/pickFilenameCandidate';
import { createMockUri, createMockVscodeAdapter } from '../helpers';

import type { Logger } from '@couimet/logger-contract';
import { createMockLogger } from '@couimet/logger-contract-testing';

describe('pickFilenameCandidate', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should show a quick pick sorted by relative path and return the picked URI', async () => {
    const candidate1 = createMockUri('/workspace/src/auth.ts');
    const candidate2 = createMockUri('/workspace/lib/auth.ts');
    const pickedItem = { label: 'auth.ts', description: 'lib/auth.ts', uri: candidate2 };
    const mockShowQuickPick = jest.fn().mockResolvedValue(pickedItem);
    const adapter = createMockVscodeAdapter({ windowOptions: { showQuickPick: mockShowQuickPick } });

    const result = await pickFilenameCandidate(adapter, [candidate1, candidate2], mockLogger);

    expect(result).toBe(candidate2);
    expect(mockShowQuickPick).toHaveBeenCalledWith(
      [
        { label: 'auth.ts', description: 'lib/auth.ts', uri: candidate2 },
        { label: 'auth.ts', description: 'src/auth.ts', uri: candidate1 },
      ],
      { placeHolder: 'Select a file to navigate to' },
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'pickFilenameCandidate', uri: '/workspace/lib/auth.ts', candidateCount: 2 },
      'User picked a filename candidate',
    );
  });

  it('should return undefined and log dismissal when the quick pick is dismissed', async () => {
    const candidate1 = createMockUri('/workspace/src/auth.ts');
    const mockShowQuickPick = jest.fn().mockResolvedValue(undefined);
    const adapter = createMockVscodeAdapter({ windowOptions: { showQuickPick: mockShowQuickPick } });

    const result = await pickFilenameCandidate(adapter, [candidate1], mockLogger);

    expect(result).toBeUndefined();
    expect(mockLogger.debug).toHaveBeenCalledWith({ fn: 'pickFilenameCandidate', candidateCount: 1 }, 'Filename picker dismissed, navigation cancelled');
  });
});
