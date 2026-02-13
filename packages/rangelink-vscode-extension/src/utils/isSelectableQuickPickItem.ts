import type * as vscode from 'vscode';

import { PICKER_ITEM_KINDS, type PickerItemKind } from '../types/QuickPickTypes';

/**
 * Type guard that narrows a QuickPickItem to a selectable RangeLink item.
 *
 * VSCode QuickPick menus mix selectable items (with `itemKind` discriminator)
 * and non-selectable separators (plain `vscode.QuickPickItem`). This guard
 * handles the undefined case from `showQuickPick` (user cancelled) and
 * distinguishes selectable items from separators by validating both key
 * existence and value against the known PICKER_ITEM_KINDS.
 *
 * @param item - The QuickPickItem returned from showQuickPick, or undefined if cancelled
 * @returns True if the item exists and has a valid `itemKind` discriminator
 */
export const isSelectableQuickPickItem = <
  T extends vscode.QuickPickItem & { itemKind: PickerItemKind },
>(
  item: vscode.QuickPickItem | undefined,
): item is T => !!item && 'itemKind' in item && PICKER_ITEM_KINDS.includes((item as T).itemKind);
