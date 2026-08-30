import { CMD_BIND_TO_TERMINAL_HERE, CMD_COPY_LINK_ONLY_RELATIVE, CMD_COPY_LINK_RELATIVE, CMD_PASTE_CURRENT_FILE_PATH_RELATIVE } from '../constants';
import { markRangeLinkTestFixture } from '../destinations/utils';

import { join } from 'node:path';
import * as vscode from 'vscode';

export interface DevelopmentScenarioResult {
  scenario: string;
  verdict: 'PASS' | 'FAIL';
  detail: string;
}

type KeyAction = 'enter' | 'tab-enter' | 'escape';
type VerifyMode = 'clipboard' | 'terminal';

/**
 * One dirty-buffer keyboard TC. The human performs only the dialog keystroke
 * (`keyAction`) on the real modal; everything else is scripted and auto-verified.
 */
export interface DirtyBufferScenarioSpec {
  scenario: string;
  command: string;
  keyAction: KeyAction;
  verifyMode: VerifyMode;
  saveButton: string;
  abortButton: string;
}

const INSERT_TEXT = '// RangeLink dev-test edit (unsaved)\n';
const CLIPBOARD_SENTINEL = 'rangelink-development-sentinel';
const FILE_NAME = 'dirty-dialog.txt';
const TERMINAL_READY_MS = 1500;

const SAVE_BUTTON_LINK = 'Save & Generate';
const ABORT_BUTTON_LINK = 'Generate Anyway';
const SAVE_BUTTON_PATH = 'Save & Send';
const ABORT_BUTTON_PATH = 'Send Anyway';

export const dirtyBufferScenarioSpecs: DirtyBufferScenarioSpec[] = [
  // R-C — clipboard verify
  {
    scenario: 'dirty-buffer-warning-024',
    command: CMD_COPY_LINK_ONLY_RELATIVE,
    keyAction: 'enter',
    verifyMode: 'clipboard',
    saveButton: SAVE_BUTTON_LINK,
    abortButton: ABORT_BUTTON_LINK,
  },
  {
    scenario: 'dirty-buffer-warning-027',
    command: CMD_COPY_LINK_ONLY_RELATIVE,
    keyAction: 'tab-enter',
    verifyMode: 'clipboard',
    saveButton: SAVE_BUTTON_LINK,
    abortButton: ABORT_BUTTON_LINK,
  },
  {
    scenario: 'dirty-buffer-warning-030',
    command: CMD_COPY_LINK_ONLY_RELATIVE,
    keyAction: 'escape',
    verifyMode: 'clipboard',
    saveButton: SAVE_BUTTON_LINK,
    abortButton: ABORT_BUTTON_LINK,
  },
  // R-L — terminal verify
  {
    scenario: 'dirty-buffer-warning-025',
    command: CMD_COPY_LINK_RELATIVE,
    keyAction: 'enter',
    verifyMode: 'terminal',
    saveButton: SAVE_BUTTON_LINK,
    abortButton: ABORT_BUTTON_LINK,
  },
  {
    scenario: 'dirty-buffer-warning-028',
    command: CMD_COPY_LINK_RELATIVE,
    keyAction: 'tab-enter',
    verifyMode: 'terminal',
    saveButton: SAVE_BUTTON_LINK,
    abortButton: ABORT_BUTTON_LINK,
  },
  {
    scenario: 'dirty-buffer-warning-031',
    command: CMD_COPY_LINK_RELATIVE,
    keyAction: 'escape',
    verifyMode: 'terminal',
    saveButton: SAVE_BUTTON_LINK,
    abortButton: ABORT_BUTTON_LINK,
  },
  // R-F — terminal verify
  {
    scenario: 'dirty-buffer-warning-026',
    command: CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
    keyAction: 'enter',
    verifyMode: 'terminal',
    saveButton: SAVE_BUTTON_PATH,
    abortButton: ABORT_BUTTON_PATH,
  },
  {
    scenario: 'dirty-buffer-warning-029',
    command: CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
    keyAction: 'tab-enter',
    verifyMode: 'terminal',
    saveButton: SAVE_BUTTON_PATH,
    abortButton: ABORT_BUTTON_PATH,
  },
  {
    scenario: 'dirty-buffer-warning-032',
    command: CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
    keyAction: 'escape',
    verifyMode: 'terminal',
    saveButton: SAVE_BUTTON_PATH,
    abortButton: ABORT_BUTTON_PATH,
  },
];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const instructionText = (spec: DirtyBufferScenarioSpec): string => {
  switch (spec.keyAction) {
    case 'enter':
      return `press ENTER on "${spec.saveButton}"`;
    case 'tab-enter':
      // macOS modals ignore Tab (Full Keyboard Access off by default), so the
      // human clicks the abort button there; Linux and Windows use Tab+Enter.
      // No CI job runs these scenarios yet.
      return process.platform === 'darwin' ? `click "${spec.abortButton}"` : `press TAB then ENTER on "${spec.abortButton}"`;
    case 'escape':
      return `press ESCAPE`;
  }
};

