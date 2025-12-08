import { compareTerminalsByProcessId } from '../../../destinations/equality/compareTerminalsByProcessId';
import { createMockTerminal } from '../../helpers/createMockTerminal';
import { createMockTerminalDestination } from '../../helpers/createMockTerminalDestination';

describe('compareTerminalsByProcessId', () => {
  describe('when terminals have matching process IDs', () => {
    it('should return true', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      const otherDestination = createMockTerminalDestination({
        terminal: createMockTerminal({ processId: Promise.resolve(12345) }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(true);
    });
  });

  describe('when terminals have different process IDs', () => {
    it('should return false', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      const otherDestination = createMockTerminalDestination({
        terminal: createMockTerminal({ processId: Promise.resolve(67890) }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when other destination has no terminal property', () => {
    it('should return false', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      const otherDestination = createMockTerminalDestination();

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when this terminal process ID is undefined', () => {
    it('should return false', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(undefined) });
      const otherDestination = createMockTerminalDestination({
        terminal: createMockTerminal({ processId: Promise.resolve(12345) }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when other terminal process ID is undefined', () => {
    it('should return false', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(12345) });
      const otherDestination = createMockTerminalDestination({
        terminal: createMockTerminal({ processId: Promise.resolve(undefined) }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(false);
    });
  });

  describe('when both terminal process IDs are undefined', () => {
    it('should return false', async () => {
      const thisTerminal = createMockTerminal({ processId: Promise.resolve(undefined) });
      const otherDestination = createMockTerminalDestination({
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
      const otherDestination = createMockTerminalDestination({
        terminal: createMockTerminal({ processId: otherPidPromise }),
      });

      const result = await compareTerminalsByProcessId(thisTerminal, otherDestination);

      expect(result).toBe(true);
    });
  });
});
