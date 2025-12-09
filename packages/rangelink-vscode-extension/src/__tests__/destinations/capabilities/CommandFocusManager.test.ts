import { createMockLogger } from 'barebone-logger-testing';

import { CommandFocusManager } from '../../../destinations/capabilities/CommandFocusManager';
import { createMockVscodeAdapter } from '../../helpers/mockVSCode';

describe('CommandFocusManager', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();
  const testContext = { fn: 'test' };

  describe('focus()', () => {
    it('should try commands in order', async () => {
      const spy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('Command 1 failed'))
        .mockResolvedValueOnce(undefined);

      const manager = new CommandFocusManager(
        mockAdapter,
        ['command1', 'command2', 'command3'],
        mockLogger,
      );

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, 'command1');
      expect(spy).toHaveBeenNthCalledWith(2, 'command2');

    });

    it('should stop after first success', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const manager = new CommandFocusManager(
        mockAdapter,
        ['command1', 'command2', 'command3'],
        mockLogger,
      );

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('command1');

    });

    it('should log debug on success', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const manager = new CommandFocusManager(mockAdapter, ['test.command'], mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('test.command');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', command: 'test.command' },
        'Focus command succeeded',
      );

    });

    it('should log debug for each failed command', async () => {
      const error1 = new Error('Command 1 failed');
      const error2 = new Error('Command 2 failed');
      const spy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce(undefined);

      const manager = new CommandFocusManager(
        mockAdapter,
        ['command1', 'command2', 'command3'],
        mockLogger,
      );

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenNthCalledWith(1, 'command1');
      expect(spy).toHaveBeenNthCalledWith(2, 'command2');
      expect(spy).toHaveBeenNthCalledWith(3, 'command3');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', command: 'command1', error: error1 },
        'Focus command failed, trying next',
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'test', command: 'command2', error: error2 },
        'Focus command failed, trying next',
      );

    });

    it('should log warn when all commands fail', async () => {
      const spy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValue(new Error('All failed'));

      const manager = new CommandFocusManager(mockAdapter, ['command1', 'command2'], mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, 'command1');
      expect(spy).toHaveBeenNthCalledWith(2, 'command2');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'test', allCommandsFailed: true },
        'All focus commands failed',
      );
    });

    it('should not throw when all commands fail', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValue(new Error('Failed'));

      const manager = new CommandFocusManager(mockAdapter, ['command1'], mockLogger);

      await expect(manager.focus(testContext)).resolves.not.toThrow();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('command1');

    });

    it('should handle single command', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValue(undefined);

      const manager = new CommandFocusManager(mockAdapter, ['single.command'], mockLogger);

      await manager.focus(testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('single.command');

    });

    it('should handle empty command array', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand');

      const manager = new CommandFocusManager(mockAdapter, [], mockLogger);

      await manager.focus(testContext);

      expect(spy).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { fn: 'test', allCommandsFailed: true },
        'All focus commands failed',
      );
    });
  });
});
