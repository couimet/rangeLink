import assert from 'node:assert';

import { getLogCapture } from './getLogCapture';
import { parseLogContext } from './logBasedUiAssertions';

const STATUS_BAR_FNS = [
  'VscodeAdapter.setStatusBarMessage',
  'VscodeAdapter.setSuccessfulStatusBarMessage',
];

const TOAST_FNS = [
  'VscodeAdapter.showInformationMessage',
  'VscodeAdapter.showWarningMessage',
  'VscodeAdapter.showErrorMessage',
];

const MODAL_DIALOG_FNS = [
  'VscodeAdapter.showInformationMessage',
  'VscodeAdapter.showWarningMessage',
];

export const TEST_START_MARKER = 'test-start';

export interface TestWindow {
  verify(): void;
}

export interface ToastExpectation {
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface ModalDialogExpectation {
  level: 'info' | 'warning';
  message: string;
  items: string[];
}

export class TestWindowImpl implements TestWindow {
  private marker: string;
  private getExpectedStatusBarMessages: () => string[];
  private getExpectedToasts: () => ToastExpectation[];
  private getExpectedDialogs: () => ModalDialogExpectation[];

  constructor(
    marker: string,
    getExpectedStatusBarMessages: () => string[],
    getExpectedToasts: () => ToastExpectation[],
    getExpectedDialogs: () => ModalDialogExpectation[],
  ) {
    this.marker = marker;
    this.getExpectedStatusBarMessages = getExpectedStatusBarMessages;
    this.getExpectedToasts = getExpectedToasts;
    this.getExpectedDialogs = getExpectedDialogs;
  }

  verify(): void {
    this.verifyStatusBarMessages();
    this.verifyToastMessages();
    this.verifyModalDialogs();
  }

  private verifyStatusBarMessages(): void {
    const logged = this.collectStatusBarMessages();
    const expected = this.getExpectedStatusBarMessages();
    try {
      assert.deepStrictEqual(logged, expected);
    } catch {
      throw this.dumpFailure('Status Bar', expected, logged, 'ss.expectStatusBarMessages');
    }
  }

  private verifyToastMessages(): void {
    const logged = this.collectToastMessages();
    const expected = this.getExpectedToasts();
    try {
      assert.deepStrictEqual(logged, expected);
    } catch {
      throw this.dumpFailure('Toast', expected, logged, 'ss.expectToastMessages');
    }
  }

  private verifyModalDialogs(): void {
    const logged = this.collectModalDialogs();
    const expected = this.getExpectedDialogs();
    try {
      assert.deepStrictEqual(logged, expected);
    } catch {
      throw this.dumpFailure('Modal Dialog', expected, logged, 'ss.expectModalDialogs');
    }
  }

  private collectStatusBarMessages(): string[] {
    const lines = getLogCapture().getLinesSince(this.marker);
    const logged: string[] = [];
    for (const line of lines) {
      const ctx = parseLogContext(line);
      if (ctx !== undefined && STATUS_BAR_FNS.includes(ctx.fn) && typeof ctx.message === 'string') {
        logged.push(ctx.message);
      }
    }
    return logged;
  }

  private collectToastMessages(): ToastExpectation[] {
    const lines = getLogCapture().getLinesSince(this.marker);
    const logged: ToastExpectation[] = [];
    for (const line of lines) {
      const ctx = parseLogContext(line);
      if (ctx !== undefined && TOAST_FNS.includes(ctx.fn) && typeof ctx.message === 'string') {
        const items = ctx.items;
        if (Array.isArray(items) && items.length > 0) {
          continue;
        }
        logged.push({ level: this.fnToToastLevel(ctx.fn), message: ctx.message });
      }
    }
    return logged;
  }

  private collectModalDialogs(): ModalDialogExpectation[] {
    const lines = getLogCapture().getLinesSince(this.marker);
    const logged: ModalDialogExpectation[] = [];
    for (const line of lines) {
      const ctx = parseLogContext(line);
      if (
        ctx !== undefined &&
        MODAL_DIALOG_FNS.includes(ctx.fn) &&
        typeof ctx.message === 'string'
      ) {
        if (Array.isArray(ctx.items) && ctx.items.length > 0) {
          logged.push({
            level: this.fnToDialogLevel(ctx.fn),
            message: ctx.message,
            items: ctx.items as string[],
          });
        }
      }
    }
    return logged;
  }

  /**
   * Format a mismatch error with copy-pasteable expected/actual output.
   *
   * On failure the error message includes both the expected and actual arrays
   * as formatted JSON so the developer can copy the actual block directly
   * into the test body without needing to re-run for template extraction.
   */
  private dumpFailure(
    category: string,
    expected: unknown,
    actual: unknown,
    callName: string,
  ): never {
    const expectedJson = JSON.stringify(expected, null, 2);
    const actualJson = JSON.stringify(actual, null, 2);

    throw new assert.AssertionError({
      message: [
        `Unexpected ${category} messages.`,
        '',
        `--- Expected (${callName}) ---`,
        expectedJson,
        '',
        `--- Actual ---`,
        actualJson,
        '',
        expectedJson === '[]'
          ? `Copy the Actual block above into ${callName}([...]) in the test to fix.`
          : 'Update the Expected declaration above to match Actual, or fix the test to suppress unexpected messages.',
      ].join('\n'),
      expected,
      actual,
    });
  }

  private fnToToastLevel(fn: string): ToastExpectation['level'] {
    if (fn === 'VscodeAdapter.showInformationMessage') return 'info';
    if (fn === 'VscodeAdapter.showWarningMessage') return 'warning';
    return 'error';
  }

  private fnToDialogLevel(fn: string): ModalDialogExpectation['level'] {
    return fn === 'VscodeAdapter.showInformationMessage' ? 'info' : 'warning';
  }
}
