import { createMockLogger } from 'barebone-logger-testing';
import type * as vscode from 'vscode';

import { wireActiveTerminalBindabilityContext } from '../../destinations';
import { createMockTerminal, createMockVscodeAdapter } from '../helpers';

const minimalPty: vscode.Pseudoterminal = {
  onDidWrite: jest.fn(),
  open: jest.fn(),
  close: jest.fn(),
};

describe('wireActiveTerminalBindabilityContext', () => {
  it('sets rangelink.isActiveTerminalBindable=false when there is no active terminal', () => {
    const adapter = createMockVscodeAdapter();
    const vscodeMock = adapter.__getVscodeInstance();
    vscodeMock.window.activeTerminal = undefined;
    const logger = createMockLogger();

    wireActiveTerminalBindabilityContext(adapter, logger);

    expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
      'setContext',
      'rangelink.isActiveTerminalBindable',
      false,
    );
    expect(logger.debug).toHaveBeenCalledWith(
      {
        fn: 'wireActiveTerminalBindabilityContext.update',
        bindable: false,
        terminalName: undefined,
      },
      'Updating rangelink.isActiveTerminalBindable context key',
    );
  });

  it('sets rangelink.isActiveTerminalBindable=true when active terminal is a regular shell', () => {
    const adapter = createMockVscodeAdapter();
    const vscodeMock = adapter.__getVscodeInstance();
    const shell = createMockTerminal({ name: 'zsh', exitStatus: undefined, creationOptions: {} });
    vscodeMock.window.activeTerminal = shell;
    const logger = createMockLogger();

    wireActiveTerminalBindabilityContext(adapter, logger);

    expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
      'setContext',
      'rangelink.isActiveTerminalBindable',
      true,
    );
  });

  it('sets rangelink.isActiveTerminalBindable=false when active terminal is extension-managed pty', () => {
    const adapter = createMockVscodeAdapter();
    const vscodeMock = adapter.__getVscodeInstance();
    const pty = createMockTerminal({
      name: 'Jest',
      exitStatus: undefined,
      creationOptions: { name: 'Jest', pty: minimalPty },
    });
    vscodeMock.window.activeTerminal = pty;
    const logger = createMockLogger();

    wireActiveTerminalBindabilityContext(adapter, logger);

    expect(vscodeMock.commands.executeCommand).toHaveBeenCalledWith(
      'setContext',
      'rangelink.isActiveTerminalBindable',
      false,
    );
    expect(logger.debug).toHaveBeenCalledWith(
      {
        fn: 'wireActiveTerminalBindabilityContext.update',
        bindable: false,
        terminalName: 'Jest',
      },
      'Updating rangelink.isActiveTerminalBindable context key',
    );
  });

  it('subscribes to onDidOpenTerminal, onDidCloseTerminal, onDidChangeActiveTerminal', () => {
    const adapter = createMockVscodeAdapter();
    const vscodeMock = adapter.__getVscodeInstance();
    const logger = createMockLogger();

    wireActiveTerminalBindabilityContext(adapter, logger);

    expect(vscodeMock.window.onDidOpenTerminal).toHaveBeenCalledTimes(1);
    expect(vscodeMock.window.onDidCloseTerminal).toHaveBeenCalledTimes(1);
    expect(vscodeMock.window.onDidChangeActiveTerminal).toHaveBeenCalledTimes(1);
  });

  it('re-publishes context key when the active-terminal-change listener fires', () => {
    const adapter = createMockVscodeAdapter();
    const vscodeMock = adapter.__getVscodeInstance();
    const logger = createMockLogger();
    const shell = createMockTerminal({ name: 'zsh', exitStatus: undefined, creationOptions: {} });
    const pty = createMockTerminal({
      name: 'Jest',
      exitStatus: undefined,
      creationOptions: { name: 'Jest', pty: minimalPty },
    });
    vscodeMock.window.activeTerminal = shell;

    wireActiveTerminalBindabilityContext(adapter, logger);

    expect(vscodeMock.commands.executeCommand).toHaveBeenLastCalledWith(
      'setContext',
      'rangelink.isActiveTerminalBindable',
      true,
    );

    vscodeMock.window.activeTerminal = pty;
    const onChange = (vscodeMock.window.onDidChangeActiveTerminal as jest.Mock).mock.calls[0][0];
    onChange(pty);

    expect(vscodeMock.commands.executeCommand).toHaveBeenLastCalledWith(
      'setContext',
      'rangelink.isActiveTerminalBindable',
      false,
    );
  });

  it('disposable cleans up all three subscriptions', () => {
    const adapter = createMockVscodeAdapter();
    const vscodeMock = adapter.__getVscodeInstance();
    const openDisposable = { dispose: jest.fn() };
    const closeDisposable = { dispose: jest.fn() };
    const changeDisposable = { dispose: jest.fn() };
    (vscodeMock.window.onDidOpenTerminal as jest.Mock).mockReturnValueOnce(openDisposable);
    (vscodeMock.window.onDidCloseTerminal as jest.Mock).mockReturnValueOnce(closeDisposable);
    (vscodeMock.window.onDidChangeActiveTerminal as jest.Mock).mockReturnValueOnce(changeDisposable);
    const logger = createMockLogger();

    const result = wireActiveTerminalBindabilityContext(adapter, logger);
    result.dispose();

    expect(openDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(closeDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(changeDisposable.dispose).toHaveBeenCalledTimes(1);
  });
});
