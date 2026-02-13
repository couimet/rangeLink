import { getEligibleTerminals } from '../../../destinations/utils';
import { createMockTerminal, createMockVscodeAdapter } from '../../helpers';

describe('getEligibleTerminals', () => {
  describe('live terminals', () => {
    it('returns single terminal with active status and processId', async () => {
      const terminal = createMockTerminal({
        name: 'zsh',
        exitStatus: undefined,
        processId: Promise.resolve(42),
      });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal],
          activeTerminal: terminal,
        },
      });

      expect(await getEligibleTerminals(ideAdapter)).toStrictEqual([
        {
          terminal,
          name: 'zsh',
          isActive: true,
          processId: 42,
        },
      ]);
    });

    it('returns all live terminals in VS Code natural order (no sorting)', async () => {
      const terminal1 = createMockTerminal({
        name: 'zsh',
        exitStatus: undefined,
        processId: Promise.resolve(10),
      });
      const terminal2 = createMockTerminal({
        name: 'Node.js Debug Console',
        exitStatus: undefined,
        processId: Promise.resolve(20),
      });
      const terminal3 = createMockTerminal({
        name: 'bash',
        exitStatus: undefined,
        processId: Promise.resolve(30),
      });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2, terminal3],
          activeTerminal: terminal2,
        },
      });

      expect(await getEligibleTerminals(ideAdapter)).toStrictEqual([
        { terminal: terminal1, name: 'zsh', isActive: false, processId: 10 },
        { terminal: terminal2, name: 'Node.js Debug Console', isActive: true, processId: 20 },
        { terminal: terminal3, name: 'bash', isActive: false, processId: 30 },
      ]);
    });

    it('marks no terminal as active when activeTerminal is undefined', async () => {
      const terminal1 = createMockTerminal({
        name: 'zsh',
        exitStatus: undefined,
        processId: Promise.resolve(10),
      });
      const terminal2 = createMockTerminal({
        name: 'bash',
        exitStatus: undefined,
        processId: Promise.resolve(20),
      });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2],
          activeTerminal: undefined,
        },
      });

      expect(await getEligibleTerminals(ideAdapter)).toStrictEqual([
        { terminal: terminal1, name: 'zsh', isActive: false, processId: 10 },
        { terminal: terminal2, name: 'bash', isActive: false, processId: 20 },
      ]);
    });
  });

  describe('processId resolution', () => {
    it('resolves processId as undefined when terminal.processId resolves to undefined', async () => {
      const terminal = createMockTerminal({
        name: 'zsh',
        exitStatus: undefined,
        processId: Promise.resolve(undefined),
      });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal],
          activeTerminal: terminal,
        },
      });

      const result = await getEligibleTerminals(ideAdapter);

      expect(result[0].processId).toBeUndefined();
    });
  });

  describe('filtering terminated terminals', () => {
    it('excludes terminals with terminated processes', async () => {
      const liveTerminal = createMockTerminal({
        name: 'live',
        exitStatus: undefined,
        processId: Promise.resolve(100),
      });
      const deadTerminal = createMockTerminal({
        name: 'dead',
        exitStatus: { code: 0, reason: 1 },
        processId: Promise.resolve(200),
      });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [liveTerminal, deadTerminal],
          activeTerminal: liveTerminal,
        },
      });

      expect(await getEligibleTerminals(ideAdapter)).toStrictEqual([
        { terminal: liveTerminal, name: 'live', isActive: true, processId: 100 },
      ]);
    });

    it('excludes all terminals when all have terminated', async () => {
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

      expect(await getEligibleTerminals(ideAdapter)).toStrictEqual([]);
    });

    it('marks active correctly when active terminal is dead but live terminals exist', async () => {
      const deadActiveTerminal = createMockTerminal({
        name: 'dead-active',
        exitStatus: { code: 0, reason: 1 },
      });
      const liveTerminal = createMockTerminal({
        name: 'live',
        exitStatus: undefined,
        processId: Promise.resolve(100),
      });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [deadActiveTerminal, liveTerminal],
          activeTerminal: deadActiveTerminal,
        },
      });

      expect(await getEligibleTerminals(ideAdapter)).toStrictEqual([
        { terminal: liveTerminal, name: 'live', isActive: false, processId: 100 },
      ]);
    });
  });

  describe('empty terminals', () => {
    it('returns empty array when no terminals exist', async () => {
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [],
          activeTerminal: undefined,
        },
      });

      expect(await getEligibleTerminals(ideAdapter)).toStrictEqual([]);
    });
  });

  describe('ordering', () => {
    it('preserves VS Code natural order without sorting', async () => {
      const terminal1 = createMockTerminal({
        name: 'first',
        exitStatus: undefined,
        processId: Promise.resolve(1),
      });
      const terminal2 = createMockTerminal({
        name: 'second',
        exitStatus: undefined,
        processId: Promise.resolve(2),
      });
      const terminal3 = createMockTerminal({
        name: 'third',
        exitStatus: undefined,
        processId: Promise.resolve(3),
      });
      const ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2, terminal3],
          activeTerminal: terminal3,
        },
      });

      const result = await getEligibleTerminals(ideAdapter);

      expect(result.map((t) => t.name)).toStrictEqual(['first', 'second', 'third']);
    });
  });
});
