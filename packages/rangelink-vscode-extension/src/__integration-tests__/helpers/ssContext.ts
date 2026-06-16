import * as path from 'node:path';

import * as vscode from 'vscode';

import type { LogCapture } from '../../LogCapture';

import type { CapturingTerminal } from './capturingPtyHelpers';
import { createAndBindCapturingTerminal, createCapturingTerminal } from './capturingPtyHelpers';
import {
  cleanupTrackedFiles,
  createAndOpenFile,
  createFileAt,
  createPngFixture,
  createWorkspaceFile,
  openEditor,
  type PngFixtureMode,
} from './fileHelpers';
import { getLogCapture } from './getLogCapture';
import { SETTLE_MS, TERMINAL_READY_MS, waitForExtensionActive } from './testEnv';
import {
  TEST_START_MARKER,
  TestWindowImpl,
  type ModalDialogExpectation,
  type TestWindow,
  type ToastExpectation,
} from './testWindow';

export type CreateTerminalOptions =
  | Omit<vscode.TerminalOptions, 'name'>
  | Omit<vscode.ExtensionTerminalOptions, 'name'>;

export interface SsContext {
  log: (msg: string) => void;
  createTerminal: (name: string, options?: CreateTerminalOptions) => Promise<vscode.Terminal>;
  createCapturingTerminal: (name: string) => Promise<CapturingTerminal>;
  createAndBindCapturingTerminal: (name: string) => Promise<CapturingTerminal>;
  createContentFile: (
    descriptor: string,
    lineCount: number,
    lineFactory: (index: number) => string,
  ) => { uri: vscode.Uri; filename: string };
  /**
   * Create a tracked workspace file with a generated filename
   * (`__rl-test-<descriptor>-<timestamp>-<counter>.txt`).
   */
  createWorkspaceFile: (descriptor: string, content: string) => vscode.Uri;
  /**
   * Create a tracked workspace file with an exact filename.
   * Prefer `createWorkspaceFile` when the descriptor-based naming is sufficient;
   * use this when the test needs a specific filename (spaces, parentheses, etc.).
   */
  createTrackedFile: (filename: string, content: string) => vscode.Uri;
  /**
   * Create a tracked `.png` fixture in the workspace root. Auto-tracked for
   * teardown. `'real-image'` (default) copies the extension's `icon.png` so
   * the file opens in VS Code's image preview as a real custom editor;
   * `'magic-only'` writes just the 8-byte PNG signature for tests that only
   * need a binary classification.
   */
  createPngFixture: (descriptor: string, mode?: PngFixtureMode) => vscode.Uri;
  createAndOpenFile: (
    descriptor: string,
    content: string,
    viewColumn?: vscode.ViewColumn,
  ) => Promise<vscode.Uri>;
  settle: (ms?: number) => Promise<void>;
  getLogCapture: () => LogCapture;
  /**
   * Mark the test start in the log capture and reset expectations.
   * Returns a TestWindow that verifies all test-window assertions in teardown.
   */
  beginTest: () => TestWindow;
  /**
   * Declare the exact sequence of status bar messages this test expects (with resolved
   * placeholders), in the order they should appear. The teardown hook verifies the
   * sequence exactly — no missing, no extras, correct order. Default is empty (any
   * unexpected message fails).
   */
  expectStatusBarMessages: (messages: string[]) => void;
  /**
   * Declare the exact sequence of fire-and-forget toasts (info/warning/error notifications
   * without action buttons) this test expects, in the order they should appear. Default is
   * empty (any unexpected toast fails).
   */
  expectToastMessages: (toasts: ToastExpectation[]) => void;
  /**
   * Declare the exact sequence of modal dialogs (toasts with action buttons) this test
   * expects, in the order they should appear. Designed for assisted tests where a human
   * clicks the buttons, but the test verifies dialog content programmatically. Default is
   * empty (any unexpected dialog fails).
   */
  expectModalDialogs: (dialogs: ModalDialogExpectation[]) => void;
  /**
   * Declare non-default context key values expected at the end of this test.
   * Keys not specified default to false. Multiple calls merge (later calls override
   * earlier keys).
   */
  expectContextKeys: (keys: Record<string, unknown>) => void;
  openEditor: (uri: vscode.Uri, viewColumn?: vscode.ViewColumn) => Promise<vscode.TextEditor>;
  waitForExtensionActive: (extensionId: string, timeoutMs?: number) => Promise<void>;
  clearDummyAi: () => Promise<void>;
}

