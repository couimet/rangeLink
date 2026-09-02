import { setLocale } from './i18n/LocaleManager';
import { VscodeAdapter } from './ide/vscode/VscodeAdapter';
import { ENV_RANGELINK_DEVELOPMENT } from './constants';
import { createWiringServices } from './createWiringServices';
import { LogCapture } from './LogCapture';
import { ReleaseNotifier } from './notification';
import { createSubscriptionRegistrar } from './SubscriptionRegistrar';
import type { RangeLinkExtensionApi, VersionInfo } from './types';
import { VSCodeLogger } from './VSCodeLogger';
import { wireSubscriptions } from './wireSubscriptions';

import { getLogger, setLogger } from '@couimet/logger-contract';
import * as vscode from 'vscode';

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    versionInfo = require('./version.json') as VersionInfo;
  } catch (error) {
    logger.warn({ fn: 'activate', error }, 'RangeLink extension activated (version info unavailable)');
  }

  try {
    const loggerContractEntry = require.resolve('@couimet/logger-contract');
    // Resolve package root from entry point (dist/index.js → package root), then
    // require by absolute path to bypass the package's "exports" field restriction
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loggerContractPkgDir = require('node:path').resolve(loggerContractEntry, '../..');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

  void services.dirtyBufferSettingMigrator.migrate().catch((error: unknown) => {
    logger.warn({ fn: 'activate', error }, 'warnOnDirtyBuffer setting migration failed');
  });

  if (process.env[ENV_RANGELINK_DEVELOPMENT] === 'true') {
    void loadDevelopmentTestRunner(context, logger);
  }

  return {
    logCapture,
    releaseNotifier,
    dirtyBufferSettingMigrator: services.dirtyBufferSettingMigrator,
    getContextKeyValues: () => services.contextKeyService.getLastSetValues(),
  };
}

/**
 * Loads the development-test runner under the env gate. Dynamic require keeps
 * the runner out of the esbuild bundle (`dist/extension.js`); it is compiled to
 * `out/__development-tests__` by `tsc` and excluded from the shipped VSIX by
 * `.vscodeignore`.
 */
const loadDevelopmentTestRunner = (context: vscode.ExtensionContext, logger: ReturnType<typeof getLogger>): Promise<void> => {
  return (async (): Promise<void> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { runDevelopmentTests } = require(require('node:path').join(context.extensionPath, 'out', '__development-tests__', 'runDevelopmentTests.js')) as {
        runDevelopmentTests: () => Promise<void>;
      };
      await runDevelopmentTests();
      logger.info({ fn: 'activate' }, 'Development test runner finished');
    } catch (error) {
      logger.warn({ fn: 'activate', error }, 'Development test runner failed — run `tsc -p tsconfig.json` so out/__development-tests__ exists');
    }
  })();
};

/**
 * Extension deactivation cleanup
 */
export function deactivate(): void {
  // Cleanup if needed
}
