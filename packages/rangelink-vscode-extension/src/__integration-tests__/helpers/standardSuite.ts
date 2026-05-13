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
      await settle();
    });

    suiteTeardown(async () => {
      await closeAllEditors();
    });

    fn(log);
  });
};
