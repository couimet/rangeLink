import type * as vscode from 'vscode';

import type { NonBindableReason } from '../../types';

import { isRangeLinkTestFixture } from './testFixtureRegistry';

/**
 * Result of classifying a terminal for the destination picker.
 *
 * - `{ visible: false }` — the terminal should be hidden from the picker
 *   entirely (process exited, internal IDE terminal).
 * - `{ visible: true }` — the terminal is bindable and should appear normally.
 * - `{ visible: true, nonBindableReason }` — the terminal appears in the
 *   picker but cannot be bound to; the reason drives the disabled-style
 *   rendering and selection rejection.
 */
export type TerminalBindingClassification =
  | { readonly visible: false }
  | { readonly visible: true; readonly nonBindableReason?: NonBindableReason };

const isHiddenFromUser = (terminal: vscode.Terminal): boolean =>
  'hideFromUser' in terminal.creationOptions &&
  (terminal.creationOptions as vscode.TerminalOptions).hideFromUser === true;

const isExtensionManaged = (terminal: vscode.Terminal): boolean =>
  'pty' in terminal.creationOptions &&
  (terminal.creationOptions as vscode.ExtensionTerminalOptions).pty != null;

/**
 * Classify whether a terminal belongs in the destination picker, and if so
 * whether it can be bound to.
 *
 * A terminal is rejected outright (`visible: false`) when:
 * - It is null/undefined.
 * - Its process has exited (`exitStatus !== undefined`).
 * - It is marked `hideFromUser` (internal IDE-managed terminals).
 *
 * A terminal is shown but not bindable (`visible: true, nonBindableReason:
 * 'extension-managed'`) when its `creationOptions` carries a `pty` field. The
 * `Pseudoterminal` API is the only structurally stable signal VS Code exposes
 * for "this terminal is owned by an extension and does not accept arbitrary
 * shell input."
 */
export const classifyTerminalForBinding = (
  terminal: vscode.Terminal | null | undefined,
): TerminalBindingClassification => {
  if (terminal == null) return { visible: false };
  if (terminal.exitStatus !== undefined) return { visible: false };
  if (isRangeLinkTestFixture(terminal)) return { visible: true };
  if (isHiddenFromUser(terminal)) return { visible: false };
  if (isExtensionManaged(terminal)) {
    return { visible: true, nonBindableReason: 'extension-managed' };
  }
  return { visible: true };
};
