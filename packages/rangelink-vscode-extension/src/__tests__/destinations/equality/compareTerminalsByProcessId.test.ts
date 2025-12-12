import { compareTerminalsByProcessId } from '../../../destinations/equality/compareTerminalsByProcessId';
import {
  createMockSingletonComposablePasteDestination,
  createMockTerminal,
  createMockTerminalComposablePasteDestination,
} from '../../helpers';

describe('compareTerminalsByProcessId', () => {
  describe('when terminals have matching process IDs', () => {
    it('should return true', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      const otherDestination = createMockTerminalComposablePasteDestination({
        terminal: createMockTerminal({ processId: Promise.resolve(12345) }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(true);
    });
  });

  describe('when terminals have different process IDs', () => {
    it('should return false', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      const otherDestination = createMockTerminalComposablePasteDestination({
        terminal: createMockTerminal({ processId: Promise.resolve(67890) }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when other destination is not a terminal', () => {
    it('should return false for singleton resource', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      const otherDestination = createMockSingletonComposablePasteDestination();

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when this terminal process ID is undefined', () => {
    it('should return false', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(undefined) });
      const otherDestination = createMockTerminalComposablePasteDestination({
        terminal: createMockTerminal({ processId: Promise.resolve(12345) }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when other terminal process ID is undefined', () => {
    it('should return false', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      const otherDestination = createMockTerminalComposablePasteDestination({
        terminal: createMockTerminal({ processId: Promise.resolve(undefined) }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when both terminal process IDs are undefined', () => {
    it('should return false', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(undefined) });
      const otherDestination = createMockTerminalComposablePasteDestination({
        terminal: createMockTerminal({ processId: Promise.resolve(undefined) }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('Promise.all handling', () => {
    it('should resolve both process IDs in parallel', async () => {
      const thisPidPromise = Promise.resolve(12345);
      const otherPidPromise = Promise.resolve(12345);

      const thisTerminal = createMockTerminal({ processId: thisPidPromise });
      const otherDestination = createMockTerminalComposablePasteDestination({
        terminal: createMockTerminal({ processId: otherPidPromise }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(true);
    });
  });
});
