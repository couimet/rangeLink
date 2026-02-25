import * as vscode from 'vscode';

import type { FileBindableQuickPickItem } from '../../types';
import { MessageCode } from '../../types';
import { formatMessage } from '../../utils';

const makeSeparator = (label: string): vscode.QuickPickItem => ({
  label,
  kind: vscode.QuickPickItemKind.Separator,
});

/**
 * Build sectioned QuickPick items for the secondary file picker.
 *
 * Organizes items into:
 * - "Active Files" section: files where `isCurrentInGroup` is true
 * - Per-tab-group sections ("Tab Group N"): remaining files grouped by viewColumn
 *
 * Section separators are omitted for empty sections.
 * Items within each section preserve input order.
 *
 * @param items - Pre-built file picker items (from getAllFileItems())
 * @returns Interleaved array of separator items and file items
 */
export const buildFilePickerItems = (
  items: readonly FileBindableQuickPickItem[],
): (FileBindableQuickPickItem | vscode.QuickPickItem)[] => {
  const result: (FileBindableQuickPickItem | vscode.QuickPickItem)[] = [];

  const activeFiles = items.filter((item) => item.fileInfo.isCurrentInGroup);
  const remainingFiles = items.filter((item) => !item.fileInfo.isCurrentInGroup);

  if (activeFiles.length > 0) {
    result.push(makeSeparator(formatMessage(MessageCode.FILE_PICKER_GROUP_ACTIVE_FILES)));
    result.push(...activeFiles);
  }

  const byViewColumn = new Map<number, FileBindableQuickPickItem[]>();
  for (const item of remainingFiles) {
    const vc = item.fileInfo.viewColumn;
    const group = byViewColumn.get(vc);
    if (group !== undefined) {
      group.push(item);
    } else {
      byViewColumn.set(vc, [item]);
    }
  }

  const sortedViewColumns = [...byViewColumn.keys()].sort((a, b) => a - b);
  for (const vc of sortedViewColumns) {
    result.push(makeSeparator(formatMessage(MessageCode.FILE_PICKER_GROUP_FORMAT, { index: vc })));
    result.push(...(byViewColumn.get(vc) as FileBindableQuickPickItem[]));
  }

  return result;
};
