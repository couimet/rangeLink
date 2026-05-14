import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_UNBIND_DESTINATION } from '../../constants/commandIds';

import { closeAllEditors } from './fileHelpers';
import { getLogCapture } from './getLogCapture';
import { createLogger } from './logHelpers';
import { resetRangelinkSettings } from './settingsHelpers';
import { disposeAllTerminals } from './terminalHelpers';
import { activateExtension, settle } from './testEnv';

export const standardSuite = (name: string, fn: (log: (msg: string) => void) => void): void => {
  suite(name, () => {
    const log = createLogger(name);

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

    fn(log);
  });
};
