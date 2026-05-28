import { assertSuppressionLogged } from '../../__integration-tests__/helpers/logBasedUiAssertions';

describe('logBasedUiAssertions', () => {
  describe('assertSuppressionLogged', () => {
    it('passes when suppression log with matching fn and suppressedMessage is found', () => {
      const lines = [
        '[DEBUG] {"fn":"RangeLinkNavigationHandler.navigateToLink","suppressedMessage":"Navigated to file.ts @ 5"} Navigated toast suppressed by setting',
      ];

      assertSuppressionLogged(lines, {
        fn: 'RangeLinkNavigationHandler.navigateToLink',
        suppressedMessage: 'Navigated to file.ts @ 5',
      });
    });

    it('throws when fn does not match', () => {
      const lines = [
        '[DEBUG] {"fn":"RangeLinkNavigationHandler.navigateToLink","suppressedMessage":"msg"} Suppressed',
      ];

      expect(() =>
        assertSuppressionLogged(lines, { fn: 'WrongHandler.method', suppressedMessage: 'msg' }),
      ).toThrow('but it was not found');
    });

    it('throws when suppressedMessage does not match', () => {
      const lines = [
        '[DEBUG] {"fn":"RangeLinkNavigationHandler.navigateToLink","suppressedMessage":"actual msg"} Suppressed',
      ];

      expect(() =>
        assertSuppressionLogged(lines, {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          suppressedMessage: 'wrong msg',
        }),
      ).toThrow('but it was not found');
    });

    it('throws with empty lines', () => {
      expect(() =>
        assertSuppressionLogged([], {
          fn: 'RangeLinkNavigationHandler.navigateToLink',
          suppressedMessage: 'msg',
        }),
      ).toThrow('but it was not found in 0 log lines');
    });
  });
});
