/**
 * Minimal interface for IDE adapters that provide clipboard access.
 * Decouples clipboard preservation logic from concrete VscodeAdapter.
 */
export interface ClipboardProvider {
  readTextFromClipboard(): Promise<string>;
  writeTextToClipboard(text: string): Promise<void>;
}
