import { isTerminalDestinationEligible } from '../../../destinations/utils';
import { createMockTerminal, createMockVscodeAdapter } from '../../helpers';

describe('isTerminalDestinationEligible', () => {
  describe('eligible scenarios', () => {
    it('returns eligible with terminalName when activeTerminal exists', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTerminal: createMockTerminal({ name: 'zsh' }),
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        terminalName: 'zsh',
      });
    });

    it('returns terminal name for different terminal types', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTerminal: createMockTerminal({ name: 'Node.js Debug Console' }),
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: true,
        terminalName: 'Node.js Debug Console',
      });
    });
  });

  describe('ineligible scenarios', () => {
    it('returns ineligible with undefined terminalName when activeTerminal is undefined', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          activeTerminal: undefined,
        },
      });

      expect(isTerminalDestinationEligible(ideAdapter)).toStrictEqual({
        eligible: false,
        terminalName: undefined,
      });
    });
  });
});
