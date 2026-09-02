import type { DirtyBufferSettingMigrator } from '../config';
import type { LogCapture } from '../LogCapture';
import type { ReleaseNotifier } from '../notification';

/**
 * Extension API surface returned from activate().
 * Integration tests access logCapture via ext.exports to assert log content.
 */
export interface RangeLinkExtensionApi {
  readonly logCapture: LogCapture;
  readonly releaseNotifier: ReleaseNotifier;
  readonly dirtyBufferSettingMigrator: DirtyBufferSettingMigrator;
  readonly getContextKeyValues: () => Record<string, unknown>;
}
