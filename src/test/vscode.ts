import * as vscode from "vscode";

// Mock VSCode API for testing
import { Event } from "vscode";

// Simple Event implementation for mocks
class MockEvent<T> implements vscode.Event<T> {
  private handlers: Array<(e: T) => void> = [];

  fire(data: T): void {
    this.handlers.forEach((h) => h(data));
  }

  listener: (this: void, listener: (e: T) => void) => void = (listener) => {
    this.handlers.push(listener);
    return { dispose: () => {} };
  };
}

// Mock extension context
export class MockExtensionContext implements vscode.ExtensionContext {
  subscriptions: Array<{ dispose(): void }> = [];
  workspaceState = new MockMemento();
  globalState = new MockMemento();
  secrets = {} as any;
  extensionUri = vscode.Uri.parse("file:///mock");
  extensionPath = "/mock";
  globalStorageUri = vscode.Uri.parse("file:///mock/global");
  workspaceStorageUri = vscode.Uri.parse("file:///mock/workspace");
  storageUri = undefined;
  storagePath = undefined;
  globalStoragePath = undefined;
  logPath = "/mock/log";
  extensionMode = vscode.ExtensionMode.Production;
  extensionKind = vscode.ExtensionKind.Workspace;
  asAbsolutePath = (relativePath: string) => `/mock/${relativePath}`;
  environmentVariableCollection = {} as any;
  languageModelAccessInformation = {} as any;
}

class MockMemento implements vscode.Memento {
  private storage: Map<string, any> = new Map();

  get<T>(key: string, defaultValue?: T): T | undefined {
    return (this.storage.get(key) as T | undefined) ?? defaultValue;
  }

  update(key: string, value: any): Thenable<void> {
    this.storage.set(key, value);
    return Promise.resolve();
  }

  keys(): readonly string[] {
    return Array.from(this.storage.keys());
  }
}

// Export mocked module
module.exports = {
  ...vscode,
  Event: MockEvent,
  ExtensionContext: MockExtensionContext,
};
