import { getLogger, setLogger } from 'barebone-logger';
import * as vscode from 'vscode';

import { createWiringServices } from './createWiringServices';
import { setLocale } from './i18n/LocaleManager';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { LogCapture } from './LogCapture';
import { createSubscriptionRegistrar } from './SubscriptionRegistrar';
import type { RangeLinkExtensionApi, VersionInfo } from './types';
import { VSCodeLogger } from './VSCodeLogger';
import { wireSubscriptions } from './wireSubscriptions';

// ============================================================================
// Extension Lifecycle
// ============================================================================

let outputChannel: vscode.OutputChannel;

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext): RangeLinkExtensionApi {
  outputChannel = vscode.window.createOutputChannel('RangeLink');
  const logCapture = new LogCapture(outputChannel);
  const vscodeLogger = new VSCodeLogger(logCapture);
  setLogger(vscodeLogger);
  const logger = getLogger();

  let versionInfo: VersionInfo | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    versionInfo = require('./version.json') as VersionInfo;
    logger.info(
      {
        fn: 'activate',
        version: versionInfo.version,
        commit: versionInfo.commit,
        isDirty: versionInfo.isDirty,
        branch: versionInfo.branch,
        buildDate: versionInfo.buildDate,
      },
      `RangeLink extension activated - v${versionInfo.version} (${versionInfo.commit}${versionInfo.isDirty ? ' dirty' : ''})`,
    );
  } catch (error) {
    logger.warn(
      { fn: 'activate', error },
      'RangeLink extension activated (version info unavailable)',
    );
  }

  const ideAdapter = new VscodeAdapter(vscode, logger);
  setLocale(ideAdapter.language);

  const registrar = createSubscriptionRegistrar(context, ideAdapter);
  const services = createWiringServices({ ideAdapter, logger, versionInfo }, context);
  wireSubscriptions(registrar, services);

  return { logCapture };
}

/**
 * Extension deactivation cleanup
 */
export function deactivate(): void {
  // Cleanup if needed
}
