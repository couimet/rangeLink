import * as vscode from 'vscode';

import type { BoundSession } from '../../destinations';
import type { BoundDestinationInfo } from '../../types';

export const createMockBoundSession = (overrides?: { get?: jest.Mock; isSet?: jest.Mock }) => {
  let stored: BoundDestinationInfo | undefined = undefined;

  const getMock = overrides?.get ?? jest.fn().mockImplementation(() => stored);

  const isSetMock = overrides?.isSet ?? jest.fn().mockImplementation(() => getMock() !== undefined);

  const getInfoMock = jest.fn().mockImplementation(() => {
    const current = getMock();
    if (!current) return undefined;
    return { id: current.id, displayName: current.displayName };
  });

  const setMock = jest.fn().mockImplementation((dest: BoundDestinationInfo | undefined) => {
    stored = dest;
    emitter.fire(getInfoMock());
  });

  const clearMock = jest.fn().mockImplementation(() => {
    stored = undefined;
    emitter.fire(undefined);
  });

  const emitter = new vscode.EventEmitter<BoundDestinationInfo | undefined>();

  return {
    get: getMock,
    set: setMock,
    clear: clearMock,
    isSet: isSetMock,
    getInfo: getInfoMock,
    subscribe: jest.fn((fn: (info: BoundDestinationInfo | undefined) => void) => {
      fn(getMock());
      return emitter.event(fn);
    }),
    onDidChange: jest.fn((fn: (info: BoundDestinationInfo | undefined) => void) =>
      emitter.event(fn),
    ),
    _emitter: emitter,
    isClipboardRestorationApplicable: jest.fn().mockReturnValue(true),
    dispose: jest.fn(),
  } as unknown as jest.Mocked<BoundSession> & {
    _emitter: vscode.EventEmitter<BoundDestinationInfo | undefined>;
  };
};
