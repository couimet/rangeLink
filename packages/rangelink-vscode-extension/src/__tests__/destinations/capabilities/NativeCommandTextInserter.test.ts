import { createMockLogger } from 'barebone-logger-testing';

import { createMockVscodeAdapter } from '../../helpers/mockVSCode';
import { NativeCommandTextInserter } from '../../../destinations/capabilities/NativeCommandTextInserter';

describe('NativeCommandTextInserter', () => {
  const mockLogger = createMockLogger();
  const mockAdapter = createMockVscodeAdapter();
  const testContext = { fn: 'test' };

  describe('insert()', () => {
    it('should build arguments correctly', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValueOnce(undefined);
      const buildArgs = jest.fn((text: string) => ({ query: text, isPartialQuery: true }));
      const inserter = new NativeCommandTextInserter(
        mockAdapter,
        'workbench.action.chat.open',
        buildArgs,
        mockLogger,
      );

      await inserter.insert('test query', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('workbench.action.chat.open', {
        query: 'test query',
        isPartialQuery: true,
      });
      expect(buildArgs).toHaveBeenCalledTimes(1);
      expect(buildArgs).toHaveBeenCalledWith('test query');

    });

    it('should execute command with arguments', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValueOnce(undefined);
      const buildArgs = (text: string): Record<string, unknown> => ({
        query: text,
        isPartialQuery: true,
      });
      const inserter = new NativeCommandTextInserter(
        mockAdapter,
        'workbench.action.chat.open',
        buildArgs,
        mockLogger,
      );

      await inserter.insert('test query', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('workbench.action.chat.open', {
        query: 'test query',
        isPartialQuery: true,
      });

    });

    it('should log on success', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValueOnce(undefined);
      const buildArgs = (text: string): Record<string, unknown> => ({ query: text });
      const inserter = new NativeCommandTextInserter(
        mockAdapter,
        'workbench.action.chat.open',
        buildArgs,
        mockLogger,
      );

      await inserter.insert('test query', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('workbench.action.chat.open', { query: 'test query' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'test',
          command: 'workbench.action.chat.open',
        }),
        'Native command insert succeeded',
      );

    });

    it('should log on failure', async () => {
      const error = new Error('Command execution failed');
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockRejectedValueOnce(error);

      const buildArgs = (text: string): Record<string, unknown> => ({ query: text });
      const inserter = new NativeCommandTextInserter(
        mockAdapter,
        'workbench.action.chat.open',
        buildArgs,
        mockLogger,
      );

      await inserter.insert('test query', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('workbench.action.chat.open', { query: 'test query' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'test',
          command: 'workbench.action.chat.open',
          error,
        }),
        'Native command insert failed',
      );

    });

    it('should return true on successful execution', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValueOnce(undefined);
      const buildArgs = (text: string): Record<string, unknown> => ({ query: text });
      const inserter = new NativeCommandTextInserter(
        mockAdapter,
        'workbench.action.chat.open',
        buildArgs,
        mockLogger,
      );

      const result = await inserter.insert('test query', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('workbench.action.chat.open', { query: 'test query' });
      expect(result).toStrictEqual(true);

    });

    it('should return false on failed execution', async () => {
      const spy = jest
        .spyOn(mockAdapter, 'executeCommand')
        .mockRejectedValueOnce(new Error('Command failed'));

      const buildArgs = (text: string): Record<string, unknown> => ({ query: text });
      const inserter = new NativeCommandTextInserter(
        mockAdapter,
        'workbench.action.chat.open',
        buildArgs,
        mockLogger,
      );

      const result = await inserter.insert('test query', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('workbench.action.chat.open', { query: 'test query' });
      expect(result).toStrictEqual(false);

    });

    it('should handle complex argument structures', async () => {
      const spy = jest.spyOn(mockAdapter, 'executeCommand').mockResolvedValueOnce(undefined);
      const buildArgs = (text: string): Record<string, unknown> => ({
        query: text,
        isPartialQuery: true,
        options: {
          mode: 'insert',
          position: 'end',
        },
      });
      const inserter = new NativeCommandTextInserter(
        mockAdapter,
        'custom.command',
        buildArgs,
        mockLogger,
      );

      await inserter.insert('test', testContext);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('custom.command', {
        query: 'test',
        isPartialQuery: true,
        options: {
          mode: 'insert',
          position: 'end',
        },
      });

    });
  });
});
