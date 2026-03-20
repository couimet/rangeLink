import assert from 'node:assert';

/**
 * Toast types mapped to the VscodeAdapter function names that appear in log JSON context.
 */
const TOAST_FN_MAP = {
  info: 'VscodeAdapter.showInformationMessage',
  warning: 'VscodeAdapter.showWarningMessage',
  error: 'VscodeAdapter.showErrorMessage',
  statusBar: 'VscodeAdapter.setStatusBarMessage',
} as const;

type ToastType = keyof typeof TOAST_FN_MAP;

interface ToastAssertionOptions {
  type: ToastType;
  message: string;
}

/**
 * Parse a log line's JSON context to extract the `fn` and `message` fields.
 * Log format: `[LEVEL] {"fn":"...","message":"...",...} Human-readable text`
 */
const parseLogContext = (line: string): { fn: string; message: string } | undefined => {
  const jsonStart = line.indexOf('{');
  const jsonEnd = line.indexOf('}');
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

/**
 * Assert that a specific toast was logged in the captured lines.
 * Matches both the VscodeAdapter function name (toast type) and the exact message text.
 */
export const assertToastLogged = (lines: string[], opts: ToastAssertionOptions): void => {
  const expectedFn = TOAST_FN_MAP[opts.type];

  const found = lines.some((line) => {
    const ctx = parseLogContext(line);
    return ctx !== undefined && ctx.fn === expectedFn && ctx.message === opts.message;
  });

  assert.ok(
    found,
    `Expected ${opts.type} toast with message "${opts.message}" but it was not found in ${lines.length} log lines`,
  );
};

/**
 * Assert that a specific toast was NOT logged in the captured lines.
 */
export const assertNoToastLogged = (lines: string[], opts: ToastAssertionOptions): void => {
  const expectedFn = TOAST_FN_MAP[opts.type];

  const found = lines.some((line) => {
    const ctx = parseLogContext(line);
    return ctx !== undefined && ctx.fn === expectedFn && ctx.message === opts.message;
  });

  assert.ok(
    !found,
    `Expected ${opts.type} toast with message "${opts.message}" to NOT be logged, but it was found`,
  );
};
