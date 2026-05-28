import type * as vscode from 'vscode';

import type { PasteDestination } from '../destinations/PasteDestination';

import type { MessageCode } from './MessageCode';
import type { PasteContentType } from './PasteContentType';
import type { SelfPastePolicy } from './SelfPastePolicy';

/**
 * Options for send operations through SendRouter.
 */
export interface SendOptions<T> {
  control: {
    contentType: PasteContentType;
  };
  content: {
    clipboard: string;
    send: T;
    sourceUri?: vscode.Uri;
    sourceViewColumn?: vscode.ViewColumn;
  };
  strategies: {
    sendFn: (content: T) => Promise<boolean>;
    isEligibleFn: (destination: PasteDestination, content: T) => Promise<boolean>;
  };
  /** MessageCode for the content type name (e.g., CONTENT_NAME_RANGELINK) */
  contentNameCode: MessageCode;
  /** Function name for internal logging context */
  fnName: string;
  /** Self-paste blocking policy for text editor destinations. Omit when source is not an editor (e.g. terminal). */
  selfPastePolicy?: SelfPastePolicy;
  /** Whether to write clipboard before blocking on self-paste (R-L, R-F: true; R-V: false) */
  writeClipboardOnSelfPasteBlock?: boolean;
}
