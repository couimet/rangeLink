import type * as vscode from 'vscode';

import { RangeLinkExtensionError } from './errors/RangeLinkExtensionError';
import { RangeLinkExtensionErrorCodes } from './errors/RangeLinkExtensionErrorCodes';

/**
 * Environment variable that enables in-memory log capture.
 * Set by the integration test runner before launching VS Code.
 * When absent or not 'true', LogCapture is a transparent proxy with zero overhead.
 */
const ENV_CAPTURE_LOGS = 'RANGELINK_CAPTURE_LOGS';

/**
 * Wraps an OutputChannel to optionally capture log lines in memory.
 *
 * In production: transparent proxy — appendLine() forwards to the channel, no storage.
 * Test-only methods (mark, getLinesSince, getAllLines, clear) throw LOG_CAPTURE_DISABLED
 * if called without RANGELINK_CAPTURE_LOGS=true — prevents silent misuse in production.
 *
 * In tests (RANGELINK_CAPTURE_LOGS=true): stores lines for assertion via mark()/getLinesSince().
 *
 * Accessible from integration tests via ext.exports.logCapture after activate() returns it.
 */
export class LogCapture {
  private readonly lines: string[] = [];
  private readonly markers = new Map<string, number>();
  private readonly captureEnabled: boolean;

  constructor(private readonly outputChannel: vscode.OutputChannel) {
    this.captureEnabled = process.env[ENV_CAPTURE_LOGS] === 'true';
  }

  /**
   * Proxy for OutputChannel.appendLine — always writes to the real channel.
   * Only stores in memory when capture is enabled (RANGELINK_CAPTURE_LOGS=true).
   */
  appendLine(value: string): void {
    this.outputChannel.appendLine(value);
    if (this.captureEnabled) {
      this.lines.push(value);
    }
  }

  /**
   * Record a named position in the captured lines array.
   * @throws RangeLinkExtensionError with LOG_CAPTURE_DISABLED when capture is not enabled
   */
  mark(id: string): void {
    this.enforceCaptureEnabled('mark');
    this.markers.set(id, this.lines.length);
  }

  /**
   * Return all lines captured after the named marker.
   * If the marker doesn't exist, returns all lines.
   * @throws RangeLinkExtensionError with LOG_CAPTURE_DISABLED when capture is not enabled
   */
  getLinesSince(marker: string): string[] {
    this.enforceCaptureEnabled('getLinesSince');
    const start = this.markers.get(marker) ?? 0;
    return this.lines.slice(start);
  }

  /**
   * Return all captured lines.
   * @throws RangeLinkExtensionError with LOG_CAPTURE_DISABLED when capture is not enabled
   */
  getAllLines(): string[] {
    this.enforceCaptureEnabled('getAllLines');
    return [...this.lines];
  }

  /**
   * Clear all captured lines and markers.
   * @throws RangeLinkExtensionError with LOG_CAPTURE_DISABLED when capture is not enabled
   */
  clear(): void {
    this.enforceCaptureEnabled('clear');
    this.lines.length = 0;
    this.markers.clear();
  }

  /**
   * Whether in-memory capture is active.
   */
  get isCapturing(): boolean {
    return this.captureEnabled;
  }

  private enforceCaptureEnabled(methodName: string): void {
    if (!this.captureEnabled) {
      throw new RangeLinkExtensionError({
        code: RangeLinkExtensionErrorCodes.LOG_CAPTURE_DISABLED,
        message: `LogCapture.${methodName}() called without RANGELINK_CAPTURE_LOGS=true — this method is for integration tests only`,
        functionName: `LogCapture.${methodName}`,
      });
    }
  }
}
