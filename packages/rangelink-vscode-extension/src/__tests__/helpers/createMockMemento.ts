/**
 * Create a mock vscode.Memento for testing bookmark storage
 */

import type * as vscode from 'vscode';

export type MockMemento = vscode.Memento & {
  setKeysForSync: jest.Mock;
  _storage: Map<string, unknown>;
};

/**
 * Create a mock Memento for testing.
 * Includes setKeysForSync for Settings Sync testing and _storage for direct access.
 *
 * @returns Mock Memento with get, update, keys, and setKeysForSync methods
 */
export const createMockMemento = (): MockMemento => {
  const storage = new Map<string, unknown>();
  return {
    get: jest.fn(<T>(key: string, defaultValue?: T): T | undefined => {
      return (storage.get(key) as T | undefined) ?? defaultValue;
    }),
    update: jest.fn((key: string, value: unknown): Promise<void> => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    keys: jest.fn(() => Array.from(storage.keys())),
    setKeysForSync: jest.fn(),
    _storage: storage,
  };
};
