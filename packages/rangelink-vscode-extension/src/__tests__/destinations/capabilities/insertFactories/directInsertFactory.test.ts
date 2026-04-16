import { createMockLogger } from 'barebone-logger-testing';

import { DirectInsertFactory } from '../../../../destinations/capabilities/insertFactories/directInsertFactory';
import type { InsertCommandEntry } from '../../../../destinations/capabilities/insertFactories/directInsertFactory';
import { createMockVscodeAdapter } from '../../../helpers';

const LINK_TEXT = 'src/app.ts#L10-L20';

describe('DirectInsertFactory', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('calls executeCommand with text as first positional arg when no args template', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValue(undefined);

    const entries: InsertCommandEntry[] = [{ command: 'sparkAi.insertText' }];
    const factory = new DirectInsertFactory(mockAdapter, entries, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(true);
    expect(executeCommandSpy).toHaveBeenCalledWith('sparkAi.insertText', 'src/app.ts#L10-L20');
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'DirectInsertFactory.insert', command: 'sparkAi.insertText' },
      'Direct insert succeeded',
    );
  });

  it('interpolates ${content} in args template and spreads as arguments', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValue(undefined);

    const entries: InsertCommandEntry[] = [
      { command: 'fancy.cmd', args: [{ text: '${content}', format: 'markdown' }] },
    ];
    const factory = new DirectInsertFactory(mockAdapter, entries, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(true);
    expect(executeCommandSpy).toHaveBeenCalledWith('fancy.cmd', {
      text: 'src/app.ts#L10-L20',
      format: 'markdown',
    });
  });

  it('wraps non-array interpolated args as a single argument', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValue(undefined);

    const entries: InsertCommandEntry[] = [{ command: 'cmd', args: { content: '${content}' } }];
    const factory = new DirectInsertFactory(mockAdapter, entries, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(true);
    expect(executeCommandSpy).toHaveBeenCalledWith('cmd', { content: 'src/app.ts#L10-L20' });
  });

  it('spreads multiple elements from an array args template as separate arguments', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockResolvedValue(undefined);

    const entries: InsertCommandEntry[] = [
      { command: 'multi.cmd', args: ['${content}', { source: 'rangelink' }] },
    ];
    const factory = new DirectInsertFactory(mockAdapter, entries, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(true);
    expect(executeCommandSpy).toHaveBeenCalledWith('multi.cmd', 'src/app.ts#L10-L20', {
      source: 'rangelink',
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'DirectInsertFactory.insert', command: 'multi.cmd' },
      'Direct insert succeeded',
    );
  });

  it('falls through to next command when first fails', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const primaryError = new Error('Not found');
    const executeCommandSpy = jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockRejectedValueOnce(primaryError)
      .mockResolvedValueOnce(undefined);

    const entries: InsertCommandEntry[] = [{ command: 'cmd.primary' }, { command: 'cmd.fallback' }];
    const factory = new DirectInsertFactory(mockAdapter, entries, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(true);
    expect(executeCommandSpy).toHaveBeenCalledTimes(2);
    expect(executeCommandSpy).toHaveBeenNthCalledWith(1, 'cmd.primary', 'src/app.ts#L10-L20');
    expect(executeCommandSpy).toHaveBeenNthCalledWith(2, 'cmd.fallback', 'src/app.ts#L10-L20');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { fn: 'DirectInsertFactory.insert', command: 'cmd.primary', error: primaryError },
      'Direct insert command failed, trying next',
    );
  });

  it('returns false when all commands fail', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest
      .spyOn(mockAdapter, 'executeCommand')
      .mockRejectedValueOnce(new Error('First failed'))
      .mockRejectedValueOnce(new Error('Second failed'));

    const entries: InsertCommandEntry[] = [{ command: 'cmd.first' }, { command: 'cmd.second' }];
    const factory = new DirectInsertFactory(mockAdapter, entries, mockLogger);
    const insertFn = factory.forTarget();

    const result = await insertFn(LINK_TEXT);

    expect(result).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'DirectInsertFactory.insert', allCommandsFailed: true },
      'All direct insert commands failed',
    );
  });
});
