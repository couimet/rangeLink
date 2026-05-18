import * as path from 'node:path';

import * as vscode from 'vscode';

import type { LogCapture } from '../../LogCapture';

import type { CapturingTerminal } from './capturingPtyHelpers';
import { createAndBindCapturingTerminal, createCapturingTerminal } from './capturingPtyHelpers';
import { cleanupFiles, createAndOpenFile, createWorkspaceFile, openEditor } from './fileHelpers';
import { getLogCapture } from './getLogCapture';
import { loadSettingsProfile } from './settingsHelpers';
import { settle, TERMINAL_READY_MS, waitForExtensionActive } from './testEnv';

export interface SsContext {
  log: (msg: string) => void;
  createTerminal: (name: string) => Promise<vscode.Terminal>;
  createCapturingTerminal: (name: string) => Promise<CapturingTerminal>;
  createAndBindCapturingTerminal: (name: string) => Promise<CapturingTerminal>;
  createContentFile: (
    descriptor: string,
    lineCount: number,
    lineFactory: (index: number) => string,
  ) => { uri: vscode.Uri; filename: string };
  createWorkspaceFile: (descriptor: string, content: string) => vscode.Uri;
  createAndOpenFile: (
    descriptor: string,
    content: string,
    viewColumn?: vscode.ViewColumn,
  ) => Promise<vscode.Uri>;
  settle: (ms?: number) => Promise<void>;
  getLogCapture: () => LogCapture;
  openEditor: (uri: vscode.Uri, viewColumn?: vscode.ViewColumn) => Promise<vscode.TextEditor>;
  waitForExtensionActive: (extensionId: string, timeoutMs?: number) => Promise<void>;
  loadSettingsProfile: (profileName: string) => Promise<void>;
}

export class SsContextImpl implements SsContext {
  private tmpFileUris: vscode.Uri[] = [];
  private tmpTerminals: vscode.Terminal[] = [];
  private suiteLog: (msg: string) => void;

  constructor(suiteLog: (msg: string) => void) {
    this.suiteLog = suiteLog;
    teardown(async () => {
      for (const t of this.tmpTerminals.splice(0)) {
        t.dispose();
      }
      cleanupFiles(this.tmpFileUris);
      this.tmpFileUris.splice(0);
      await settle();
    });
  }

  log(msg: string): void {
    this.suiteLog(msg);
  }

  async createTerminal(name: string): Promise<vscode.Terminal> {
    const t = vscode.window.createTerminal({ name });
    this.tmpTerminals.push(t);
    t.show(true);
    await settle(TERMINAL_READY_MS);
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
    this.tmpFileUris.push(uri);
    return { uri, filename: path.basename(uri.fsPath) };
  }

  createWorkspaceFile(descriptor: string, content: string): vscode.Uri {
    const uri = createWorkspaceFile(descriptor, content);
    this.tmpFileUris.push(uri);
    return uri;
  }

  async createAndOpenFile(
    descriptor: string,
    content: string,
    viewColumn?: vscode.ViewColumn,
  ): Promise<vscode.Uri> {
    const uri = await createAndOpenFile(descriptor, content, viewColumn, this.tmpFileUris);
    return uri;
  }

  async settle(ms?: number): Promise<void> {
    await settle(ms);
  }

  getLogCapture(): LogCapture {
    return getLogCapture();
  }

  async openEditor(uri: vscode.Uri, viewColumn?: vscode.ViewColumn): Promise<vscode.TextEditor> {
    return openEditor(uri, viewColumn);
  }

  async waitForExtensionActive(extensionId: string, timeoutMs?: number): Promise<void> {
    await waitForExtensionActive(extensionId, this.suiteLog, timeoutMs);
  }

  async loadSettingsProfile(profileName: string): Promise<void> {
    await loadSettingsProfile(profileName, this.suiteLog);
  }
}
