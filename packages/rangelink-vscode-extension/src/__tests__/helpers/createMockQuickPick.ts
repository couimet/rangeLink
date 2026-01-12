import type * as vscode from 'vscode';

export interface MockQuickPickItem extends vscode.QuickPickItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Create a mock QuickPick for advanced QuickPick testing.
 *
 * Returns a mock with event handlers that can be triggered manually in tests.
 * Use `__trigger*` methods to simulate user interactions.
 */
export const createMockQuickPick = () => {
  const handlers: {
    onDidTriggerItemButton?: (event: vscode.QuickPickItemButtonEvent<MockQuickPickItem>) => void;
    onDidAccept?: () => void;
    onDidHide?: () => void;
  } = {};

  return {
    items: [] as MockQuickPickItem[],
    title: '',
    placeholder: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    onDidTriggerItemButton: jest.fn(
      (handler: (event: vscode.QuickPickItemButtonEvent<MockQuickPickItem>) => void) => {
        handlers.onDidTriggerItemButton = handler;
        return { dispose: jest.fn() };
      },
    ),
    onDidAccept: jest.fn((handler: () => void) => {
      handlers.onDidAccept = handler;
      return { dispose: jest.fn() };
    }),
    onDidHide: jest.fn((handler: () => void) => {
      handlers.onDidHide = handler;
      return { dispose: jest.fn() };
    }),
    __triggerItemButton: (event: vscode.QuickPickItemButtonEvent<MockQuickPickItem>) =>
      handlers.onDidTriggerItemButton?.(event),
    __triggerAccept: () => handlers.onDidAccept?.(),
    __triggerHide: () => handlers.onDidHide?.(),
  };
};
