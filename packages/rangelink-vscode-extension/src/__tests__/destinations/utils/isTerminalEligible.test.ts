import { isTerminalEligible } from '../../../destinations/utils';
import { createMockTerminal } from '../../helpers';

describe('isTerminalEligible', () => {
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
