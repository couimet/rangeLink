import type * as vscode from 'vscode';

export interface MockQuickPickItem extends vscode.QuickPickItem {
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
    onDidTriggerItemButton?: (event: vscode.QuickPickItemButtonEvent<MockQuickPickItem>) => any;
    onDidAccept?: () => any;
    onDidHide?: () => any;
  } = {};

  return {
    items: [] as MockQuickPickItem[],
    title: '',
    placeholder: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    onDidTriggerItemButton: jest.fn(
      (handler: (event: vscode.QuickPickItemButtonEvent<MockQuickPickItem>) => any) => {
        handlers.onDidTriggerItemButton = handler;
        return { dispose: jest.fn() };
      },
    ),

    onDidAccept: jest.fn((handler: () => any) => {
      handlers.onDidAccept = handler;
      return { dispose: jest.fn() };
    }),

    onDidHide: jest.fn((handler: () => any) => {
      handlers.onDidHide = handler;
      return { dispose: jest.fn() };
    }),
    __triggerItemButton: (event: vscode.QuickPickItemButtonEvent<MockQuickPickItem>) =>
      handlers.onDidTriggerItemButton?.(event),
    __triggerAccept: () => handlers.onDidAccept?.(),
    __triggerHide: () => handlers.onDidHide?.(),
  };
};
