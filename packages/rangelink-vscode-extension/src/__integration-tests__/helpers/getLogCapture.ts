import * as vscode from 'vscode';

import type { LogCapture } from '../../LogCapture';
import type { RangeLinkExtensionApi } from '../../types/RangeLinkExtensionApi';

const EXTENSION_ID = 'couimet.rangelink-vscode-extension';

/**
 * Retrieve the LogCapture instance from the RangeLink extension's exports.
 * Requires RANGELINK_CAPTURE_LOGS=true to be set before the extension activates.
 */
export const getLogCapture = (): LogCapture => {
  const ext = vscode.extensions.getExtension<RangeLinkExtensionApi>(EXTENSION_ID);
  if (!ext) {
    throw new Error(`Extension ${EXTENSION_ID} not found`);
  }
  if (!ext.isActive) {
    throw new Error(`Extension ${EXTENSION_ID} is not active — call ext.activate() first`);
  }
  const logCapture = ext.exports?.logCapture;
  if (!logCapture) {
    throw new Error(`Extension ${EXTENSION_ID} is active but did not export logCapture`);
  }
  return logCapture;
};
