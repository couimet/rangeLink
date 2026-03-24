import type { SubscriptionRegistrar } from '../../SubscriptionRegistrar';

export type MockSubscriptionRegistrar = jest.Mocked<SubscriptionRegistrar> & {
  getHandler: (commandId: string) => (...args: unknown[]) => unknown;
};

/**
 * Create a mock SubscriptionRegistrar that captures registered command handlers.
 *
 * Use `getHandler(commandId)` to retrieve and invoke a registered closure for delegation testing.
 */
export const createMockSubscriptionRegistrar = (): MockSubscriptionRegistrar => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const mock: jest.Mocked<SubscriptionRegistrar> = {
    registerCommand: jest.fn((id, handler) => {
      handlers.set(id, handler);
    }),
    registerTerminalLinkProvider: jest.fn(),
    registerDocumentLinkProvider: jest.fn(),
    pushDisposable: jest.fn(),
  };
  return Object.assign(mock, {
    getHandler: (commandId: string) => {
      const handler = handlers.get(commandId);
      if (!handler) {
        throw new Error(`No handler registered for command: ${commandId}`);
      }
      return handler;
    },
  });
};
