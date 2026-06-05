import type { Logger, LoggingContext } from 'barebone-logger';
import { Result } from 'rangelink-core-ts';

import type { ConfigReader } from '../config/ConfigReader';
import { DEFAULT_CLIPBOARD_PRESERVE } from '../constants/settingDefaults';
import { SETTING_CLIPBOARD_PRESERVE } from '../constants/settingKeys';
import { RangeLinkExtensionError } from '../errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from '../errors/RangeLinkExtensionErrorCodes';
import type { ClipboardProvider } from '../ide/ClipboardProvider';

/**
 * Central clipboard lifecycle management.
 *
 * Returns Result<T, RangeLinkExtensionError> for all public methods. Every
 * bail-out logs before returning — private helpers own both the log and
 * the error Result, so callers never need to log clipboard failures.
 */
export class ClipboardService {
  constructor(
    private readonly clipboard: ClipboardProvider,
    private readonly configReader: ConfigReader,
    private readonly logger: Logger,
  ) {}

  /**
   * Write content to the clipboard, run fn (which typically reads the
   * clipboard back — e.g. a terminal paste command), then restore the
   * prior clipboard content.
   *
   * The clipboard acts as a transport: stage loads it with content,
   * the callback consumes it, and the original value is restored afterward.
   */
  async stage<T>(text: string, fn: () => Promise<T>): Promise<Result<T, RangeLinkExtensionError>> {
    return this.withClipboardPipeline(fn, { fn: 'ClipboardService::stage' }, { textToWrite: text });
  }

  /**
   * Config-gated clipboard transport.
   *
   * When rangelink.clipboard.preserve is 'always': saves clipboard before
   * fn, restores afterward (unless shouldRestore returns false).
   * When 'never': calls fn directly with no clipboard interaction.
   *
   * The clipboard is a route, not a destination — content passes through
   * it on the way to the bound destination. This method is the single
   * entry point for all R-* command send flows via SendRouter.
   */
  async route<T>(
    fn: () => Promise<T>,
    shouldRestore?: () => boolean,
  ): Promise<Result<T, RangeLinkExtensionError>> {
    const logCtx: LoggingContext = { fn: 'ClipboardService::route' };

    const mode = this.configReader.getWithDefault(
      SETTING_CLIPBOARD_PRESERVE,
      DEFAULT_CLIPBOARD_PRESERVE,
    );

    logCtx.mode = mode;

    if (mode === 'never') {
      this.logger.debug(logCtx, 'Clipboard preservation disabled; executing directly');
      return this.executeFn(fn, logCtx);
    }

    return this.withClipboardPipeline(fn, logCtx, { shouldRestore });
  }

  /**
   * Capture clipboard content produced by an external writer, optionally
   * threading the producer's return value back to the caller.
   *
   * Saves the prior clipboard, runs producer (which writes to clipboard
   * externally — e.g. a VS Code terminal copy command), reads the result,
   * restores the prior value, and returns both the captured text and the
   * producer's return value.
   *
   * Restoration always happens in a finally block regardless of producer
   * or read outcome.
   */
  async capture<T>(
    producer: () => Promise<T>,
    logCtxInput: LoggingContext,
  ): Promise<Result<{ clipboard: string; produced: T }, RangeLinkExtensionError>> {
    const logCtx: LoggingContext = { ...logCtxInput, fn: `${logCtxInput.fn}::capture` };

    const priorResult = await this.read(logCtx);
    if (!priorResult.success)
      return priorResult as unknown as Result<
        { clipboard: string; produced: T },
        RangeLinkExtensionError
      >;

    try {
      let produced: T;
      try {
        produced = await producer();
      } catch (producerError) {
        this.logger.error(
          { ...logCtx, error: producerError },
          'Producer callback threw during capture',
        );
        return Result.err(
          new RangeLinkExtensionError({
            code: RangeLinkExtensionErrorCodes.CLIPBOARD_CAPTURE_EXECUTION_FAILED,
            message: 'The producer callback threw an error',
            functionName: logCtx.fn,
            details: { error: producerError },
          }),
        );
      }

      const readResult = await this.read(logCtx);
      if (!readResult.success)
        return readResult as unknown as Result<
          { clipboard: string; produced: T },
          RangeLinkExtensionError
        >;

      return Result.ok({ clipboard: readResult.value, produced });
    } finally {
      await this.restoreClipboard(priorResult.value, logCtx);
    }
  }

