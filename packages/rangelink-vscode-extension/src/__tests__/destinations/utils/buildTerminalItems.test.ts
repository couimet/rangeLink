import { buildTerminalItems } from '../../../destinations/utils/buildTerminalItems';
import { createMockTerminal } from '../../helpers';

describe('buildTerminalItems', () => {
  describe('when terminals count <= maxInline', () => {
    it('returns all terminals for single terminal', () => {
      const terminal = createMockTerminal({ name: 'zsh' });
      const terminals = [{ terminal, name: 'zsh', isActive: true }];

      const result = buildTerminalItems(terminals, 5);

      expect(result).toStrictEqual([
        { kind: 'terminal', terminal, displayName: 'zsh', isActive: true },
      ]);
    });

    it('returns all terminals when exactly at maxInline', () => {
      const terminal1 = createMockTerminal({ name: 't1' });
      const terminal2 = createMockTerminal({ name: 't2' });
      const terminal3 = createMockTerminal({ name: 't3' });
      const terminals = [
        { terminal: terminal1, name: 't1', isActive: false },
        { terminal: terminal2, name: 't2', isActive: true },
        { terminal: terminal3, name: 't3', isActive: false },
      ];

      const result = buildTerminalItems(terminals, 3);

      expect(result).toStrictEqual([
        { kind: 'terminal', terminal: terminal1, displayName: 't1', isActive: false },
        { kind: 'terminal', terminal: terminal2, displayName: 't2', isActive: true },
        { kind: 'terminal', terminal: terminal3, displayName: 't3', isActive: false },
      ]);
    });
  });

  describe('when terminals count > maxInline', () => {
    it('returns (maxInline - 1) terminals plus "More..." item', () => {
      const terminal1 = createMockTerminal({ name: 't1' });
      const terminal2 = createMockTerminal({ name: 't2' });
      const terminal3 = createMockTerminal({ name: 't3' });
      const terminal4 = createMockTerminal({ name: 't4' });
      const terminals = [
        { terminal: terminal1, name: 't1', isActive: true },
        { terminal: terminal2, name: 't2', isActive: false },
        { terminal: terminal3, name: 't3', isActive: false },
        { terminal: terminal4, name: 't4', isActive: false },
      ];

      const result = buildTerminalItems(terminals, 3);

      expect(result).toStrictEqual([
        { kind: 'terminal', terminal: terminal1, displayName: 't1', isActive: true },
        { kind: 'terminal', terminal: terminal2, displayName: 't2', isActive: false },
        { kind: 'terminal-more', displayName: 'More terminals...', remainingCount: 2 },
      ]);
    });

    it('calculates correct remainingCount', () => {
      const terminals = Array.from({ length: 10 }, (_, i) => ({
        terminal: createMockTerminal({ name: `t${i}` }),
        name: `t${i}`,
        isActive: i === 0,
      }));

      const result = buildTerminalItems(terminals, 5);

      const moreItem = result.find((item) => item.kind === 'terminal-more');
      expect(moreItem).toStrictEqual({
        kind: 'terminal-more',
        displayName: 'More terminals...',
        remainingCount: 6,
      });
    });
  });

  describe('edge cases', () => {
    it('handles maxInline of 1 (only shows "More...")', () => {
      const terminal1 = createMockTerminal({ name: 't1' });
      const terminal2 = createMockTerminal({ name: 't2' });
      const terminals = [
        { terminal: terminal1, name: 't1', isActive: true },
        { terminal: terminal2, name: 't2', isActive: false },
      ];

      const result = buildTerminalItems(terminals, 1);

      expect(result).toStrictEqual([
        { kind: 'terminal-more', displayName: 'More terminals...', remainingCount: 2 },
      ]);
    });

    it('handles maxInline of 2 with 3 terminals (shows 1 terminal + "More...")', () => {
      const terminal1 = createMockTerminal({ name: 't1' });
      const terminal2 = createMockTerminal({ name: 't2' });
      const terminal3 = createMockTerminal({ name: 't3' });
      const terminals = [
        { terminal: terminal1, name: 't1', isActive: false },
        { terminal: terminal2, name: 't2', isActive: true },
        { terminal: terminal3, name: 't3', isActive: false },
      ];

      const result = buildTerminalItems(terminals, 2);

      expect(result).toStrictEqual([
        { kind: 'terminal', terminal: terminal1, displayName: 't1', isActive: false },
        { kind: 'terminal-more', displayName: 'More terminals...', remainingCount: 2 },
      ]);
    });
  });
});
