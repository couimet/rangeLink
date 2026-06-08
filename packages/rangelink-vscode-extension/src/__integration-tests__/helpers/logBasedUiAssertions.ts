import assert from 'node:assert';

import type { LoggingContext } from 'barebone-logger';

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants (sorted alphabetically)
// ---------------------------------------------------------------------------

const CLIPBOARD_WRITE_FN = 'VscodeAdapter.writeTextToClipboard';
const EXECUTE_COMMAND_FN = 'VscodeAdapter.executeCommand';
const FILE_PATH_FN = 'FilePathPaster.pasteFilePath';
const INPUT_BOX_FN = 'VscodeAdapter.showInputBox';
const PASTE_TO_AI_ASSISTANT_FN = 'VscodeAdapter.pasteClipboardToAiAssistant';
const QUICK_PICK_FN = 'VscodeAdapter.showQuickPick';
const TERMINAL_PASTE_FN = 'VscodeAdapter.pasteTextToTerminalViaClipboard';

// ---------------------------------------------------------------------------
// Types and interfaces (sorted alphabetically)
// ---------------------------------------------------------------------------

interface ClipboardWriteAssertionOptions {
  textLength: number;
}

interface FilePathAssertionOptions {
  pathFormat: 'absolute' | 'workspace-relative';
  uriSource: 'context-menu' | 'command-palette';
  filePath: string;
}

interface FnAssertionOptions {
  fn: string;
}

interface InputBoxAssertionOptions {
  prompt: string;
  placeHolder: string;
}

interface QuickPickItemExpectation {
  label?: string;
  description?: string;
  detail?: string;
  kind?: number;
  itemKind?: string;
  command?: string;
  displayName?: string;
}

interface SuppressionAssertionOptions {
  fn: string;
  suppressedMessage: string;
}

interface TerminalPasteAssertionOptions {
  terminalName: string;
  minTextLength?: number;
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

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

export const getQuickPickLines = (lines: string[]): string[] =>
  lines.filter((line) => {
    const ctx = parseLogContext(line);
    return ctx?.fn === QUICK_PICK_FN && Array.isArray(ctx.items);
  });

export const parseQuickPickItemsFromLogLine = (logLine: string): Record<string, unknown>[] => {
  const ctx = parseLogContext(logLine);
  if (ctx === undefined || !Array.isArray(ctx.items)) {
    throw new Error('Log line does not contain a showQuickPick items payload');
  }
  return ctx.items as Record<string, unknown>[];
};

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

export const assertNoClipboardWriteLogged = (lines: string[]): void => {
  assert.ok(
    !lines.some((line) => parseLogContext(line)?.fn === CLIPBOARD_WRITE_FN),
    `Expected no ${CLIPBOARD_WRITE_FN} log but one was found in ${lines.length} log lines`,
  );
};
