import { isTerminalDestinationEligible } from '../../../destinations/utils';
import { createMockVscodeAdapter } from '../../helpers';

describe('isTerminalDestinationEligible', () => {
  const createMockTerminal = () => ({ name: 'Mock Terminal' }) as any;

  it('returns true when activeTerminal exists', () => {
    const ideAdapter = createMockVscodeAdapter({
      windowOptions: {
        activeTerminal: createMockTerminal(),
      },
    });

    expect(isTerminalDestinationEligible(ideAdapter)).toBe(true);
  });

  it('returns false when activeTerminal is undefined', () => {
    const ideAdapter = createMockVscodeAdapter({
      windowOptions: {
        activeTerminal: undefined,
      },
    });

    expect(isTerminalDestinationEligible(ideAdapter)).toBe(false);
  });
});
