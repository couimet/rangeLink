import * as vscode from 'vscode';

import { CMD_UNBIND_DESTINATION } from '../../constants/commandIds';

import { closeAllEditors } from './fileHelpers';
import { createLogger } from './logHelpers';
import { resetRangelinkSettings } from './settingsHelpers';
import { activateExtension, settle } from './testEnv';

export const standardSuite = (name: string, fn: (log: (msg: string) => void) => void): void => {
  suite(name, () => {
    const log = createLogger(name);

    suiteSetup(async () => {
      await activateExtension();
    });

    setup(async () => {
      await resetRangelinkSettings(log);
      await vscode.commands.executeCommand(CMD_UNBIND_DESTINATION);
      await closeAllEditors();
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
