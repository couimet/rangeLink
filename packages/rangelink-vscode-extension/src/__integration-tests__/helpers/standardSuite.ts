import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_UNBIND_DESTINATION } from '../../constants/commandIds';

import { closeAllEditors } from './fileHelpers';
import { getLogCapture } from './getLogCapture';
import { createLogger } from './logHelpers';
import { resetRangelinkSettings } from './settingsHelpers';
import { SsContextImpl, type SsContext } from './ssContext';
import { disposeAllTerminals } from './terminalHelpers';
import { activateExtension, settle } from './testEnv';

export const standardSuite = (name: string, fn: (ss: SsContext) => void): void => {
  suite(name, () => {
    const log = createLogger(name);
    const ss = new SsContextImpl(log);

    suiteSetup(async () => {
      await activateExtension();
    });

    setup(async () => {
      assert.ok(
        getLogCapture().isCapturing,
        'RANGELINK_CAPTURE_LOGS must be true for toast assertions',
      );
      await resetRangelinkSettings(log);
      await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
      await closeAllEditors();
      disposeAllTerminals();
      await settle();
    });

    suiteTeardown(async () => {
      await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
      await settle();
      await closeAllEditors();
    });

    fn(ss);
  });
};
