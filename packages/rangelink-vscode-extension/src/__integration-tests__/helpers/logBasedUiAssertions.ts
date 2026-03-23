import assert from 'node:assert';

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
 * Parse a log line's JSON context to extract the `fn` and `message` fields.
 * Log format: `[LEVEL] {"fn":"...","message":"...",...} Human-readable text`
 */
const parseLogContext = (line: string): { fn: string; message: string } | undefined => {
  const jsonStart = line.indexOf('{');
  const jsonEnd = line.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    return undefined;
  }
  try {
    const ctx = JSON.parse(line.slice(jsonStart, jsonEnd + 1));
    if (typeof ctx.fn === 'string' && typeof ctx.message === 'string') {
      return { fn: ctx.fn, message: ctx.message };
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const parseLogContextFull = (
  line: string,
): Record<string, unknown> | undefined => {
  const jsonStart = line.indexOf('{');
  const jsonEnd = line.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    return undefined;
  }
  try {
    const ctx = JSON.parse(line.slice(jsonStart, jsonEnd + 1));
    if (typeof ctx === 'object' && ctx !== null && typeof ctx.fn === 'string') {
      return ctx as Record<string, unknown>;
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
      const ctx = parseLogContextFull(line);
      return (
        ctx !== undefined &&
        ctx.fn === opts.fn &&
        ctx.suppressedMessage === opts.suppressedMessage
      );
    }),
    `Expected suppression log with fn="${opts.fn}" and suppressedMessage="${opts.suppressedMessage}" but it was not found in ${lines.length} log lines`,
  );
};
