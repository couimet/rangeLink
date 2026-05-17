import { createMockLogger } from 'barebone-logger-testing';

import { TerminalInsertFactory } from '../../../../destinations/capabilities/insertFactories/terminalInsertFactory';
import { createMockTerminal, createMockVscodeAdapter } from '../../../helpers';

describe('TerminalInsertFactory', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('delegates to ideAdapter.pasteIntoTerminal and returns true on success', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard');
    const mockTerminal = createMockTerminal({ name: 'My Terminal' });
    const pasteIntoTerminalSpy = jest
      .spyOn(mockAdapter, 'pasteIntoTerminal')
      .mockResolvedValue(undefined);

    const factory = new TerminalInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget(mockTerminal);

    const result = await insertFn('test content');

    expect(result).toBe(true);
    expect(pasteIntoTerminalSpy).toHaveBeenCalledTimes(1);
    expect(pasteIntoTerminalSpy).toHaveBeenCalledWith(mockTerminal);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'TerminalInsertFactory.insert', terminalName: 'My Terminal' },
      'Terminal paste succeeded',
    );
    expect(mockAdapter.writeTextToClipboard).not.toHaveBeenCalled();
  });

  it('returns false when pasteIntoTerminal throws', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard');
    const mockTerminal = createMockTerminal({ name: 'My Terminal' });
    const testError = new Error('Paste failed');
    jest.spyOn(mockAdapter, 'pasteIntoTerminal').mockRejectedValue(testError);

    const factory = new TerminalInsertFactory(mockAdapter, mockLogger);
    const insertFn = factory.forTarget(mockTerminal);

    const result = await insertFn('content');

    expect(result).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      { fn: 'TerminalInsertFactory.insert', terminalName: 'My Terminal', error: testError },
      'Terminal paste failed',
    );
    expect(mockAdapter.writeTextToClipboard).not.toHaveBeenCalled();
  });

  it('captures terminal reference in closure', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'writeTextToClipboard');
    const terminal1 = createMockTerminal({ name: 'Terminal 1' });
    const terminal2 = createMockTerminal({ name: 'Terminal 2' });
    const pasteIntoTerminalSpy = jest
      .spyOn(mockAdapter, 'pasteIntoTerminal')
      .mockResolvedValue(undefined);

    const factory = new TerminalInsertFactory(mockAdapter, mockLogger);
    const insertFn1 = factory.forTarget(terminal1);
    const insertFn2 = factory.forTarget(terminal2);

    await insertFn1('content for terminal 1');
    await insertFn2('content for terminal 2');

    expect(pasteIntoTerminalSpy).toHaveBeenNthCalledWith(1, terminal1);
    expect(pasteIntoTerminalSpy).toHaveBeenNthCalledWith(2, terminal2);
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockAdapter.writeTextToClipboard).not.toHaveBeenCalled();
  });
});
