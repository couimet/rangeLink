import { isTerminalDestinationEligible } from '../../../destinations/utils';
import { createMockTerminal, createMockVscodeAdapter } from '../../helpers';

describe('isTerminalDestinationEligible', () => {
  describe('eligible scenarios', () => {
    it('returns eligible with single terminal when one terminal exists', () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal],
          activeTerminal: terminal,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        terminals: [
          {
            terminal,
            name: 'zsh',
            isActive: true,
          },
        ],
      });
    });

    it('returns all terminals with active status when multiple terminals exist', () => {
      const terminal1 = createMockTerminal({ name: 'zsh' });
      const terminal2 = createMockTerminal({ name: 'Node.js Debug Console' });
      const terminal3 = createMockTerminal({ name: 'bash' });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2, terminal3],
          activeTerminal: terminal2,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        terminals: [
          { terminal: terminal1, name: 'zsh', isActive: false },
          { terminal: terminal2, name: 'Node.js Debug Console', isActive: true },
          { terminal: terminal3, name: 'bash', isActive: false },
        ],
      });
    });

    it('marks no terminal as active when activeTerminal is undefined', () => {
      const terminal1 = createMockTerminal({ name: 'zsh' });
      const terminal2 = createMockTerminal({ name: 'bash' });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2],
          activeTerminal: undefined,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        terminals: [
          { terminal: terminal1, name: 'zsh', isActive: false },
          { terminal: terminal2, name: 'bash', isActive: false },
        ],
      });
    });
  });

  describe('ineligible scenarios', () => {
    it('returns ineligible with empty terminals array when no terminals exist', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [],
          activeTerminal: undefined,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        terminals: [],
      });
    });
  });
});
