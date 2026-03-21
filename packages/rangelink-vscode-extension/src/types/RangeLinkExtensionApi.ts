import type { LogCapture } from '../LogCapture';

/**
 * Extension API surface returned from activate().
 * Integration tests access logCapture via ext.exports to assert log content.
 */
export interface RangeLinkExtensionApi {
  readonly logCapture: LogCapture;
}
