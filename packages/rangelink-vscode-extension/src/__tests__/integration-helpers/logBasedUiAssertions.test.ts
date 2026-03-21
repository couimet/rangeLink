import {
  assertNoStatusBarMsgLogged,
  assertNoToastLogged,
  assertStatusBarMsgLogged,
  assertToastLogged,
} from '../../__integration-tests__/helpers/logBasedUiAssertions';

describe('logBasedUiAssertions', () => {
  describe('assertToastLogged', () => {
    it('passes when matching info toast is found', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showInformationMessage","message":"Claude Code is not available","items":[]} Showing info message',
      ];

      assertToastLogged(lines, { type: 'info', message: 'Claude Code is not available' });
    });

    it('passes when JSON context contains nested objects', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showInformationMessage","message":"nested test","details":{"key":"val"}} Showing info message',
      ];

      assertToastLogged(lines, { type: 'info', message: 'nested test' });
    });

    it('passes when matching warning toast is found', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showWarningMessage","message":"RangeLink: Bound file is open in multiple editor groups."} Showing warning message',
      ];

      assertToastLogged(lines, {
        type: 'warning',
        message: 'RangeLink: Bound file is open in multiple editor groups.',
      });
    });

    it('passes when matching error toast is found', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showErrorMessage","message":"RangeLink: Failed"} Showing error message',
      ];

      assertToastLogged(lines, { type: 'error', message: 'RangeLink: Failed' });
    });

    it('throws when toast type matches but message differs', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showInformationMessage","message":"wrong message"} Showing info message',
      ];

      expect(() => assertToastLogged(lines, { type: 'info', message: 'expected message' })).toThrow(
        'Expected info toast with message "expected message"',
      );
    });

    it('throws when message matches but toast type differs', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showWarningMessage","message":"some message"} Showing warning message',
      ];

      expect(() => assertToastLogged(lines, { type: 'info', message: 'some message' })).toThrow(
        'Expected info toast',
      );
    });

    it('throws when no log lines provided', () => {
      expect(() => assertToastLogged([], { type: 'info', message: 'anything' })).toThrow(
        'not found in 0 log lines',
      );
    });

    it('finds match among multiple log lines', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showErrorMessage","message":"error one"} Showing error message',
        '[INFO] {"fn":"PasteDestinationManager.bind"} Binding terminal',
        '[DEBUG] {"fn":"VscodeAdapter.showInformationMessage","message":"success"} Showing info message',
      ];

      assertToastLogged(lines, { type: 'info', message: 'success' });
    });
  });

  describe('assertNoToastLogged', () => {
    it('passes when toast is not found', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showInformationMessage","message":"different"} Showing info message',
      ];

      assertNoToastLogged(lines, { type: 'info', message: 'expected' });
    });

    it('passes when no lines provided', () => {
      assertNoToastLogged([], { type: 'warning', message: 'anything' });
    });

    it('throws when matching toast is found', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showWarningMessage","message":"found it"} Showing warning message',
      ];

      expect(() => assertNoToastLogged(lines, { type: 'warning', message: 'found it' })).toThrow(
        'Expected warning toast with message "found it" to NOT be logged',
      );
    });
  });

  describe('assertStatusBarMsgLogged', () => {
    it('passes when matching status bar message is found', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.setStatusBarMessage","message":"Bound to Terminal","timeout":2000} Setting status bar message',
      ];

      assertStatusBarMsgLogged(lines, { message: 'Bound to Terminal' });
    });

    it('throws when message not found', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.setStatusBarMessage","message":"different"} Setting status bar message',
      ];

      expect(() => assertStatusBarMsgLogged(lines, { message: 'expected' })).toThrow(
        'Expected status bar message "expected"',
      );
    });

    it('does not match toast messages', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.showInformationMessage","message":"not a status bar"} Showing info message',
      ];

      expect(() => assertStatusBarMsgLogged(lines, { message: 'not a status bar' })).toThrow(
        'not found in 1 log lines',
      );
    });
  });

  describe('assertNoStatusBarMsgLogged', () => {
    it('passes when message not found', () => {
      assertNoStatusBarMsgLogged([], { message: 'anything' });
    });

    it('throws when matching message is found', () => {
      const lines = [
        '[DEBUG] {"fn":"VscodeAdapter.setStatusBarMessage","message":"found it"} Setting status bar message',
      ];

      expect(() => assertNoStatusBarMsgLogged(lines, { message: 'found it' })).toThrow(
        'Expected status bar message "found it" to NOT be logged',
      );
    });
  });
});
