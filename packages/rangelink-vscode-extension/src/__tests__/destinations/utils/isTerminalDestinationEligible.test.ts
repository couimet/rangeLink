import { isTerminalDestinationEligible } from '../../../destinations/utils';
import { createMockTerminal, createMockVscodeAdapter } from '../../helpers';

describe('isTerminalDestinationEligible', () => {
  describe('live terminals', () => {
    it('returns true when one live terminal exists', () => {
      const terminal = createMockTerminal({ name: 'zsh', exitStatus: undefined });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal],
          activeTerminal: terminal,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toBe(true);
    });

    it('returns true when multiple live terminals exist', () => {
      const terminal1 = createMockTerminal({ name: 'zsh', exitStatus: undefined });
      const terminal2 = createMockTerminal({ name: 'bash', exitStatus: undefined });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2],
          activeTerminal: terminal1,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toBe(true);
    });

    it('returns true when at least one terminal is live among dead terminals', () => {
      const deadTerminal = createMockTerminal({
        name: 'dead',
        exitStatus: { code: 0, reason: 1 },
      });
      const liveTerminal = createMockTerminal({ name: 'live', exitStatus: undefined });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [deadTerminal, liveTerminal],
          activeTerminal: liveTerminal,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toBe(true);
    });
  });

  describe('no eligible terminals', () => {
    it('returns false when no terminals exist', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [],
          activeTerminal: undefined,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toBe(false);
    });

    it('returns false when all terminals have terminated processes', () => {
      const deadTerminal1 = createMockTerminal({
        name: 'dead1',
        exitStatus: { code: 0, reason: 1 },
      });
      const deadTerminal2 = createMockTerminal({
        name: 'dead2',
        exitStatus: { code: 1, reason: 1 },
      });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [deadTerminal1, deadTerminal2],
          activeTerminal: undefined,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toBe(false);
    });
  });
});
