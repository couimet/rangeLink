import assert from 'node:assert';

import type { LoggingContext } from 'barebone-logger';

/**
 * Toast types mapped to the VscodeAdapter function names that appear in log JSON context.
 * Status bar messages are NOT toasts — use assertStatusBarMsgLogged() for those.
 */
const TOAST_FN_MAP = {
  info: 'VscodeAdapter.showInformationMessage',
  warning: 'VscodeAdapter.showWarningMessage',
  error: 'VscodeAdapter.showErrorMessage',
} as const;

const STATUS_BAR_FN = 'VscodeAdapter.setStatusBarMessage';

type ToastType = keyof typeof TOAST_FN_MAP;

interface MessageAssertionOptions {
  message: string;
}

interface ToastAssertionOptions extends MessageAssertionOptions {
  type: ToastType;
}

/**
 * Parse a log line's JSON context block.
 * Log format: `[LEVEL] {"fn":"...","message":"...",...} Human-readable text`
 */
const parseLogContext = (line: string): LoggingContext | undefined => {
  const jsonStart = line.indexOf('{');
  const jsonEnd = line.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    return undefined;
  }
  try {
    const ctx = JSON.parse(line.slice(jsonStart, jsonEnd + 1));
    if (typeof ctx === 'object' && ctx !== null && typeof ctx.fn === 'string') {
      return ctx as LoggingContext;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const findLogEntry = (lines: string[], expectedFn: string, expectedMessage: string): boolean =>
  lines.some((line) => {
    const ctx = parseLogContext(line);
    return ctx !== undefined && ctx.fn === expectedFn && ctx.message === expectedMessage;
  });

/**
 * Assert that a specific toast (info/warning/error) was logged.
 */
export const assertToastLogged = (lines: string[], opts: ToastAssertionOptions): void => {
  assert.ok(
    findLogEntry(lines, TOAST_FN_MAP[opts.type], opts.message),
    `Expected ${opts.type} toast with message "${opts.message}" but it was not found in ${lines.length} log lines`,
  );
};

/**
 * Assert that a specific toast was NOT logged.
 */
export const assertNoToastLogged = (lines: string[], opts: ToastAssertionOptions): void => {
  assert.ok(
    !findLogEntry(lines, TOAST_FN_MAP[opts.type], opts.message),
    `Expected ${opts.type} toast with message "${opts.message}" to NOT be logged, but it was found`,
  );
};

/**
 * Assert that a specific status bar message was logged.
 */
export const assertStatusBarMsgLogged = (lines: string[], opts: MessageAssertionOptions): void => {
  assert.ok(
    findLogEntry(lines, STATUS_BAR_FN, opts.message),
    `Expected status bar message "${opts.message}" but it was not found in ${lines.length} log lines`,
  );
};

/**
 * Assert that a specific status bar message was NOT logged.
 */
export const assertNoStatusBarMsgLogged = (
  lines: string[],
  opts: MessageAssertionOptions,
): void => {
  assert.ok(
    !findLogEntry(lines, STATUS_BAR_FN, opts.message),
    `Expected status bar message "${opts.message}" to NOT be logged, but it was found`,
  );
};

const QUICK_PICK_FN = 'VscodeAdapter.showQuickPick';

interface QuickPickItemExpectation {
  label: string;
  description?: string;
  detail?: string;
  kind?: number;
  itemKind?: string;
}

/**
 * Assert that a showQuickPick log entry contains the expected items in order.
 * Matches on the subset of fields provided in each expectation — omitted fields are not checked.
 */
export const assertQuickPickItemsLogged = (
  lines: string[],
  expectedItems: QuickPickItemExpectation[],
): void => {
  let loggedItems: Record<string, unknown>[] | undefined;

  for (const line of lines) {
    const ctx = parseLogContext(line);
    if (ctx !== undefined && ctx.fn === QUICK_PICK_FN && Array.isArray(ctx.items)) {
      loggedItems = ctx.items as Record<string, unknown>[];
      break;
    }
  }

  assert.ok(
    loggedItems !== undefined,
    `Expected ${QUICK_PICK_FN} log entry with items but none found in ${lines.length} log lines`,
  );

  assert.strictEqual(
    loggedItems!.length,
    expectedItems.length,
    `Expected ${expectedItems.length} QuickPick items but logged ${loggedItems!.length}`,
  );

  for (let i = 0; i < expectedItems.length; i++) {
    const expected = expectedItems[i];
    const actual: Record<string, unknown> = loggedItems![i];

    for (const [key, value] of Object.entries(expected)) {
      assert.strictEqual(
        actual[key],
        value,
        `QuickPick item [${i}] field "${key}": expected "${value}" but got "${actual[key]}"`,
      );
    }
  }
};

interface SuppressionAssertionOptions {
  fn: string;
  suppressedMessage: string;
}

/**
 * Assert that a suppression log entry exists with the exact message that would have been shown.
 * Verifies both the function name and the `suppressedMessage` attribute in the log JSON context.
 */
export const assertSuppressionLogged = (
  lines: string[],
  opts: SuppressionAssertionOptions,
): void => {
  assert.ok(
    lines.some((line) => {
      const ctx = parseLogContext(line);
      return (
        ctx !== undefined && ctx.fn === opts.fn && ctx.suppressedMessage === opts.suppressedMessage
      );
    }),
    `Expected suppression log with fn="${opts.fn}" and suppressedMessage="${opts.suppressedMessage}" but it was not found in ${lines.length} log lines`,
  );
};
