import { Logger } from './Logger';
import { LoggingContext } from './LoggingContext';

/**
 * No-operation logger implementation that discards all log messages.
 * This is the default logger used by core until a real logger is provided.
 */
export class NoOpLogger implements Logger {
  debug(_ctx: LoggingContext, _message: string): void {
    // No operation
  }

  info(_ctx: LoggingContext, _message: string): void {
    // No operation
  }

  warn(_ctx: LoggingContext, _message: string): void {
    // No operation
  }

  error(_ctx: LoggingContext, _message: string): void {
    // No operation
  }
}

