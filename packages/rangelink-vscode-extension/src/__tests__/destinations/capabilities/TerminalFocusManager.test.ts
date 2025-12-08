import { createMockLogger } from 'barebone-logger-testing';

import { TerminalFocusManager } from '../../../destinations/capabilities/TerminalFocusManager';
import { TerminalFocusType } from '../../../types/TerminalFocusType';
import { createMockTerminal } from '../../helpers/createMockTerminal';
import { createMockVscodeAdapter } from '../../helpers/mockVSCode';

describe('TerminalFocusManager', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();
  const testContext = { fn: 'test' };

  const mockTerminal = createMockTerminal({
    name: 'Test Terminal',
    processId: Promise.resolve(12345),
  });

  describe('focus()', () => {
    it('should call showTerminal with terminal and StealFocus', async () => {
      const spy = jest.spyOn(mockAdapter, 'showTerminal').mockReturnValue(undefined);

      const manager = new TerminalFocusManager(mockAdapter, mockTerminal, mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockTerminal, TerminalFocusType.StealFocus);

    });

    it('should log debug message on success', async () => {
      const spy = jest.spyOn(mockAdapter, 'showTerminal').mockReturnValue(undefined);

      const manager = new TerminalFocusManager(mockAdapter, mockTerminal, mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockTerminal, TerminalFocusType.StealFocus);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'test',
        }),
        'Terminal focused via show()',
      );

    });

    it('should handle focus failure gracefully', async () => {
      const error = new Error('showTerminal failed');
      const spy = jest.spyOn(mockAdapter, 'showTerminal').mockImplementation(() => {
        throw error;
      });

      const manager = new TerminalFocusManager(mockAdapter, mockTerminal, mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockTerminal, TerminalFocusType.StealFocus);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'test',
          error,
        }),
        'Failed to focus terminal',
      );

    });

    it('should not throw when focus fails', async () => {
      const spy = jest.spyOn(mockAdapter, 'showTerminal').mockImplementation(() => {
        throw new Error('Failed');
      });

      const manager = new TerminalFocusManager(mockAdapter, mockTerminal, mockLogger);

      await expect(manager.focus(testContext)).resolves.not.toThrow();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(mockTerminal, TerminalFocusType.StealFocus);

    });
  });
});
