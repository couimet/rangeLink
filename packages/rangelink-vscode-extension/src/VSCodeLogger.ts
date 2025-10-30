import * as vscode from 'vscode';

import { Logger, LoggingContext } from 'rangelink-core-ts';

/**
 * VSCode implementation of the Logger interface.
 * Bridges the core logging interface to VSCode's OutputChannel.
 */
export class VSCodeLogger implements Logger {
  constructor(private readonly outputChannel: vscode.OutputChannel) {}

  debug(ctx: LoggingContext, message: string): void {
    this.log('DEBUG', ctx, message);
  }

  info(ctx: LoggingContext, message: string): void {
    this.log('INFO', ctx, message);
  }

  warn(ctx: LoggingContext, message: string): void {
    this.log('WARNING', ctx, message);
  }

  error(ctx: LoggingContext, message: string): void {
    this.log('ERROR', ctx, message);
  }

  private log(level: string, ctx: LoggingContext, message: string): void {
    const contextStr = JSON.stringify(ctx);
    this.outputChannel.appendLine(`[${level}] ${contextStr} ${message}`);
  }
}

