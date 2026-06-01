import assert from 'node:assert';

import type { LoggingContext } from 'barebone-logger';

/**
 * Parse a log line's JSON context block.
 * Log format: `[LEVEL] {"fn":"...","message":"...",...} Human-readable text`
 */
export const parseLogContext = (line: string): LoggingContext | undefined => {
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

const INPUT_BOX_FN = 'VscodeAdapter.showInputBox';

interface InputBoxAssertionOptions {
  prompt: string;
  placeHolder: string;
}

/**
 * Assert that a showInputBox log entry was emitted with the expected prompt and placeholder.
 * Parses each line's log context and compares `fn` + `options.prompt` + `options.placeHolder`
 * directly — no raw substring matching.
 */
export const assertInputBoxLogged = (lines: string[], opts: InputBoxAssertionOptions): void => {
  const found = lines.some((line) => {
    const ctx = parseLogContext(line) as
      | (LoggingContext & {
          options?: {
            prompt?: unknown;
            placeHolder?: unknown;
          };
        })
      | undefined;

    return (
      ctx?.fn === INPUT_BOX_FN &&
      ctx.options?.prompt === opts.prompt &&
      ctx.options?.placeHolder === opts.placeHolder
    );
  });
  assert.ok(
    found,
    `Expected ${INPUT_BOX_FN} log entry with prompt "${opts.prompt}" and placeholder "${opts.placeHolder}" but it was not found in ${lines.length} log lines`,
  );
};

const QUICK_PICK_FN = 'VscodeAdapter.showQuickPick';

/**
 * Subset of fields expected on a logged QuickPick item.
 *
 * All fields are optional: omitted fields are skipped during assertion. This
 * allows callers to assert only the fields they care about (e.g. just `kind`
 * and `itemKind` for separator checks).
 */
interface QuickPickItemExpectation {
  label?: string;
  description?: string;
  detail?: string;
  kind?: number;
  itemKind?: string;
  command?: string;
  displayName?: string;
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

/**
 * Filter lines to only those that are showQuickPick log entries with items.
 * Use instead of raw `VscodeAdapter.showQuickPick` substring matching.
 */
export const getQuickPickLines = (lines: string[]): string[] =>
  lines.filter((line) => {
    const ctx = parseLogContext(line);
    return ctx?.fn === QUICK_PICK_FN && Array.isArray(ctx.items);
  });

/**
 * Parse the items array from a single showQuickPick log line.
 * Use when you need items from a specific log entry (e.g., the 2nd picker invocation).
 */
export const parseQuickPickItemsFromLogLine = (logLine: string): Record<string, unknown>[] => {
  const ctx = parseLogContext(logLine);
  if (ctx === undefined || !Array.isArray(ctx.items)) {
    throw new Error('Log line does not contain a showQuickPick items payload');
  }
  return ctx.items as Record<string, unknown>[];
};

/**
 * Extract the items array from the first showQuickPick log entry in a set of lines.
 * Returns undefined if no matching log entry is found.
 */
export const extractQuickPickItemsLogged = (
  lines: string[],
): Record<string, unknown>[] | undefined => {
  for (const line of lines) {
    const ctx = parseLogContext(line);
    if (ctx !== undefined && ctx.fn === QUICK_PICK_FN && Array.isArray(ctx.items)) {
      return ctx.items as Record<string, unknown>[];
    }
  }
  return undefined;
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

const FILE_PATH_FN = 'FilePathPaster.pasteFilePath';

interface FilePathAssertionOptions {
  pathFormat: 'absolute' | 'workspace-relative';
  uriSource: 'context-menu' | 'command-palette';
  filePath: string;
}

/**
 * Assert that FilePathPaster.pasteFilePath resolved a file path via the expected route.
 * Compares `fn`, `pathFormat`, `uriSource`, and `filePath` directly on parsed log context.
 */
export const assertFilePathLogged = (lines: string[], opts: FilePathAssertionOptions): void => {
  const found = lines.some((line) => {
    const ctx = parseLogContext(line) as
      | (LoggingContext & {
          pathFormat?: unknown;
          uriSource?: unknown;
          filePath?: unknown;
        })
      | undefined;
    return (
      ctx?.fn === FILE_PATH_FN &&
      ctx.pathFormat === opts.pathFormat &&
      ctx.uriSource === opts.uriSource &&
      ctx.filePath === opts.filePath
    );
  });
  assert.ok(
    found,
    `Expected ${FILE_PATH_FN} log with pathFormat="${opts.pathFormat}", uriSource="${opts.uriSource}", filePath="${opts.filePath}" but it was not found in ${lines.length} log lines`,
  );
};

const EXECUTE_COMMAND_FN = 'VscodeAdapter.executeCommand';
const SET_CONTEXT_COMMAND = 'setContext';

type ContextKeyValue = boolean | string | number;

interface SetContextAssertionOptions {
  key: string;
  value: ContextKeyValue;
}

const matchSetContextLog = (line: string, opts: SetContextAssertionOptions): boolean => {
  const ctx = parseLogContext(line) as
    | (LoggingContext & {
        command?: unknown;
        args?: unknown;
      })
    | undefined;
  if (ctx?.fn !== EXECUTE_COMMAND_FN || ctx.command !== SET_CONTEXT_COMMAND) return false;
  if (!Array.isArray(ctx.args)) return false;
  return ctx.args[0] === opts.key && ctx.args[1] === opts.value;
};

/**
 * Assert that a `setContext` executeCommand log was emitted for the given context key + value.
 * Matches against the parsed `args` array: args[0] === key, args[1] === value.
 */
export const assertSetContextLogged = (lines: string[], opts: SetContextAssertionOptions): void => {
  assert.ok(
    lines.some((line) => matchSetContextLog(line, opts)),
    `Expected setContext log with key="${opts.key}" value=${String(opts.value)} but it was not found in ${lines.length} log lines`,
  );
};

/**
 * Assert that NO `setContext` executeCommand log was emitted for the given key + value.
 * Use to prove state-invariants during an observation window.
 */
export const assertNoSetContextLogged = (
  lines: string[],
  opts: SetContextAssertionOptions,
): void => {
  assert.ok(
    !lines.some((line) => matchSetContextLog(line, opts)),
    `Expected setContext log with key="${opts.key}" value=${String(opts.value)} to NOT be logged, but it was found`,
  );
};

/**
 * Assert that `VscodeAdapter.executeCommand` was logged for the given command ID.
 * Asserts at the adapter boundary rather than tying to internal routing details.
 */
export const assertExecuteCommandLogged = (lines: string[], command: string): void => {
  const found = lines.some((line) => {
    const ctx = parseLogContext(line) as (LoggingContext & { command?: unknown }) | undefined;
    return ctx?.fn === EXECUTE_COMMAND_FN && ctx.command === command;
  });
  assert.ok(
    found,
    `Expected ${EXECUTE_COMMAND_FN} log with command="${command}" but it was not found in ${lines.length} log lines`,
  );
};

const TERMINAL_PASTE_FN = 'VscodeAdapter.pasteTextToTerminalViaClipboard';

interface TerminalPasteAssertionOptions {
  terminalName: string;
  minTextLength?: number;
}

/**
 * Assert that `pasteTextToTerminalViaClipboard` logged delivery to the expected terminal.
 * Proves the bound terminal actually received a paste — clipboard write alone does not.
 *
 * The adapter logs the padded textLength (post-smart-padding), so `minTextLength` is a
 * lower bound rather than an exact match. Pair with `assertClipboardWriteLogged` for the
 * exact content length on the first clipboard write.
 */
export const assertTerminalPasteLogged = (
  lines: string[],
  opts: TerminalPasteAssertionOptions,
): void => {
  const found = lines.some((line) => {
    const ctx = parseLogContext(line) as
      | (LoggingContext & { terminalName?: unknown; textLength?: unknown })
      | undefined;
    if (ctx?.fn !== TERMINAL_PASTE_FN || ctx.terminalName !== opts.terminalName) return false;
    if (opts.minTextLength === undefined) return true;
    return typeof ctx.textLength === 'number' && ctx.textLength >= opts.minTextLength;
  });
  const lengthSuffix =
    opts.minTextLength === undefined ? '' : ` and textLength >= ${opts.minTextLength}`;
  assert.ok(
    found,
    `Expected ${TERMINAL_PASTE_FN} log with terminalName="${opts.terminalName}"${lengthSuffix} but it was not found in ${lines.length} log lines`,
  );
};

interface FnAssertionOptions {
  fn: string;
}

/**
 * Assert that at least one log line has a parsed `fn` field strictly equal to `opts.fn`.
 * Use for presence-only checks where the function name alone is the contract.
 */
export const assertFnLogged = (lines: string[], opts: FnAssertionOptions): void => {
  const found = lines.some((line) => {
    const ctx = parseLogContext(line);
    return ctx?.fn === opts.fn;
  });
  assert.ok(
    found,
    `Expected log entry with fn="${opts.fn}" but it was not found in ${lines.length} log lines`,
  );
};

const PASTE_TO_AI_ASSISTANT_FN = 'VscodeAdapter.pasteClipboardToAiAssistant';

export const assertPasteCommandSucceeded = (lines: string[]): void => {
  const found = lines.some((line) => {
    const ctx = parseLogContext(line);
    if (ctx?.fn !== PASTE_TO_AI_ASSISTANT_FN) return false;
    return line.includes('Clipboard paste succeeded');
  });
  if (!found) {
    const dump = lines
      .map((line, i) => {
        const ctx = parseLogContext(line);
        const fn = ctx?.fn ?? '-';
        const msg = ctx?.message ?? line.slice(0, 120);
        return `  ${i + 1}. [${fn}] ${msg}`;
      })
      .join('\n');
    assert.ok(
      false,
      `Expected ${PASTE_TO_AI_ASSISTANT_FN} success log but it was not found in ${lines.length} log lines.\n\nCaptured lines:\n${dump}`,
    );
  }
};

export const assertCommandsPresent = (
  lines: string[],
  command: string,
  ...moreCommands: string[]
): void => {
  const allCommands = [command, ...moreCommands];
  const items = extractQuickPickItemsLogged(lines);
  assert.ok(
    items !== undefined,
    `Expected ${QUICK_PICK_FN} log entry with items but none found in ${lines.length} log lines`,
  );
  for (const cmd of allCommands) {
    assert.ok(
      items!.some((item) => item.command === cmd),
      `Expected command "${cmd}" to be present in QuickPick items but it was not found`,
    );
  }
};

/**
 * Assert that the first QuickPick item matches the expected shape exactly.
 * Use for position-dependent checks where ordering matters (e.g. "the first
 * item should be the unbound info item").
 */
export const assertQuickPickFirstItem = (
  lines: string[],
  expected: QuickPickItemExpectation,
): void => {
  const items = extractQuickPickItemsLogged(lines);
  assert.ok(
    items !== undefined,
    `Expected ${QUICK_PICK_FN} log entry with items but none found in ${lines.length} log lines`,
  );
  assert.deepStrictEqual(items[0], expected);
};

/**
 * Assert that the last N QuickPick items match the expected list in exact order.
 * Use when the middle of the menu varies by environment (e.g. destination
 * picker items) but the trailing items are known and their order matters.
 */
export const assertQuickPickTrailingItems = (
  lines: string[],
  expectedItems: QuickPickItemExpectation[],
): void => {
  const items = extractQuickPickItemsLogged(lines);
  assert.ok(
    items !== undefined,
    `Expected ${QUICK_PICK_FN} log entry with items but none found in ${lines.length} log lines`,
  );
  assert.deepStrictEqual(items.slice(-expectedItems.length), expectedItems);
};

/**
 * Assert that the QuickPick contains items matching every field in each
 * given expectation. Only the fields present on the expectation are checked —
 * items may carry additional fields (itemCount, options, test-status metadata
 * from projectTestStatusFields) that are ignored. This makes it a partial match
 * rather than a full deepStrictEqual.
 *
 * Field comparison uses strict equality (===). All fields on
 * QuickPickItemExpectation are primitives (string, number, undefined), so this
 * is equivalent to deepStrictEqual per field.
 */
export const assertQuickPickContains = (
  lines: string[],
  first: QuickPickItemExpectation,
  ...more: QuickPickItemExpectation[]
): void => {
  const items = extractQuickPickItemsLogged(lines);
  assert.ok(
    items !== undefined,
    `Expected ${QUICK_PICK_FN} log entry with items but none found in ${lines.length} log lines`,
  );
  for (const expected of [first, ...more]) {
    const match = items.some((item) =>
      Object.entries(expected).every(
        ([key, value]) => (item as Record<string, unknown>)[key] === value,
      ),
    );
    assert.ok(match, `Expected picker to contain item matching ${JSON.stringify(expected)}`);
  }
};

export const assertCommandsAbsent = (
  lines: string[],
  command: string,
  ...moreCommands: string[]
): void => {
  const allCommands = [command, ...moreCommands];
  const items = extractQuickPickItemsLogged(lines);
  assert.ok(
    items !== undefined,
    `Expected ${QUICK_PICK_FN} log entry with items but none found in ${lines.length} log lines`,
  );
  for (const cmd of allCommands) {
    assert.strictEqual(
      items!.find((item) => item.command === cmd),
      undefined,
      `Expected command "${cmd}" to be absent from QuickPick items but it was found`,
    );
  }
};

const CLIPBOARD_WRITE_FN = 'VscodeAdapter.writeTextToClipboard';

interface ClipboardWriteAssertionOptions {
  textLength: number;
}

/**
 * Assert that `writeTextToClipboard` logged with the expected textLength.
 * NOTE: The adapter only logs the length, not the content — this is a sanity check,
 * not a content assertion. Pair with a content-bearing log (e.g., FilePathPaster.pasteFilePath's
 * `filePath` field) when you need to prove WHAT was written.
 */
export const assertClipboardWriteLogged = (
  lines: string[],
  opts: ClipboardWriteAssertionOptions,
): void => {
  const found = lines.some((line) => {
    const ctx = parseLogContext(line) as (LoggingContext & { textLength?: unknown }) | undefined;
    return ctx?.fn === CLIPBOARD_WRITE_FN && ctx.textLength === opts.textLength;
  });
  assert.ok(
    found,
    `Expected ${CLIPBOARD_WRITE_FN} log with textLength=${opts.textLength} but it was not found in ${lines.length} log lines`,
  );
};

/**
 * Assert that NO `writeTextToClipboard` log was emitted.
 * Use to prove clipboard was not touched during error paths.
 */
export const assertNoClipboardWriteLogged = (lines: string[]): void => {
  assert.ok(
    !lines.some((line) => parseLogContext(line)?.fn === CLIPBOARD_WRITE_FN),
    `Expected no ${CLIPBOARD_WRITE_FN} log but one was found in ${lines.length} log lines`,
  );
};
