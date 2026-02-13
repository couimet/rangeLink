import { Terminal } from 'vscode';
import { isTerminalEligible } from '../../../destinations/utils';
import { createMockTerminal } from '../../helpers';

describe('isTerminalEligible', () => {
  describe('process status', () => {
    it('returns true for terminal with live process', () => {
      const terminal = createMockTerminal({ name: 'zsh', exitStatus: undefined });

      expect(isTerminalEligible(terminal)).toBe(true);
    });

    it('returns false for terminal with terminated process', () => {
      const terminal = createMockTerminal({
        name: 'dead',
        exitStatus: { code: 0, reason: 1 },
      });

      expect(isTerminalEligible(terminal)).toBe(false);
    });

    it('returns false for terminal with non-zero exit code', () => {
      const terminal = createMockTerminal({
        name: 'crashed',
        exitStatus: { code: 1, reason: 1 },
      });

      expect(isTerminalEligible(terminal)).toBe(false);
    });
  });

  describe('hidden terminals', () => {
    it('returns false for terminal with hideFromUser true', () => {
      const terminal = createMockTerminal({
        name: 'Cursor',
        exitStatus: undefined,
        creationOptions: { hideFromUser: true },
      });

      expect(isTerminalEligible(terminal)).toBe(false);
    });

    it('returns true for terminal with hideFromUser false', () => {
      const terminal = createMockTerminal({
        name: 'zsh',
        exitStatus: undefined,
        creationOptions: { hideFromUser: false },
      });

      expect(isTerminalEligible(terminal)).toBe(true);
    });

    it('returns true for terminal with hideFromUser undefined', () => {
      const terminal = createMockTerminal({
        name: 'zsh',
        exitStatus: undefined,
        creationOptions: { hideFromUser: undefined },
      });

      expect(isTerminalEligible(terminal)).toBe(true);
    });

    it('returns true for terminal with empty creationOptions', () => {
      const terminal = createMockTerminal({
        name: 'bash',
        exitStatus: undefined,
        creationOptions: {},
      });

      expect(isTerminalEligible(terminal)).toBe(true);
    });
  });

  it('returns false for null terminal', () => {
    expect(isTerminalEligible(null as unknown as Terminal)).toBe(false);
  });

  it('returns false for undefined terminal', () => {
    expect(isTerminalEligible(undefined as unknown as Terminal)).toBe(false);
  });
});
