import type { Logger } from '@couimet/logger-contract';
import type * as vscode from 'vscode';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode, type VersionInfo } from '../types';
import { formatMessage } from '../utils';

const STORAGE_KEY = 'rangelink.lastNotifiedVersion';
const RELEASES_BASE_URL = 'https://github.com/couimet/rangeLink/releases/tag/vscode-extension-v';

/**
 * Shows a once-per-upgrade notification so users don't miss new versions.
 *
 * Behavior:
 * - First install (no stored version): stores current version silently — no popup.
 * - Same version stored: skips silently.
 * - Version upgrade detected: shows notification with "What's New" and "Skip for this version" buttons.
 *   Dismissing (X) is temporary — popup reappears on next activation.
 *   "What's New" opens GitHub releases and silences the notification for this version.
 *   "Skip for this version" silences the notification without opening the browser.
 */
export class ReleaseNotifier {
  constructor(
    private readonly globalState: vscode.Memento,
    private readonly versionInfo: VersionInfo | undefined,
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {
    this.logger.debug({ fn: 'ReleaseNotifier.constructor' }, 'ReleaseNotifier initialized');
  }

  async maybeNotify(): Promise<void> {
    const logCtx = { fn: 'ReleaseNotifier.maybeNotify' };

    if (!this.versionInfo) {
      this.logger.warn(logCtx, 'Version info unavailable — skipping release notification');
      return;
    }

    const currentVersion = this.versionInfo.version;
    const storedVersion = this.getLastNotifiedVersion();

    if (storedVersion === undefined) {
      await this.setLastNotifiedVersion(currentVersion);
      this.logger.debug(
        { ...logCtx, version: currentVersion },
        'First install — stored version, skipping notification',
      );
      return;
    }

    if (storedVersion === currentVersion) {
      this.logger.debug(
        { ...logCtx, version: currentVersion },
        'Same version — skipping release notification',
      );
      return;
    }

    this.logger.info(
      { ...logCtx, previousVersion: storedVersion, currentVersion },
      'Version upgrade detected — showing release notification',
    );

    const whatsNewButton = formatMessage(MessageCode.INFO_NEW_VERSION_WHATS_NEW_BUTTON);
    const skipButton = formatMessage(MessageCode.INFO_NEW_VERSION_SKIP_BUTTON);
    const selection = await this.ideAdapter.showInformationMessage(
      formatMessage(MessageCode.INFO_NEW_VERSION_NOTIFICATION, { version: currentVersion }),
      whatsNewButton,
      skipButton,
    );

    if (selection === whatsNewButton) {
      await this.setLastNotifiedVersion(currentVersion);
      await this.ideAdapter.openExternal(`${RELEASES_BASE_URL}${currentVersion}`);
      this.logger.debug({ ...logCtx, version: currentVersion }, 'Opened release notes in browser');
    } else if (selection === skipButton) {
      await this.setLastNotifiedVersion(currentVersion);
      this.logger.debug(
        { ...logCtx, version: currentVersion },
        'Release notification skipped for this version',
      );
    } else {
      this.logger.debug(
        { ...logCtx, version: currentVersion },
        'Release notification dismissed — will reappear on next activation',
      );
    }
  }

  getLastNotifiedVersion(): string | undefined {
    return this.globalState.get<string>(STORAGE_KEY);
  }

  async setLastNotifiedVersion(version: string | undefined): Promise<void> {
    await this.globalState.update(STORAGE_KEY, version);
  }
}
