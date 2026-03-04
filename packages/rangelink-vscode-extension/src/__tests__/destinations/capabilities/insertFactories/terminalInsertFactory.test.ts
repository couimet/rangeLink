import { createMockLogger } from 'barebone-logger-testing';

import type { ClipboardPreserver } from '../../../../clipboard/ClipboardPreserver';
import { TerminalInsertFactory } from '../../../../destinations/capabilities/insertFactories/terminalInsertFactory';
import {
  createMockClipboardPreserver,
  createMockTerminal,
  createMockVscodeAdapter,
} from '../../../helpers';

describe('TerminalInsertFactory', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockClipboardPreserver: jest.Mocked<ClipboardPreserver>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockClipboardPreserver = createMockClipboardPreserver();
  });

  it('creates an insert function that pastes text to terminal via clipboard', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const mockTerminal = createMockTerminal({ name: 'My Terminal' });
    const pasteTextSpy = jest
      .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
      .mockResolvedValue(undefined);

    const factory = new TerminalInsertFactory(mockAdapter, mockClipboardPreserver, mockLogger);
    const insertFn = factory.forTarget(mockTerminal);

    const result = await insertFn('test content');

    expect(result).toBe(true);
    expect(pasteTextSpy).toHaveBeenCalledTimes(1);
    expect(pasteTextSpy).toHaveBeenCalledWith(mockTerminal, 'test content');
    expect(mockLogger.info).toHaveBeenCalledWith(
      { fn: 'TerminalInsertFactory.insert', terminalName: 'My Terminal' },
      'Terminal paste succeeded',
    );
  });

  it('returns false when paste throws an error', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const mockTerminal = createMockTerminal({ name: 'My Terminal' });
    const testError = new Error('Paste failed');
    jest.spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard').mockRejectedValue(testError);

    const factory = new TerminalInsertFactory(mockAdapter, mockClipboardPreserver, mockLogger);
    const insertFn = factory.forTarget(mockTerminal);

    const result = await insertFn('content');

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { fn: 'TerminalInsertFactory.insert', terminalName: 'My Terminal', error: testError },
      'Terminal paste failed',
    );
  });

  it('captures terminal reference in closure', async () => {
    const mockAdapter = createMockVscodeAdapter();
    const terminal1 = createMockTerminal({ name: 'Terminal 1' });
    const terminal2 = createMockTerminal({ name: 'Terminal 2' });
    const pasteTextSpy = jest
      .spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard')
      .mockResolvedValue(undefined);

    const factory = new TerminalInsertFactory(mockAdapter, mockClipboardPreserver, mockLogger);
    const insertFn1 = factory.forTarget(terminal1);
    const insertFn2 = factory.forTarget(terminal2);

    await insertFn1('content for terminal 1');
    await insertFn2('content for terminal 2');

    expect(pasteTextSpy).toHaveBeenNthCalledWith(1, terminal1, 'content for terminal 1');
    expect(pasteTextSpy).toHaveBeenNthCalledWith(2, terminal2, 'content for terminal 2');
  });

  it('delegates wrapping to the injected ClipboardPreserver', async () => {
    const mockAdapter = createMockVscodeAdapter();
    jest.spyOn(mockAdapter, 'pasteTextToTerminalViaClipboard').mockResolvedValue(undefined);
    const mockTerminal = createMockTerminal({ name: 'My Terminal' });

    const factory = new TerminalInsertFactory(mockAdapter, mockClipboardPreserver, mockLogger);
    const insertFn = factory.forTarget(mockTerminal);

    await insertFn('content');

    expect(mockClipboardPreserver.preserve).toHaveBeenCalledTimes(1);
  });
});
