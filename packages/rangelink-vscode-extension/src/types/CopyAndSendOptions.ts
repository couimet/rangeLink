import type * as vscode from 'vscode';

import type { PasteDestination } from '../destinations/PasteDestination';

import type { DestinationBehavior } from './DestinationBehavior';
import type { PasteContentType } from './PasteContentType';

/**
 * Options for copyAndSendToDestination, grouped by concern.
 */
export interface CopyAndSendOptions<T> {
  control: {
    contentType: PasteContentType;
    destinationBehavior: DestinationBehavior;
  };
  content: {
    clipboard: string;
    send: T;
    sourceUri?: vscode.Uri;
  };
  strategies: {
    sendFn: (content: T, basicStatusMessage: string) => Promise<boolean>;
    isEligibleFn: (destination: PasteDestination, content: T) => Promise<boolean>;
  };
  /** User-facing name for status bar messages (e.g., "RangeLink", "Selected text") */
  contentName: string;
  /** Function name for internal logging context */
  fnName: string;
}
