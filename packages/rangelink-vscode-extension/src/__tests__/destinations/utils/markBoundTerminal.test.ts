import { markBoundTerminal } from '../../../destinations/utils/markBoundTerminal';
import { createMockEligibleTerminal, createMockTerminal } from '../../helpers';

describe('markBoundTerminal', () => {
  it('marks matching terminal as bound and others as not-bound', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'bash', processId: 100 }),
      createMockEligibleTerminal({ name: 'zsh', processId: 200 }),
      createMockEligibleTerminal({ name: 'fish', processId: 300 }),
    ];

    const result = markBoundTerminal(terminals, 200);

    expect(result.map((t) => ({ name: t.name, boundState: t.boundState }))).toStrictEqual([
      { name: 'bash', boundState: 'not-bound' },
      { name: 'zsh', boundState: 'bound' },
      { name: 'fish', boundState: 'not-bound' },
    ]);
  });

  it('marks all as not-bound when boundTerminalProcessId is undefined', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'bash', processId: 100 }),
      createMockEligibleTerminal({ name: 'zsh', processId: 200 }),
    ];

    const result = markBoundTerminal(terminals, undefined);

    expect(result.map((t) => ({ name: t.name, boundState: t.boundState }))).toStrictEqual([
      { name: 'bash', boundState: 'not-bound' },
      { name: 'zsh', boundState: 'not-bound' },
    ]);
  });

  it('marks all as not-bound when no processId matches', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'bash', processId: 100 }),
      createMockEligibleTerminal({ name: 'zsh', processId: 200 }),
    ];

    const result = markBoundTerminal(terminals, 999);

    expect(result.map((t) => ({ name: t.name, boundState: t.boundState }))).toStrictEqual([
      { name: 'bash', boundState: 'not-bound' },
      { name: 'zsh', boundState: 'not-bound' },
    ]);
  });

  it('marks terminal with undefined processId as not-bound even when boundTerminalProcessId is provided', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'bash' }),
      createMockEligibleTerminal({ name: 'zsh', processId: 200 }),
    ];

    const result = markBoundTerminal(terminals, 200);

    expect(result.map((t) => ({ name: t.name, boundState: t.boundState }))).toStrictEqual([
      { name: 'bash', boundState: 'not-bound' },
      { name: 'zsh', boundState: 'bound' },
    ]);
  });

  it('preserves all original EligibleTerminal properties', () => {
    const terminal = createMockTerminal({ name: 'bash' });
    const terminals = [
      createMockEligibleTerminal({ terminal, name: 'bash', isActive: true, processId: 42 }),
    ];

    const result = markBoundTerminal(terminals, 42);

    expect(result[0]).toStrictEqual({
      terminal,
      name: 'bash',
      isActive: true,
      processId: 42,
      boundState: 'bound',
    });
  });

  it('does not mutate the input array', () => {
    const terminals = [createMockEligibleTerminal({ name: 'bash', processId: 100 })];

    markBoundTerminal(terminals, 100);

    expect(terminals[0].boundState).toBeUndefined();
  });

  it('returns empty array for empty input', () => {
    expect(markBoundTerminal([], 100)).toStrictEqual([]);
  });
});
