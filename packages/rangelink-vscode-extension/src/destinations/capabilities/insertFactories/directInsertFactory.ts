import type { Logger } from 'barebone-logger';

import type { VscodeAdapter } from '../../../ide/vscode/VscodeAdapter';
import { interpolateArgs } from '../../../utils';

import type { InsertFactory } from './InsertFactory';

/**
 * Normalized insert command entry — plain string commands are normalized
 * to this shape during config parsing.
 */
export interface InsertCommandEntry {
  command: string;
  args?: unknown;
}

/**
 * InsertFactory for Tier 1 direct-insert destinations.
 *
 * Calls the extension's command directly with the link text as an argument.
 * Clipboard is never touched — the text is delivered via executeCommand args.
 * Plain-string entries pass text as the first positional argument.
 * Object entries use ${content} template interpolation in the args structure.
 */
export class DirectInsertFactory implements InsertFactory<void> {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly insertCommands: readonly InsertCommandEntry[],
    private readonly logger: Logger,
  ) {}

  forTarget(): (text: string) => Promise<boolean> {
    return async (text: string): Promise<boolean> => {
      const fn = 'DirectInsertFactory.insert';

      for (const entry of this.insertCommands) {
        try {
          if (entry.args === undefined) {
            await this.ideAdapter.executeCommand(entry.command, text);
          } else {
            const interpolated = interpolateArgs(entry.args, text);
            const argsArray = Array.isArray(interpolated) ? interpolated : [interpolated];
            await this.ideAdapter.executeCommand(entry.command, ...argsArray);
          }
          this.logger.info({ fn, command: entry.command }, 'Direct insert succeeded');
          return true;
        } catch (error) {
          this.logger.debug(
            { fn, command: entry.command, error },
            'Direct insert command failed, trying next',
          );
        }
      }

      this.logger.info({ fn, allCommandsFailed: true }, 'All direct insert commands failed');
      return false;
    };
  }
}
