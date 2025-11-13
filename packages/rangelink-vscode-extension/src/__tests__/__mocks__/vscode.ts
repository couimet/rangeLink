import * as vscode from 'vscode';

// Mock VSCode API for testing
import { Event } from 'vscode';

// Simple Event implementation for mocks
function createMockEvent<T>(): vscode.Event<T> & { fire(data: T): void } {
  const handlers: Array<(e: T) => void> = [];

  function event(listener: (e: T) => any, thisArgs?: any, disposables?: any) {
    handlers.push(listener);
    return { dispose: () => {} };
  }

  (event as any).fire = (data: T) => {
    handlers.forEach((h) => h(data));
  };

  return event as any;
}

// Mock extension context
export class MockExtensionContext implements vscode.ExtensionContext {
  subscriptions: Array<{ dispose(): void }> = [];
  workspaceState = new MockMemento();
  globalState: MockMemento & { setKeysForSync(keys: readonly string[]): void } =
    new MockMemento() as any;
  secrets = {} as any;
  extensionUri = vscode.Uri.parse('file:///mock');
  extension = {} as any;
  extensionPath = '/mock';
  globalStorageUri = vscode.Uri.parse('file:///mock/global');
  workspaceStorageUri = vscode.Uri.parse('file:///mock/workspace');
  storageUri = undefined;
  storagePath = undefined;
  globalStoragePath = '/mock/global';
  logPath = '/mock/log';
  logUri = vscode.Uri.parse('file:///mock/log');
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

  setKeysForSync(keys: readonly string[]): void {
    // Mock implementation
  }
}

// Mock env, extensions, and commands for destination tests
const mockEnv = {
  appName: 'Visual Studio Code',
  uriScheme: 'vscode',
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn().mockResolvedValue(''),
  },
};

const mockExtensions = {
  all: [],
  getExtension: jest.fn(),
};

const mockCommands = {
  executeCommand: jest.fn().mockResolvedValue(undefined),
};

const mockWindow = {
  showInformationMessage: jest.fn().mockResolvedValue(undefined),
  showWarningMessage: jest.fn().mockResolvedValue(undefined),
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  showTextDocument: jest.fn(),
};

const mockWorkspace = {
  openTextDocument: jest.fn(),
  getWorkspaceFolder: jest.fn(),
  workspaceFolders: undefined,
};

const mockLanguages = {
  registerDocumentLinkProvider: jest.fn(),
};

// Mock constructor functions for VSCode types
const mockUri = {
  parse: jest.fn((str) => ({
    scheme: str.startsWith('file:') ? 'file' : 'command',
    path: str,
    toString: () => str,
    fsPath: str.replace(/^file:\/\//, ''),
  })),
  file: jest.fn((path) => ({
    scheme: 'file',
    path,
    toString: () => `file://${path}`,
    fsPath: path,
  })),
};

const mockRange = jest.fn((start, end) => ({ start, end }));

const mockPosition = jest.fn((line, char) => ({ line, character: char }));

const mockSelection = jest.fn((start, end) => ({ start, end, anchor: start, active: end }));

const mockDocumentLink = jest.fn(function (this: any, range: any) {
  this.range = range;
  this.tooltip = undefined;
  this.target = undefined;
});

const mockTextEditorRevealType = {
  InCenterIfOutsideViewport: 2,
};

// Export mocked module
module.exports = {
  ...vscode,
  createMockEvent,
  ExtensionContext: MockExtensionContext,
  env: mockEnv,
  extensions: mockExtensions,
  commands: mockCommands,
  window: mockWindow,
  workspace: mockWorkspace,
  languages: mockLanguages,
  Uri: mockUri,
  Range: mockRange,
  Position: mockPosition,
  Selection: mockSelection,
  DocumentLink: mockDocumentLink,
  TextEditorRevealType: mockTextEditorRevealType,
};
