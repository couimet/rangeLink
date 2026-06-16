import { createMockLogger } from '@couimet/logger-contract-testing';

import { ContextKeyService } from '../../contextKeys/ContextKeyService';
import {
  createMockBoundSession,
  createMockTerminal,
  createMockTerminalComposablePasteDestination,
  createMockVscodeAdapter,
  type VscodeAdapterWithTestHooks,
} from '../helpers';

const MINIMAL_PTY = {
  onDidWrite: jest.fn(),
  open: jest.fn(),
  close: jest.fn(),
};

describe('ContextKeyService', () => {
  let adapter: VscodeAdapterWithTestHooks;
  let vscodeMock: ReturnType<VscodeAdapterWithTestHooks['__getVscodeInstance']>;
  let session: ReturnType<typeof createMockBoundSession>;
  let logger: ReturnType<typeof createMockLogger>;
  let setContextSpy: jest.SpyInstance;

  const createService = (): ContextKeyService =>
    new ContextKeyService(adapter, session as any, logger);

  beforeEach(() => {
    adapter = createMockVscodeAdapter();
    vscodeMock = adapter.__getVscodeInstance();
    vscodeMock.window.activeTerminal = undefined;
    session = createMockBoundSession();
    logger = createMockLogger();
    setContextSpy = jest.spyOn(adapter, 'setContext');
  });

  // --- isBound ---

  it('sets isBound=false on construction when nothing is bound', () => {
    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isBound', false);
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'ContextKeyService.updateIsBound', isBound: false },
      'Evaluating isBound context key',
    );
  });

  it('sets isBound=true on construction when a destination is bound', () => {
    const dest = createMockTerminalComposablePasteDestination();
    session = createMockBoundSession({ get: jest.fn().mockReturnValue(dest) });
    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isBound', true);
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'ContextKeyService.updateIsBound', isBound: true },
      'Evaluating isBound context key',
    );
  });

  // --- isActiveTerminalBindable ---

  it('sets isActiveTerminalBindable=false when there is no active terminal', () => {
    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isActiveTerminalBindable', false);
    expect(logger.debug).toHaveBeenCalledWith(
      {
        fn: 'ContextKeyService.updateBindability',
        bindable: false,
        terminalName: undefined,
      },
      'Evaluating isActiveTerminalBindable context key',
    );
  });

  it('sets isActiveTerminalBindable=true when active terminal is a regular shell', () => {
    const shell = createMockTerminal({
      name: 'zsh',
      exitStatus: undefined,
      creationOptions: {},
    });
    vscodeMock.window.activeTerminal = shell;

    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isActiveTerminalBindable', true);
    expect(logger.debug).toHaveBeenCalledWith(
      {
        fn: 'ContextKeyService.updateBindability',
        bindable: true,
        terminalName: 'zsh',
      },
      'Evaluating isActiveTerminalBindable context key',
    );
  });

  it('sets isActiveTerminalBindable=false when active terminal is extension-managed pty', () => {
    const pty = createMockTerminal({
      name: 'Jest',
      exitStatus: undefined,
      creationOptions: { name: 'Jest', pty: MINIMAL_PTY },
    });
    vscodeMock.window.activeTerminal = pty;

    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isActiveTerminalBindable', false);
    expect(logger.debug).toHaveBeenCalledWith(
      {
        fn: 'ContextKeyService.updateBindability',
        bindable: false,
        terminalName: 'Jest',
      },
      'Evaluating isActiveTerminalBindable context key',
    );
  });

  // --- isActiveTerminalPasteDestination ---

  it('sets isActiveTerminalPasteDestination=false when nothing is bound', () => {
    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isActiveTerminalPasteDestination', false);
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'ContextKeyService.updateActiveTerminalPasteDestination', active: false },
      'Evaluating isActiveTerminalPasteDestination context key',
    );
  });

  it('sets isActiveTerminalPasteDestination=true when bound terminal matches active terminal', () => {
    const terminal = createMockTerminal({ name: 'zsh' });
    const dest = createMockTerminalComposablePasteDestination({ terminal });
    vscodeMock.window.activeTerminal = terminal;
    session = createMockBoundSession({ get: jest.fn().mockReturnValue(dest) });

    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isActiveTerminalPasteDestination', true);
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'ContextKeyService.updateActiveTerminalPasteDestination', active: true },
      'Evaluating isActiveTerminalPasteDestination context key',
    );
  });

  it('sets isActiveTerminalPasteDestination=false when bound terminal differs from active terminal', () => {
    const boundTerminal = createMockTerminal({ name: 'bash', processId: Promise.resolve(1) });
    const activeTerminal = createMockTerminal({ name: 'zsh', processId: Promise.resolve(2) });
    const dest = createMockTerminalComposablePasteDestination({ terminal: boundTerminal });
    vscodeMock.window.activeTerminal = activeTerminal;
    session = createMockBoundSession({ get: jest.fn().mockReturnValue(dest) });

    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isActiveTerminalPasteDestination', false);
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'ContextKeyService.updateActiveTerminalPasteDestination', active: false },
      'Evaluating isActiveTerminalPasteDestination context key',
    );
  });

  it('sets isActiveTerminalPasteDestination=false when bound destination is not a terminal', () => {
    const terminal = createMockTerminal({ name: 'zsh' });
    vscodeMock.window.activeTerminal = terminal;
    // Use a plain object that won't pass isTerminalDestination guard
    const nonTerminalDest = { id: 'text-editor', displayName: 'Editor', rawLabel: 'file.ts' };
    session = createMockBoundSession({ get: jest.fn().mockReturnValue(nonTerminalDest) });

    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isActiveTerminalPasteDestination', false);
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'ContextKeyService.updateActiveTerminalPasteDestination', active: false },
      'Evaluating isActiveTerminalPasteDestination context key',
    );
  });

  // --- subscriptions ---

  it('subscribes to all four events on construction', () => {
    createService();

    expect(vscodeMock.window.onDidOpenTerminal).toHaveBeenCalledTimes(1);
    expect(vscodeMock.window.onDidCloseTerminal).toHaveBeenCalledTimes(1);
    expect(vscodeMock.window.onDidChangeActiveTerminal).toHaveBeenCalledTimes(1);
    expect(session.onDidChange).toHaveBeenCalledTimes(1);
  });

  it('logs initialization on construction', () => {
    createService();

    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'ContextKeyService' },
      'ContextKeyService initializing all context keys',
    );
  });

  // --- re-evaluation ---

  it('re-evaluates context keys when active terminal changes', () => {
    const shell = createMockTerminal({
      name: 'zsh',
      exitStatus: undefined,
      creationOptions: {},
    });
    vscodeMock.window.activeTerminal = shell;
    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isActiveTerminalBindable', true);

    const pty = createMockTerminal({
      name: 'Jest',
      exitStatus: undefined,
      creationOptions: { name: 'Jest', pty: MINIMAL_PTY },
    });
    vscodeMock.window.activeTerminal = pty;
    const onChange = (vscodeMock.window.onDidChangeActiveTerminal as jest.Mock).mock.calls[0][0];
    onChange(pty);

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isActiveTerminalBindable', false);
    expect(logger.debug).toHaveBeenCalledWith(
      {
        fn: 'ContextKeyService.updateBindability',
        bindable: false,
        terminalName: 'Jest',
      },
      'Evaluating isActiveTerminalBindable context key',
    );
  });

  it('re-evaluates context keys when bound destination changes', () => {
    createService();

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isBound', false);

    const dest = createMockTerminalComposablePasteDestination();
    session.get.mockReturnValue(dest);
    session._emitter.fire({ id: 'terminal', displayName: 'Terminal ("zsh")' });

    expect(setContextSpy).toHaveBeenCalledWith('rangelink.isBound', true);
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'ContextKeyService.updateIsBound', isBound: true },
      'Evaluating isBound context key',
    );
  });

  // --- getLastSetValues ---

  it('getLastSetValues returns the last-set values for all known context keys', () => {
    const shell = createMockTerminal({
      name: 'zsh',
      exitStatus: undefined,
      creationOptions: {},
    });
    vscodeMock.window.activeTerminal = shell;
    const dest = createMockTerminalComposablePasteDestination({ terminal: shell });
    session.get.mockReturnValue(dest);
    const service = createService();

    expect(service.getLastSetValues()).toStrictEqual({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });

    session.get.mockReturnValue(undefined);
    session._emitter.fire(undefined);

    expect(service.getLastSetValues()).toStrictEqual({
      'rangelink.isBound': false,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': false,
    });
  });

  // --- dispose ---

  it('dispose cleans up all four subscriptions', () => {
    const openDisposable = { dispose: jest.fn() };
    const closeDisposable = { dispose: jest.fn() };
    const changeDisposable = { dispose: jest.fn() };
    const boundDisposable = { dispose: jest.fn() };
    (vscodeMock.window.onDidOpenTerminal as jest.Mock).mockReturnValueOnce(openDisposable);
    (vscodeMock.window.onDidCloseTerminal as jest.Mock).mockReturnValueOnce(closeDisposable);
    (vscodeMock.window.onDidChangeActiveTerminal as jest.Mock).mockReturnValueOnce(
      changeDisposable,
    );
    session.onDidChange.mockReturnValueOnce(boundDisposable);

    const service = createService();
    service.dispose();

    expect(openDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(closeDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(changeDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(boundDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      { fn: 'ContextKeyService' },
      'Disposing ContextKeyService',
    );
  });
});
