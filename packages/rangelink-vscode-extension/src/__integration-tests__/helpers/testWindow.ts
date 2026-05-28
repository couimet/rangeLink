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
    const lines = getLogCapture().getLinesSince(this.marker);
    const logged: string[] = [];
    for (const line of lines) {
      const ctx = parseLogContext(line);
      if (ctx !== undefined && STATUS_BAR_FNS.includes(ctx.fn) && typeof ctx.message === 'string') {
        logged.push(ctx.message);
      }
    }
    assert.deepStrictEqual(logged, this.getExpectedStatusBarMessages());
  }

  private verifyToastMessages(): void {
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
    assert.deepStrictEqual(logged, this.getExpectedToasts());
  }

  private verifyModalDialogs(): void {
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
    assert.deepStrictEqual(logged, this.getExpectedDialogs());
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
