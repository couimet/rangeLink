/**
 * Configuration for the cold-start re-focus loop.
 *
 * When an AI assistant's chat panel is first opened (cold start), the Webview's
 * IPC clipboard reader may not be ready. The re-focus loop re-sends focus commands
 * at `intervalMs` ticks for up to `totalMs`, giving the panel time to initialize
 * before paste dispatch.
 */
export interface ColdRefocusConfig {
  /** Total duration of the re-focus window in milliseconds. */
  readonly totalMs: number;
  /** Interval between successive focus-command sends within the window. */
  readonly intervalMs: number;
}
