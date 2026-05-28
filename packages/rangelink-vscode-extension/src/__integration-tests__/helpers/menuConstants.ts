import * as vscode from 'vscode';

import {
  CMD_GO_TO_RANGELINK,
  CMD_JUMP_TO_DESTINATION,
  CMD_SHOW_VERSION,
  CMD_UNBIND_DESTINATION,
} from '../../constants/commandIds';

export const MENU_ITEM_GO_TO_LINK = {
  label: '$(link-external) Go to Link',
  itemKind: 'command',
  command: CMD_GO_TO_RANGELINK,
} as const;

export const MENU_ITEM_GROUP_AI_ASSISTANTS = {
  label: 'AI Assistants',
  kind: vscode.QuickPickItemKind.Separator,
} as const;

export const MENU_ITEM_GROUP_FILES = {
  label: 'Files',
  kind: vscode.QuickPickItemKind.Separator,
} as const;

export const MENU_ITEM_GROUP_TERMINALS = {
  label: 'Terminals',
  kind: vscode.QuickPickItemKind.Separator,
} as const;

export const MENU_ITEM_SEPARATOR = {
  label: '',
  kind: vscode.QuickPickItemKind.Separator,
} as const;

export const MENU_ITEM_UNBIND = {
  label: '$(close) Unbind Destination',
  itemKind: 'command',
  command: CMD_UNBIND_DESTINATION,
} as const;

export const MENU_ITEM_UNBOUND = {
  label: 'No bound destination. Choose below to bind:',
  itemKind: 'info',
} as const;

export const MENU_ITEM_VERSION_INFO = {
  label: '$(info) Show Version Info',
  itemKind: 'command',
  command: CMD_SHOW_VERSION,
} as const;

export const buildJumpMenuItem = (description: string) =>
  ({
    label: '$(arrow-right) Jump to Bound Destination',
    description,
    itemKind: 'command',
    command: CMD_JUMP_TO_DESTINATION,
  }) as const;