  private async withClipboardPipeline<T>(
    fn: () => Promise<T>,
    logCtx: LoggingContext,
    options?: {
      textToWrite?: string;
      shouldRestore?: () => boolean;
    },
  ): Promise<Result<T, RangeLinkExtensionError>> {
    const priorResult = await this.read(logCtx);
    if (!priorResult.success) return priorResult as unknown as Result<T, RangeLinkExtensionError>;

    if (options?.textToWrite !== undefined) {
      const writeResult = await this.write(options.textToWrite, logCtx);
      if (!writeResult.success) return writeResult as unknown as Result<T, RangeLinkExtensionError>;
    }

    const fnResult = await this.executeFn(fn, logCtx);

    if (options?.shouldRestore !== undefined && !options.shouldRestore()) {
      this.logger.debug(logCtx, 'Clipboard restoration skipped');
      return fnResult;
    }

    // Should clipboard restore fail, we rely on the restoreClipboard() method to log problem that happened.
    // We do not care about restoreClipboard()'s return value in our context because fn() has already executed.
    // Even if fn() failed, we still want to return its result (as opposed to restoreClipboard()'s result)
    await this.restoreClipboard(priorResult.value, logCtx);

    return fnResult;
  }

  /**
   * Primitive clipboard read operation.
   *
   * Prefer {@link stage} / {@link route} for workflows that need automatic
   * save-restore. Use directly only when you need to orchestrate
   * save/restore manually.
   */
  async read(logCtxInput: LoggingContext): Promise<Result<string, RangeLinkExtensionError>> {
    const logCtx: LoggingContext = { ...logCtxInput, fn: `${logCtxInput.fn}::read` };

    try {
      const text = await this.clipboard.readTextFromClipboard();
      this.logger.debug(
        { ...logCtx, priorLength: text.length },
        'Clipboard current value read and saved',
      );
      return Result.ok(text);
    } catch (err) {
      this.logger.error({ ...logCtx, error: err }, 'Clipboard read failed');
      return Result.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.CLIPBOARD_READ_FAILED,
          message: 'Failed to read clipboard',
          functionName: logCtx.fn,
          details: { error: err },
        }),
      );
    }
  }

  /**
   * Primitive clipboard write operation.
   *
   * Prefer {@link stage} / {@link route} for workflows that need automatic
   * save-restore. Use directly only when you need to orchestrate
   * save/restore manually.
   */
  async write(
    text: string,
    logCtxInput: LoggingContext,
  ): Promise<Result<void, RangeLinkExtensionError>> {
    const logCtx: LoggingContext = { ...logCtxInput, fn: `${logCtxInput.fn}::write` };

    try {
      await this.clipboard.writeTextToClipboard(text);
      this.logger.debug({ ...logCtx, textLength: text.length }, 'Clipboard write succeeded');
      return Result.ok(undefined);
    } catch (err) {
      this.logger.error({ ...logCtx, error: err }, 'Clipboard write failed');
      return Result.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.CLIPBOARD_STAGE_WRITE_FAILED,
          message: 'Failed to write text to clipboard',
          functionName: logCtx.fn,
          details: { error: err },
        }),
      );
    }
  }

  private async executeFn<T>(
    fn: () => Promise<T>,
    logCtx: LoggingContext,
  ): Promise<Result<T, RangeLinkExtensionError>> {
    try {
      return Result.ok(await fn());
    } catch (fnError) {
      this.logger.error({ ...logCtx, error: fnError }, 'Callback threw');
      return Result.err(
        new RangeLinkExtensionError({
          code: RangeLinkExtensionErrorCodes.CLIPBOARD_FN_EXECUTION_FAILED,
          message: 'The callback threw an error',
          functionName: logCtx.fn,
          details: { error: fnError },
        }),
      );
    }
  }

  /**
   * Best-effort clipboard restore. Failures are logged but not thrown —
   * restoration is never the primary operation, so callers need not check
   * a return value.
   */
  async restoreClipboard(prior: string, logCtxInput: LoggingContext): Promise<void> {
    const logCtx: LoggingContext = { ...logCtxInput, fn: `${logCtxInput.fn}::restoreClipboard` };

    try {
      await this.clipboard.writeTextToClipboard(prior);
      this.logger.debug({ ...logCtx, restoredLength: prior.length }, 'Clipboard restored');
    } catch (err) {
      this.logger.error({ ...logCtx, error: err }, 'Clipboard restoration failed');
    }
  }
}
