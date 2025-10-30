import { LoggingContext } from './LoggingContext';

/**
 * Logger interface that allows for logging with context; it has been inspired by
 * the pattern used in github.com/Octav-Labs/sonarwatch-portfolio and enforces
 * the use of context for logging.
 *
 * As opposed to concrete implementations, this file only defines an interface
 * that the core modules can use to log messages. The actual logging implementation
 * is provided by the consuming application (e.g., VSCode extension).
 */
export interface Logger {
  debug(ctx: LoggingContext, message: string): void;
  info(ctx: LoggingContext, message: string): void;
  warn(ctx: LoggingContext, message: string): void;
  error(ctx: LoggingContext, message: string): void;
}

