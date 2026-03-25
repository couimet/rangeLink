import { Console } from 'node:console';

const nodeConsole = new Console(process.stdout, process.stderr);

export const createLogger = (suiteName: string): ((msg: string) => void) => {
  const prefix = `[RL-integ:${suiteName}]`;
  return (msg: string) => nodeConsole.log(`${prefix} ${msg}`);
};
