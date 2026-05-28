export interface ClipboardReader {
  readTextFromClipboard(): Promise<string>;
}

export interface ClipboardWriter {
  writeTextToClipboard(text: string): Promise<void>;
}

/**
 * Combined clipboard interface for components that need both read and write.
 */
export interface ClipboardProvider extends ClipboardReader, ClipboardWriter {}