/**
 * The dirty file's content doubles as the tester's instruction sheet: it names
 * the scenario and the one human action, so the tester can follow along from the
 * editor alone (no need to read the status bar).
 */
const instructionContent = (spec: DirtyBufferScenarioSpec): string => {
  const lines = [
    `RangeLink development test ${spec.scenario}`,
    `When the modal dialog appears, ${instructionText(spec)}.`,
    `The test auto-verifies and writes the result to a JSONL report in qa/output/.`,
    `This file is intentionally unsaved. Leave it as-is.`,
    '',
  ];
  return lines.join('\n');
};

/**
 * A terminal backed by a pseudoterminal that records every byte the extension
 * sends it via handleInput. Marked as a RangeLink test fixture so the bundled
 * extension's bindability classifier treats it as bindable, then bound as the
 * active terminal via CMD_BIND_TO_TERMINAL_HERE. Returns a getter for the
 * captured text.
 */
const createCapturingTerminal = async (name: string): Promise<() => string> => {
  const writeEmitter = new vscode.EventEmitter<string>();
  let captured = '';

  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    open: () => {
      writeEmitter.fire(`[capturing-pty:${name}] ready\r\n`);
    },
    close: () => {
      writeEmitter.dispose();
    },
    handleInput: (data: string) => {
      captured += data;
      writeEmitter.fire(data);
    },
  };

  const terminal = vscode.window.createTerminal({ name, pty });
  try {
    markRangeLinkTestFixture(terminal);
    terminal.show(true);
    await sleep(TERMINAL_READY_MS);
    await vscode.commands.executeCommand(CMD_BIND_TO_TERMINAL_HERE);
  } catch (error) {
    terminal.dispose();
    throw error;
  }

  return () => captured;
};

/**
 * Factory for one dirty-buffer keyboard TC. Opens a dirty file with a selection,
 * binds a capturing terminal (terminal-verify cases) or seeds a clipboard
 * sentinel (clipboard-verify cases), then drives the command. The command
 * resolves only after the human performs the dialog keystroke on the real modal.
 * Auto-verifies: file saved only for `enter`, content delivered only for
 * non-`escape`.
 */
export const createDirtyBufferScenario = (spec: DirtyBufferScenarioSpec): (() => Promise<DevelopmentScenarioResult>) => {
  return async (): Promise<DevelopmentScenarioResult> => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceRoot === undefined) {
      return { scenario: spec.scenario, verdict: 'FAIL', detail: 'No workspace folder open — launch via the development-test driver' };
    }

    let getCaptured: (() => string) | undefined;
    if (spec.verifyMode === 'terminal') {
      getCaptured = await createCapturingTerminal(`dev-${spec.scenario}`);
    }

    const fileUri = vscode.Uri.file(join(workspaceRoot, FILE_NAME));
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(instructionContent(spec)));
    const document = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(document);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), INSERT_TEXT);
    });
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, INSERT_TEXT.length - 1));

    if (spec.verifyMode === 'clipboard') {
      await vscode.env.clipboard.writeText(CLIPBOARD_SENTINEL);
    }

    vscode.window.setStatusBarMessage(`DEVELOPMENT TEST ${spec.scenario}: ${instructionText(spec)}`);

    await vscode.commands.executeCommand(spec.command);

    const fileSaved = !editor.document.isDirty;
    const delivered =
      spec.verifyMode === 'clipboard' ? (await vscode.env.clipboard.readText()) !== CLIPBOARD_SENTINEL : getCaptured !== undefined && getCaptured() !== '';

    const expectsSaved = spec.keyAction === 'enter';
    const expectsDelivered = spec.keyAction !== 'escape';
    const pass = fileSaved === expectsSaved && delivered === expectsDelivered;

    const deliveredLabel = spec.verifyMode === 'clipboard' ? 'linkCopied' : 'linkSent';
    const detail = `fileSaved=${fileSaved}, ${deliveredLabel}=${delivered}`;
    return { scenario: spec.scenario, verdict: pass ? 'PASS' : 'FAIL', detail };
  };
};
