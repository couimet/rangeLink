import type { Logger, LoggingContext } from 'barebone-logger';

/**
 * Minimal interface for log output — satisfied by both vscode.OutputChannel and LogCapture.
 */
export interface LogSink {
  appendLine(value: string): void;
}

/**
 * VSCode implementation of the Logger interface.
 * Bridges the core logging interface to any LogSink (OutputChannel, LogCapture, etc.).
 */
export class VSCodeLogger implements Logger {
  constructor(private readonly sink: LogSink) {}

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
    this.sink.appendLine(`[${level}] ${contextStr} ${message}`);
  }
}
