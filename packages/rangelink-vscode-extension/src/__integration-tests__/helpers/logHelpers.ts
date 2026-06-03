import assert from 'node:assert';
import { Console } from 'node:console';

import { getLogCapture } from './getLogCapture';

const nodeConsole = new Console(process.stdout, process.stderr);

export type SmartPadMode = 'both' | 'before' | 'after';

export type SmartPadOptions = { smartPad?: SmartPadMode };

export const createLogger = (suiteName: string): ((msg: string) => void) => {
  const prefix = `[RL-integ:${suiteName}]`;
  return (msg: string) => nodeConsole.log(`${prefix} ${msg}`);
};

/**
 * Extract the generated link from the "Sending link to destination" log line.
 * Returns the `formattedLink.link` value, or undefined if the log line is
 * missing or the link field cannot be parsed.
 */
export const extractSentLink = (lines: string[]): string | undefined => {
  const sendingLog = lines.find((l) => l.includes('Sending link to destination'));
  if (!sendingLog) return undefined;
  const linkMatch = sendingLog.match(/"link":"([^"]+)"/);
  return linkMatch?.[1];
};

/**
 * Extract the generated link from the "Generated link:" log line.
 * This log fires for ALL link generation paths (R-L, R-C, R-P) — not just
 * send-to-destination. Returns the full link string (path + anchor), or
 * undefined if the log line is missing or the link cannot be parsed.
 *
 * When `smartPad` is set, the returned link is space-padded to match the
 * clipboard/terminal content produced by the smartPadding settings. Tests
 * that assert clipboard or terminal content against the generated link
 * should use `{ smartPad: 'both' }` to avoid manual wrapping at each
 * call site.
 */
export const extractGeneratedLink = (
  lines: string[],
  options?: SmartPadOptions,
): string | undefined => {
  const generatedLog = lines.find((l) => l.includes('Generated link:'));
  if (!generatedLog) return undefined;
  const linkMatch = generatedLog.match(/"link":"([^"]+)"/);
  const link = linkMatch?.[1];
  if (!link || !options?.smartPad) return link;

  const { smartPad } = options;
  if (smartPad === 'both') return ` ${link} `;
  if (smartPad === 'before') return ` ${link}`;
  return `${link} `;
};

export const getGeneratedLink = (marker: string, options?: SmartPadOptions): string => {
  const lines = getLogCapture().getLinesSince(marker);
  const link = extractGeneratedLink(lines, options);
  assert.ok(link, 'Expected "Generated link:" log line');
  return link!;
};

export const assertLogContains = (marker: string, substring: string, context?: string): void => {
  const lines = getLogCapture().getLinesSince(marker);
  const found = lines.find((l) => l.includes(substring));
  assert.ok(found, context ?? `Expected log containing "${substring}"`);
};
