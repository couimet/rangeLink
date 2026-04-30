import { createMockLogger } from 'barebone-logger-testing';

import { ReleaseNotifier } from '../../notification/ReleaseNotifier';
import type { VersionInfo } from '../../types';
import { createMockVscodeAdapter } from '../helpers';

describe('ReleaseNotifier', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  const VERSION_INFO_100: VersionInfo = {
    version: '1.0.0',
    commit: 'abc123',
    commitFull: 'abc123def456',
    branch: 'main',
    buildDate: '2025-01-01',
    isDirty: false,
  };

  const VERSION_INFO_110: VersionInfo = {
    ...VERSION_INFO_100,
    version: '1.1.0',
  };

  const createMockGlobalState = (storedVersion?: string) => ({
    get: jest.fn().mockReturnValue(storedVersion),
    update: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockReturnValue([]),
  });

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('constructor', () => {
    it('logs initialization', () => {
      const globalState = createMockGlobalState();
      const adapter = createMockVscodeAdapter();

      new ReleaseNotifier(globalState as any, VERSION_INFO_100, adapter, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'ReleaseNotifier.constructor' },
        'ReleaseNotifier initialized',
      );
    });
  });

  describe('maybeNotify()', () => {
    describe('when versionInfo is undefined', () => {
      it('logs a warning and skips silently', async () => {
        const globalState = createMockGlobalState();
        const adapter = createMockVscodeAdapter();
        const notifier = new ReleaseNotifier(globalState as any, undefined, adapter, mockLogger);

        await notifier.maybeNotify();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          { fn: 'ReleaseNotifier.maybeNotify' },
          'Version info unavailable — skipping release notification',
        );
        expect(globalState.get).not.toHaveBeenCalled();
        expect(globalState.update).not.toHaveBeenCalled();
      });
    });

    describe('when no version has been stored yet (first install)', () => {
      it('stores the current version and shows no notification', async () => {
        const globalState = createMockGlobalState(undefined);
        const mockShowInformationMessage = jest.fn();
        const adapter = createMockVscodeAdapter({
          windowOptions: { showInformationMessage: mockShowInformationMessage },
        });
        const notifier = new ReleaseNotifier(
          globalState as any,
          VERSION_INFO_100,
          adapter,
          mockLogger,
        );

        await notifier.maybeNotify();

        expect(globalState.get).toHaveBeenCalledWith('rangelink.lastNotifiedVersion');
        expect(globalState.update).toHaveBeenCalledWith('rangelink.lastNotifiedVersion', '1.0.0');
        expect(mockShowInformationMessage).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ReleaseNotifier.maybeNotify', version: '1.0.0' },
          'First install — stored version, skipping notification',
        );
      });
    });

    describe('when stored version equals current version', () => {
      it('skips silently', async () => {
        const globalState = createMockGlobalState('1.0.0');
        const mockShowInformationMessage = jest.fn();
        const adapter = createMockVscodeAdapter({
          windowOptions: { showInformationMessage: mockShowInformationMessage },
        });
        const notifier = new ReleaseNotifier(
          globalState as any,
          VERSION_INFO_100,
          adapter,
          mockLogger,
        );

        await notifier.maybeNotify();

        expect(mockShowInformationMessage).not.toHaveBeenCalled();
        expect(globalState.update).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ReleaseNotifier.maybeNotify', version: '1.0.0' },
          'Same version — skipping release notification',
        );
      });
    });

    describe('when version upgrade is detected', () => {
      it('shows notification with both buttons and does not store version', async () => {
        const globalState = createMockGlobalState('1.0.0');
        const mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
        const adapter = createMockVscodeAdapter({
          windowOptions: { showInformationMessage: mockShowInformationMessage },
        });
        const notifier = new ReleaseNotifier(
          globalState as any,
          VERSION_INFO_110,
          adapter,
          mockLogger,
        );

        await notifier.maybeNotify();

        expect(mockShowInformationMessage).toHaveBeenCalledWith(
          'RangeLink updated to v1.1.0. See what changed!',
          "What's New",
          'Skip for this version',
        );
        expect(globalState.update).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
          {
            fn: 'ReleaseNotifier.maybeNotify',
            previousVersion: '1.0.0',
            currentVersion: '1.1.0',
          },
          'Version upgrade detected — showing release notification',
        );
      });

      it('does not store version and does not open browser when user dismisses', async () => {
        const globalState = createMockGlobalState('1.0.0');
        const mockShowInformationMessage = jest.fn().mockResolvedValue(undefined);
        const mockOpenExternal = jest.fn();
        const adapter = createMockVscodeAdapter({
          windowOptions: { showInformationMessage: mockShowInformationMessage },
          envOptions: { openExternal: mockOpenExternal },
        });
        const notifier = new ReleaseNotifier(
          globalState as any,
          VERSION_INFO_110,
          adapter,
          mockLogger,
        );

        await notifier.maybeNotify();

        expect(globalState.update).not.toHaveBeenCalled();
        expect(mockOpenExternal).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ReleaseNotifier.maybeNotify', version: '1.1.0' },
          'Release notification dismissed — will reappear on next activation',
        );
      });

      it('stores version without opening browser when user clicks Skip for this version', async () => {
        const globalState = createMockGlobalState('1.0.0');
        const mockShowInformationMessage = jest.fn().mockResolvedValue('Skip for this version');
        const mockOpenExternal = jest.fn();
        const adapter = createMockVscodeAdapter({
          windowOptions: { showInformationMessage: mockShowInformationMessage },
          envOptions: { openExternal: mockOpenExternal },
        });
        const notifier = new ReleaseNotifier(
          globalState as any,
          VERSION_INFO_110,
          adapter,
          mockLogger,
        );

        await notifier.maybeNotify();

        expect(globalState.update).toHaveBeenCalledWith('rangelink.lastNotifiedVersion', '1.1.0');
        expect(mockOpenExternal).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ReleaseNotifier.maybeNotify', version: '1.1.0' },
          'Release notification skipped for this version',
        );
      });

      it("stores version and opens release notes URL when user clicks What's New", async () => {
        const globalState = createMockGlobalState('1.0.0');
        const mockShowInformationMessage = jest.fn().mockResolvedValue("What's New");
        const adapter = createMockVscodeAdapter({
          windowOptions: { showInformationMessage: mockShowInformationMessage },
        });
        const openExternalSpy = jest.spyOn(adapter, 'openExternal').mockResolvedValue(true);
        const notifier = new ReleaseNotifier(
          globalState as any,
          VERSION_INFO_110,
          adapter,
          mockLogger,
        );

        await notifier.maybeNotify();

        expect(globalState.update).toHaveBeenCalledWith('rangelink.lastNotifiedVersion', '1.1.0');
        expect(openExternalSpy).toHaveBeenCalledWith(
          'https://github.com/couimet/rangeLink/releases/tag/vscode-extension-v1.1.0',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          { fn: 'ReleaseNotifier.maybeNotify', version: '1.1.0' },
          'Opened release notes in browser',
        );
      });
    });
  });

  describe('getLastNotifiedVersion()', () => {
    it('returns the stored version from globalState', () => {
      const globalState = createMockGlobalState('1.0.0');
      const adapter = createMockVscodeAdapter();
      const notifier = new ReleaseNotifier(
        globalState as any,
        VERSION_INFO_100,
        adapter,
        mockLogger,
      );

      expect(notifier.getLastNotifiedVersion()).toBe('1.0.0');
      expect(globalState.get).toHaveBeenCalledWith('rangelink.lastNotifiedVersion');
    });

    it('returns undefined when no version is stored', () => {
      const globalState = createMockGlobalState(undefined);
      const adapter = createMockVscodeAdapter();
      const notifier = new ReleaseNotifier(
        globalState as any,
        VERSION_INFO_100,
        adapter,
        mockLogger,
      );

      expect(notifier.getLastNotifiedVersion()).toBeUndefined();
    });
  });
});
