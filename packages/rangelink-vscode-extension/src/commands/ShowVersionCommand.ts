import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../ide/vscode/VscodeAdapter';
import { MessageCode, type VersionInfo } from '../types';
import { formatMessage } from '../utils';

/**
 * Command handler for displaying version information.
 *
 * Shows the current RangeLink version, commit hash, branch name, and build date.
 * Users can copy the full commit hash to clipboard via a button in the dialog.
 */
export class ShowVersionCommand {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
    private readonly versionInfo: VersionInfo | undefined,
  ) {
    this.logger.debug(
      { fn: 'ShowVersionCommand.constructor' },
      'ShowVersionCommand initialized',
    );
  }

  async execute(): Promise<void> {
    const logCtx = { fn: 'ShowVersionCommand.execute' };

    const versionInfo = this.versionInfo;

    if (!versionInfo) {
      this.logger.error(logCtx, 'Failed to load version info');
      await this.ideAdapter.showErrorMessage(
        formatMessage(MessageCode.ERROR_VERSION_INFO_NOT_AVAILABLE),
      );
      return;
    }

    const isDirtyIndicator = versionInfo.isDirty
      ? formatMessage(MessageCode.INFO_VERSION_DIRTY_INDICATOR)
      : '';
    const message = formatMessage(MessageCode.INFO_VERSION_INFO, {
      version: versionInfo.version,
      commit: versionInfo.commit,
      isDirtyIndicator,
      branch: versionInfo.branch,
      buildDate: versionInfo.buildDate,
    });

    const copyButtonLabel = formatMessage(MessageCode.INFO_VERSION_COPY_COMMIT_HASH_BUTTON);
    const selection = await this.ideAdapter.showInformationMessage(message, copyButtonLabel);

    if (selection === copyButtonLabel) {
      await this.ideAdapter.writeTextToClipboard(versionInfo.commitFull);
      await this.ideAdapter.showInformationMessage(
        formatMessage(MessageCode.INFO_COMMIT_HASH_COPIED),
      );
    }

    this.logger.info(
      {
        ...logCtx,
        version: versionInfo.version,
        commit: versionInfo.commit,
        buildDate: versionInfo.buildDate,
      },
      'Version info displayed',
    );
  }
}