export class SsContextImpl implements SsContext {
  private tmpTerminals: vscode.Terminal[] = [];
  private suiteLog: (msg: string) => void;
  private expectedStatusBarMessages: string[] = [];
  private expectedToasts: ToastExpectation[] = [];
  private expectedDialogs: ModalDialogExpectation[] = [];
  private expectedContextKeys: Record<string, unknown> = {};

  constructor(suiteLog: (msg: string) => void) {
    this.suiteLog = suiteLog;
    teardown(async () => {
      // Terminal disposal is deferred to standardSuite setup (next test), which
      // calls disposeAllTerminals() + CMD_UNBIND_DESTINATION before beginTest().
      // Disposing here would fire onDidCloseTerminal during the observation window
      // and leak status bar messages into verify().
      this.tmpTerminals.splice(0);
      cleanupTrackedFiles();
      await this.settle();
    });
  }

  log(msg: string): void {
    this.suiteLog(msg);
  }

  async createTerminal(
    name: string,
    options: CreateTerminalOptions = {},
  ): Promise<vscode.Terminal> {
    const t = vscode.window.createTerminal({ ...options, name } as
      | vscode.TerminalOptions
      | vscode.ExtensionTerminalOptions);
    this.tmpTerminals.push(t);
    t.show(true);
    await this.settle(TERMINAL_READY_MS);
    return t;
  }

  async createCapturingTerminal(name: string): Promise<CapturingTerminal> {
    const capturing = await createCapturingTerminal(name, this.tmpTerminals);
    return capturing;
  }

  async createAndBindCapturingTerminal(name: string): Promise<CapturingTerminal> {
    const capturing = await createAndBindCapturingTerminal(name, this.tmpTerminals);
    return capturing;
  }

  createContentFile(
    descriptor: string,
    lineCount: number,
    lineFactory: (index: number) => string,
  ): { uri: vscode.Uri; filename: string } {
    const lines = Array.from({ length: lineCount }, (_, i) => lineFactory(i));
    const uri = createWorkspaceFile(descriptor, lines.join('\n') + '\n');
    return { uri, filename: path.basename(uri.fsPath) };
  }

  createWorkspaceFile(descriptor: string, content: string): vscode.Uri {
    return createWorkspaceFile(descriptor, content);
  }

  createTrackedFile(filename: string, content: string): vscode.Uri {
    return createFileAt(filename, content);
  }

  createPngFixture(descriptor: string, mode: PngFixtureMode = 'real-image'): vscode.Uri {
    return createPngFixture(descriptor, mode);
  }

  async createAndOpenFile(
    descriptor: string,
    content: string,
    viewColumn?: vscode.ViewColumn,
  ): Promise<vscode.Uri> {
    return createAndOpenFile(descriptor, content, viewColumn);
  }

  async settle(ms?: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms ?? SETTLE_MS));
  }

  getLogCapture(): LogCapture {
    return getLogCapture();
  }

  beginTest(): TestWindow {
    getLogCapture().mark(TEST_START_MARKER);
    this.expectedStatusBarMessages = [];
    this.expectedToasts = [];
    this.expectedDialogs = [];
    this.expectedContextKeys = {};
    return new TestWindowImpl(
      TEST_START_MARKER,
      () => this.expectedStatusBarMessages,
      () => this.expectedToasts,
      () => this.expectedDialogs,
      () => this.expectedContextKeys,
    );
  }

  expectStatusBarMessages(messages: string[]): void {
    this.expectedStatusBarMessages.push(...messages);
  }

  expectToastMessages(toasts: ToastExpectation[]): void {
    this.expectedToasts.push(...toasts);
  }

  expectModalDialogs(dialogs: ModalDialogExpectation[]): void {
    this.expectedDialogs.push(...dialogs);
  }

  expectContextKeys(keys: Record<string, unknown>): void {
    Object.assign(this.expectedContextKeys, keys);
  }

  async openEditor(uri: vscode.Uri, viewColumn?: vscode.ViewColumn): Promise<vscode.TextEditor> {
    return openEditor(uri, viewColumn);
  }

  async waitForExtensionActive(extensionId: string, timeoutMs?: number): Promise<void> {
    await waitForExtensionActive(extensionId, this.suiteLog, timeoutMs);
  }

  async clearDummyAi(): Promise<void> {
    await vscode.commands.executeCommand('dummyAi.clearAll');
  }
}
