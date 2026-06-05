import type { Logger, LoggingContext } from 'barebone-logger';
import { RangeLinkError, RangeLinkErrorCodes, Result } from 'rangelink-core-ts';

import type { ConfigReader } from '../config/ConfigReader';
import { DEFAULT_CLIPBOARD_PRESERVE } from '../constants/settingDefaults';
import { SETTING_CLIPBOARD_PRESERVE } from '../constants/settingKeys';
import type { ClipboardProvider } from '../ide/ClipboardProvider';

/**
 * Central clipboard lifecycle management.
 *
 * Returns Result<T, RangeLinkError> for all public methods. Every
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
   * Save the current clipboard, run fn, then restore the original content.
   * Always saves/restores — no config gating.
   */
  async borrow<T>(fn: () => Promise<T>): Promise<Result<T, RangeLinkError>> {
    return this.withClipboardPipeline(fn, { fn: 'ClipboardService::borrow' });
  }

  /**
   * Save the current clipboard, write text to the clipboard, run fn
   * (which typically reads the clipboard via Cmd+V), then restore the
   * prior clipboard content.
   */
  async stage<T>(text: string, fn: () => Promise<T>): Promise<Result<T, RangeLinkError>> {
    return this.withClipboardPipeline(fn, { fn: 'ClipboardService::stage' }, { textToWrite: text });
  }

  /**
   * Config-gated clipboard preservation.
   *
   * When rangelink.clipboard.preserve is 'always': saves clipboard before
   * fn, restores afterward (unless shouldRestore returns false).
   * When 'never': calls fn directly with no clipboard interaction.
   */
  async preserve<T>(
    fn: () => Promise<T>,
    shouldRestore?: () => boolean,
  ): Promise<Result<T, RangeLinkError>> {
    const logCtx: LoggingContext = { fn: 'ClipboardService::preserve' };

    const mode = this.configReader.getWithDefault(
      SETTING_CLIPBOARD_PRESERVE,
      DEFAULT_CLIPBOARD_PRESERVE,
    );

    logCtx.mode = mode;

    if (mode === 'never') {
      this.logger.debug(logCtx, 'Preservation disabled');
      return this.executeFn(fn, logCtx);
    }

    return this.withClipboardPipeline(fn, logCtx, { shouldRestore });
  }

  private async withClipboardPipeline<T>(
    fn: () => Promise<T>,
    logCtx: LoggingContext,
    options?: {
      textToWrite?: string;
      shouldRestore?: () => boolean;
    },
  ): Promise<Result<T, RangeLinkError>> {
    const priorResult = await this.read(logCtx);
    if (!priorResult.success) return priorResult as unknown as Result<T, RangeLinkError>;

    if (options?.textToWrite !== undefined) {
      const writeResult = await this.write(options.textToWrite, logCtx);
      if (!writeResult.success) return writeResult as unknown as Result<T, RangeLinkError>;
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
   * Prefer {@link borrow} / {@link stage} / {@link preserve} for workflows
   * that need automatic save-restore. Use directly only when you need to
   * orchestrate save/restore manually.
   */
  async read(logCtxInput: LoggingContext): Promise<Result<string, RangeLinkError>> {
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
        new RangeLinkError({
          code: RangeLinkErrorCodes.CLIPBOARD_READ_FAILED,
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
   * Prefer {@link borrow} / {@link stage} / {@link preserve} for workflows
   * that need automatic save-restore. Use directly only when you need to
   * orchestrate save/restore manually.
   */
  async write(text: string, logCtxInput: LoggingContext): Promise<Result<void, RangeLinkError>> {
    const logCtx: LoggingContext = { ...logCtxInput, fn: `${logCtxInput.fn}::write` };

    try {
      await this.clipboard.writeTextToClipboard(text);
      this.logger.debug({ ...logCtx, textLength: text.length }, 'Clipboard write succeeded');
      return Result.ok(undefined);
    } catch (err) {
      this.logger.error({ ...logCtx, error: err }, 'Clipboard write failed');
      return Result.err(
        new RangeLinkError({
          code: RangeLinkErrorCodes.CLIPBOARD_STAGE_WRITE_FAILED,
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
  ): Promise<Result<T, RangeLinkError>> {
    try {
      return Result.ok(await fn());
    } catch (fnError) {
      this.logger.error({ ...logCtx, error: fnError }, 'Callback threw');
      return Result.err(
        new RangeLinkError({
          code: RangeLinkErrorCodes.CLIPBOARD_FN_EXECUTION_FAILED,
          message: 'The callback threw an error',
          functionName: logCtx.fn,
          details: { error: fnError },
        }),
      );
    }
  }

  private async restoreClipboard(prior: string, logCtxInput: LoggingContext): Promise<void> {
    const logCtx: LoggingContext = { ...logCtxInput, fn: `${logCtxInput.fn}::restoreClipboard` };

    try {
      await this.clipboard.writeTextToClipboard(prior);
      this.logger.debug({ ...logCtx, restoredLength: prior.length }, 'Clipboard restored');
    } catch (err) {
      this.logger.error({ ...logCtx, error: err }, 'Clipboard restoration failed');
    }
  }
}
