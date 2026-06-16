import { getLogger, setLogger } from '@couimet/logger-contract';
import * as vscode from 'vscode';

import { createWiringServices } from './createWiringServices';
import { setLocale } from './i18n/LocaleManager';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { LogCapture } from './LogCapture';
import { ReleaseNotifier } from './notification';
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
  let loggerContractVersion: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    versionInfo = require('./version.json') as VersionInfo;
  } catch (error) {
    logger.warn(
      { fn: 'activate', error },
      'RangeLink extension activated (version info unavailable)',
    );
  }

  try {
    // eslint-disable-next-line no-undef
    const loggerContractEntry = require.resolve('@couimet/logger-contract');
    // Resolve package root from entry point (dist/index.js → package root), then
    // require by absolute path to bypass the package's "exports" field restriction
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    const loggerContractPkgDir = require('node:path').resolve(loggerContractEntry, '../..');
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    loggerContractVersion = require(`${loggerContractPkgDir}/package.json`).version as string;
  } catch (error) {
    logger.warn({ fn: 'activate', error }, 'Failed to resolve logger-contract version');
  }

  if (versionInfo) {
    logger.info(
      {
        fn: 'activate',
        version: versionInfo.version,
        commit: versionInfo.commit,
        isDirty: versionInfo.isDirty,
        branch: versionInfo.branch,
        buildDate: versionInfo.buildDate,
        loggerContractVersion,
      },
      `RangeLink extension activated - v${versionInfo.version} (${versionInfo.commit}${versionInfo.isDirty ? ' dirty' : ''})`,
    );
  }

  const ideAdapter = new VscodeAdapter(vscode, logger);
  setLocale(ideAdapter.language);

  const registrar = createSubscriptionRegistrar(context, ideAdapter);
  const services = createWiringServices({ ideAdapter, logger, versionInfo }, context);
  wireSubscriptions(registrar, services);

  const releaseNotifier = new ReleaseNotifier(context.globalState, versionInfo, ideAdapter, logger);
  void releaseNotifier.maybeNotify().catch((error: unknown) => {
    logger.warn({ fn: 'activate', error }, 'Release notification failed');
  });

  return {
    logCapture,
    releaseNotifier,
    getContextKeyValues: () => services.contextKeyService.getLastSetValues(),
  };
}

/**
 * Extension deactivation cleanup
 */
export function deactivate(): void {
  // Cleanup if needed
}
