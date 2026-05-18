import { Console } from 'node:console';

const nodeConsole = new Console(process.stdout, process.stderr);

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
 */
export const extractGeneratedLink = (lines: string[]): string | undefined => {
  const generatedLog = lines.find((l) => l.includes('Generated link:'));
  if (!generatedLog) return undefined;
  const linkMatch = generatedLog.match(/"link":"([^"]+)"/);
  return linkMatch?.[1];
};
