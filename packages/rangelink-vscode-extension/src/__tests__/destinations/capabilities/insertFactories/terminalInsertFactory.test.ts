import { createMockLogger } from 'barebone-logger-testing';
import { RangeLinkError, RangeLinkErrorCodes, Result } from 'rangelink-core-ts';

import { TerminalInsertFactory } from '../../../../destinations/capabilities/insertFactories/terminalInsertFactory';
import { createMockTerminal, createMockTerminalPasteService } from '../../../helpers';

describe('TerminalInsertFactory', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('calls pasteIntoTerminal and returns true on success', async () => {
    const mockPasteService = createMockTerminalPasteService();
    const mockTerminal = createMockTerminal({ name: 'My Terminal' });

    const factory = new TerminalInsertFactory(mockPasteService, mockLogger);
    const insertFn = factory.forTarget(mockTerminal);

    const result = await insertFn('test content');

    expect(result).toBe(true);
    expect(mockPasteService.pasteIntoTerminal).toHaveBeenCalledWith('test content', mockTerminal);
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'TerminalInsertFactory.insert', terminalName: 'My Terminal' },
      'Terminal paste succeeded',
    );
  });

  it('returns false when pasteIntoTerminal returns error', async () => {
    const stageError = new RangeLinkError({
      code: RangeLinkErrorCodes.CLIPBOARD_STAGE_WRITE_FAILED,
      message: 'Failed to write text to clipboard',
      functionName: 'ClipboardService::stage',
    });
    const mockPasteService = createMockTerminalPasteService();
    mockPasteService.pasteIntoTerminal.mockResolvedValue(Result.err(stageError));
    const mockTerminal = createMockTerminal({ name: 'My Terminal' });

    const factory = new TerminalInsertFactory(mockPasteService, mockLogger);
    const insertFn = factory.forTarget(mockTerminal);

    const result = await insertFn('content');

    expect(result).toBe(false);
    expect(mockPasteService.pasteIntoTerminal).toHaveBeenCalledWith('content', mockTerminal);
    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        fn: 'TerminalInsertFactory.insert',
        terminalName: 'My Terminal',
        error: stageError,
      },
      'Terminal paste failed',
    );
  });

  it('captures per-terminal name in closure', async () => {
    const mockPasteService = createMockTerminalPasteService();
    const terminal1 = createMockTerminal({ name: 'Terminal 1' });
    const terminal2 = createMockTerminal({ name: 'Terminal 2' });

    const factory = new TerminalInsertFactory(mockPasteService, mockLogger);
    const insertFn1 = factory.forTarget(terminal1);
    const insertFn2 = factory.forTarget(terminal2);

    await insertFn1('content for terminal 1');
    await insertFn2('content for terminal 2');

    expect(mockPasteService.pasteIntoTerminal).toHaveBeenCalledTimes(2);
    expect(mockPasteService.pasteIntoTerminal).toHaveBeenNthCalledWith(
      1,
      'content for terminal 1',
      terminal1,
    );
    expect(mockPasteService.pasteIntoTerminal).toHaveBeenNthCalledWith(
      2,
      'content for terminal 2',
      terminal2,
    );

    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
