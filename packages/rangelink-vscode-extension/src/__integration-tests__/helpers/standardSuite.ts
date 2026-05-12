import { printAssistedBanner } from './assistedTestHelper';
import { closeAllEditors } from './fileHelpers';
import { createLogger } from './logHelpers';
import { resetRangelinkSettings } from './settingsHelpers';
import { activateExtension, settle } from './testEnv';

export interface StandardSuiteOptions {
  assisted?: boolean;
}

export const standardSuite = (
  name: string,
  options: StandardSuiteOptions,
  fn: (log: (msg: string) => void) => void,
): void => {
  suite(name, () => {
    const log = createLogger(name);

    suiteSetup(async () => {
      await activateExtension();
      const assisted = options.assisted ?? false;
      log(
        `[DEBUG] standardSuite.assisted=${assisted} (${options.assisted === undefined ? 'default' : 'provided'})`,
      );
      if (assisted) {
        printAssistedBanner();
      }
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
