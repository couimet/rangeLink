/**
 * A logging context is a record of key-value pairs that can be used to add additional context to a log message.
 * The only required key is `fn`, which is the name of the function that is logging the message.
 */
export interface LoggingContext {
  fn: string;
  [key: string]: unknown;
}

