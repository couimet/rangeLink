import { getEligibleTerminals } from '../../../destinations/utils';
import { createMockTerminal, createMockVscodeAdapter } from '../../helpers';

describe('getEligibleTerminals', () => {
  describe('live terminals', () => {
    it('returns single terminal with active status when one live terminal exists', () => {
      const terminal = createMockTerminal({ name: 'zsh', exitStatus: undefined });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal],
          activeTerminal: terminal,
        },
      });

      expect(getEligibleTerminals(ideAdapter)).toStrictEqual([
        {
          terminal,
          name: 'zsh',
          isActive: true,
        },
      ]);
    });

    it('returns all live terminals with active terminal first', () => {
      const terminal1 = createMockTerminal({ name: 'zsh', exitStatus: undefined });
      const terminal2 = createMockTerminal({
        name: 'Node.js Debug Console',
        exitStatus: undefined,
      });
      const terminal3 = createMockTerminal({ name: 'bash', exitStatus: undefined });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2, terminal3],
          activeTerminal: terminal2,
        },
      });

      expect(getEligibleTerminals(ideAdapter)).toStrictEqual([
        { terminal: terminal2, name: 'Node.js Debug Console', isActive: true },
        { terminal: terminal1, name: 'zsh', isActive: false },
        { terminal: terminal3, name: 'bash', isActive: false },
      ]);
    });

    it('marks no terminal as active when activeTerminal is undefined', () => {
      const terminal1 = createMockTerminal({ name: 'zsh', exitStatus: undefined });
      const terminal2 = createMockTerminal({ name: 'bash', exitStatus: undefined });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2],
          activeTerminal: undefined,
        },
      });

      expect(getEligibleTerminals(ideAdapter)).toStrictEqual([
        { terminal: terminal1, name: 'zsh', isActive: false },
        { terminal: terminal2, name: 'bash', isActive: false },
      ]);
    });
  });

  describe('filtering terminated terminals', () => {
    it('excludes terminals with terminated processes', () => {
      const liveTerminal = createMockTerminal({ name: 'live', exitStatus: undefined });
      const deadTerminal = createMockTerminal({
        name: 'dead',
        exitStatus: { code: 0, reason: 1 },
      });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [liveTerminal, deadTerminal],
          activeTerminal: liveTerminal,
        },
      });

      expect(getEligibleTerminals(ideAdapter)).toStrictEqual([
        { terminal: liveTerminal, name: 'live', isActive: true },
      ]);
    });

    it('excludes all terminals when all have terminated', () => {
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

      expect(getEligibleTerminals(ideAdapter)).toStrictEqual([]);
    });

    it('marks active correctly when active terminal is dead but live terminals exist', () => {
      const deadActiveTerminal = createMockTerminal({
        name: 'dead-active',
        exitStatus: { code: 0, reason: 1 },
      });
      const liveTerminal = createMockTerminal({ name: 'live', exitStatus: undefined });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [deadActiveTerminal, liveTerminal],
          activeTerminal: deadActiveTerminal,
        },
      });

      expect(getEligibleTerminals(ideAdapter)).toStrictEqual([
        { terminal: liveTerminal, name: 'live', isActive: false },
      ]);
    });
  });

  describe('empty terminals', () => {
    it('returns empty array when no terminals exist', () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [],
          activeTerminal: undefined,
        },
      });

      expect(getEligibleTerminals(ideAdapter)).toStrictEqual([]);
    });
  });

  describe('ordering', () => {
    it('places active terminal first even when last in VS Code order', () => {
      const terminal1 = createMockTerminal({ name: 'first', exitStatus: undefined });
      const terminal2 = createMockTerminal({ name: 'second', exitStatus: undefined });
      const terminal3 = createMockTerminal({ name: 'third', exitStatus: undefined });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2, terminal3],
          activeTerminal: terminal3,
        },
      });

      expect(getEligibleTerminals(ideAdapter)).toStrictEqual([
        { terminal: terminal3, name: 'third', isActive: true },
        { terminal: terminal1, name: 'first', isActive: false },
        { terminal: terminal2, name: 'second', isActive: false },
      ]);
    });

    it('preserves VS Code order for inactive terminals', () => {
      const terminalA = createMockTerminal({ name: 'A', exitStatus: undefined });
      const terminalB = createMockTerminal({ name: 'B', exitStatus: undefined });
      const terminalC = createMockTerminal({ name: 'C', exitStatus: undefined });
      const terminalD = createMockTerminal({ name: 'D', exitStatus: undefined });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminalA, terminalB, terminalC, terminalD],
          activeTerminal: terminalC,
        },
      });

      const result = getEligibleTerminals(ideAdapter);

      expect(result[0]).toStrictEqual({ terminal: terminalC, name: 'C', isActive: true });
      expect(result.slice(1).map((t) => t.name)).toStrictEqual(['A', 'B', 'D']);
    });
  });
});
