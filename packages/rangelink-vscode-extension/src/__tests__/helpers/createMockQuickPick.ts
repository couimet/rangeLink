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
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handlers: {
    onDidTriggerItemButton?: (event: vscode.QuickPickItemButtonEvent<MockQuickPickItem>) => any;
    onDidAccept?: () => any;
    onDidHide?: () => any;
  } = {};
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return {
    items: [] as MockQuickPickItem[],
    title: '',
    placeholder: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    onDidTriggerItemButton: jest.fn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handler: (event: vscode.QuickPickItemButtonEvent<MockQuickPickItem>) => any) => {
        handlers.onDidTriggerItemButton = handler;
        return { dispose: jest.fn() };
      },
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDidAccept: jest.fn((handler: () => any) => {
      handlers.onDidAccept = handler;
      return { dispose: jest.fn() };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
