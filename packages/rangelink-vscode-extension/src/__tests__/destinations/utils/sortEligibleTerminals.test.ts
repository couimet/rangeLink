import { sortEligibleTerminals } from '../../../destinations/utils/sortEligibleTerminals';
import { createMockEligibleTerminal } from '../../helpers';

describe('sortEligibleTerminals', () => {
  it('places bound terminal first', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'A', boundState: 'not-bound' }),
      createMockEligibleTerminal({ name: 'B', boundState: 'bound' }),
      createMockEligibleTerminal({ name: 'C', boundState: 'not-bound' }),
    ];

    const result = sortEligibleTerminals(terminals);

    expect(result.map((t) => t.name)).toStrictEqual(['B', 'A', 'C']);
  });

  it('places active terminal before inactive when no bound terminal', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'A', boundState: 'not-bound' }),
      createMockEligibleTerminal({ name: 'B', boundState: 'not-bound', isActive: true }),
      createMockEligibleTerminal({ name: 'C', boundState: 'not-bound' }),
    ];

    const result = sortEligibleTerminals(terminals);

    expect(result.map((t) => t.name)).toStrictEqual(['B', 'A', 'C']);
  });

  it('places bound first, then active second', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'A', boundState: 'not-bound' }),
      createMockEligibleTerminal({ name: 'B', boundState: 'not-bound', isActive: true }),
      createMockEligibleTerminal({ name: 'C', boundState: 'bound' }),
    ];

    const result = sortEligibleTerminals(terminals);

    expect(result.map((t) => t.name)).toStrictEqual(['C', 'B', 'A']);
  });

  it('handles bound terminal that is also active', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'A', boundState: 'not-bound' }),
      createMockEligibleTerminal({ name: 'B', boundState: 'bound', isActive: true }),
      createMockEligibleTerminal({ name: 'C', boundState: 'not-bound' }),
    ];

    const result = sortEligibleTerminals(terminals);

    expect(result.map((t) => t.name)).toStrictEqual(['B', 'A', 'C']);
  });

  it('preserves natural order among terminals with equal priority', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'A', boundState: 'not-bound' }),
      createMockEligibleTerminal({ name: 'B', boundState: 'not-bound' }),
      createMockEligibleTerminal({ name: 'C', boundState: 'not-bound' }),
    ];

    const result = sortEligibleTerminals(terminals);

    expect(result.map((t) => t.name)).toStrictEqual(['A', 'B', 'C']);
  });

  it('treats absent boundState same as not-bound', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'A' }),
      createMockEligibleTerminal({ name: 'B', boundState: 'bound' }),
      createMockEligibleTerminal({ name: 'C' }),
    ];

    const result = sortEligibleTerminals(terminals);

    expect(result.map((t) => t.name)).toStrictEqual(['B', 'A', 'C']);
  });

  it('does not mutate the input array', () => {
    const terminals = [
      createMockEligibleTerminal({ name: 'A', boundState: 'not-bound' }),
      createMockEligibleTerminal({ name: 'B', boundState: 'bound' }),
    ];
    const original = [...terminals];

    sortEligibleTerminals(terminals);

    expect(terminals.map((t) => t.name)).toStrictEqual(original.map((t) => t.name));
  });

  it('returns empty array for empty input', () => {
    expect(sortEligibleTerminals([])).toStrictEqual([]);
  });

  it('returns single item unchanged', () => {
    const terminals = [createMockEligibleTerminal({ name: 'only' })];

    const result = sortEligibleTerminals(terminals);

    expect(result.map((t) => t.name)).toStrictEqual(['only']);
  });
});
