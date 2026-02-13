import * as vscode from 'vscode';

import type { BindableQuickPickItem, CommandQuickPickItem, InfoQuickPickItem } from '../../types';
import { isSelectableQuickPickItem } from '../isSelectableQuickPickItem';

describe('isSelectableQuickPickItem', () => {
  it('returns true for a bindable QuickPickItem', () => {
    const item: BindableQuickPickItem = {
      label: 'Claude Code Chat',
      displayName: 'Claude Code Chat',
      itemKind: 'bindable',
      bindOptions: { kind: 'claude-code' },
    };

    expect(isSelectableQuickPickItem(item)).toBe(true);
  });

  it('returns true for a command QuickPickItem', () => {
    const item: CommandQuickPickItem = {
      label: '$(link-external) Go to Link',
      itemKind: 'command',
      command: 'rangelink.goToRangeLink',
    };

    expect(isSelectableQuickPickItem(item)).toBe(true);
  });

  it('returns true for an info QuickPickItem (non-actionable but has itemKind for switch dispatch)', () => {
    const item: InfoQuickPickItem = {
      label: 'No destinations available',
      itemKind: 'info',
    };

    expect(isSelectableQuickPickItem(item)).toBe(true);
  });

  it('returns false for a separator QuickPickItem', () => {
    const item: vscode.QuickPickItem = {
      label: 'AI Assistants',
      kind: vscode.QuickPickItemKind.Separator,
    };

    expect(isSelectableQuickPickItem(item)).toBe(false);
  });

  it('returns false for undefined (user cancelled)', () => {
    expect(isSelectableQuickPickItem(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isSelectableQuickPickItem(null as unknown as vscode.QuickPickItem)).toBe(false);
  });

  it('returns false for a plain QuickPickItem without itemKind', () => {
    const item: vscode.QuickPickItem = {
      label: 'Some label',
    };

    expect(isSelectableQuickPickItem(item)).toBe(false);
  });
});
