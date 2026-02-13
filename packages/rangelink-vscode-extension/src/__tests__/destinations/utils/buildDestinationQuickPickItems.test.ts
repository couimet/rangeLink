import * as vscode from 'vscode';

import {
  buildDestinationQuickPickItems,
  DESTINATION_PICKER_SEQUENCE,
} from '../../../destinations/utils/buildDestinationQuickPickItems';
import type { GroupedDestinationItems } from '../../../types';

const separator = (label: string): vscode.QuickPickItem => ({
  label,
  kind: vscode.QuickPickItemKind.Separator,
});

describe('buildDestinationQuickPickItems', () => {
  describe('DESTINATION_PICKER_SEQUENCE', () => {
    it('defines the correct order of destination kinds', () => {
      expect(DESTINATION_PICKER_SEQUENCE).toStrictEqual([
        'claude-code',
        'cursor-ai',
        'github-copilot-chat',
        'terminal',
        'terminal-more',
        'text-editor',
      ]);
    });
  });

  describe('buildDestinationQuickPickItems()', () => {
    const identityLabelBuilder = (name: string): string => name;
    const indentedLabelBuilder = (name: string): string => `    $(arrow-right) ${name}`;

    it('returns empty array when grouped is empty', () => {
      const grouped: GroupedDestinationItems = {};

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toStrictEqual([]);
    });

    it('builds items in DESTINATION_PICKER_SEQUENCE order with labeled group separators', () => {
      const mockTerminal = { name: 'bash' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        'text-editor': [
          {
            label: 'Text Editor',
            displayName: 'Text Editor',
            bindOptions: { kind: 'text-editor' },
            itemKind: 'bindable',
          },
        ],
        'claude-code': [
          {
            label: 'Claude Code Chat',
            displayName: 'Claude Code Chat',
            bindOptions: { kind: 'claude-code' },
            itemKind: 'bindable',
          },
        ],
        terminal: [
          {
            label: 'Terminal "bash"',
            displayName: 'Terminal "bash"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            isActive: true,
            itemKind: 'bindable',
            terminalInfo: { terminal: mockTerminal, name: 'bash', isActive: true },
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toStrictEqual([
        separator('AI Assistants'),
        {
          label: 'Claude Code Chat',
          displayName: 'Claude Code Chat',
          bindOptions: { kind: 'claude-code' },
          itemKind: 'bindable',
          description: undefined,
        },
        separator('Terminals'),
        {
          label: 'Terminal "bash"',
          displayName: 'Terminal "bash"',
          bindOptions: { kind: 'terminal', terminal: mockTerminal },
          isActive: true,
          itemKind: 'bindable',
          description: 'active',
          terminalInfo: { terminal: mockTerminal, name: 'bash', isActive: true },
        },
        separator('Files'),
        {
          label: 'Text Editor',
          displayName: 'Text Editor',
          bindOptions: { kind: 'text-editor' },
          itemKind: 'bindable',
          description: undefined,
        },
      ]);
    });

    it('uses single group separator when all items belong to same group', () => {
      const grouped: GroupedDestinationItems = {
        'claude-code': [
          {
            label: 'Claude Code Chat',
            displayName: 'Claude Code Chat',
            bindOptions: { kind: 'claude-code' },
            itemKind: 'bindable',
          },
        ],
        'cursor-ai': [
          {
            label: 'Cursor AI',
            displayName: 'Cursor AI',
            bindOptions: { kind: 'cursor-ai' },
            itemKind: 'bindable',
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toStrictEqual([
        separator('AI Assistants'),
        {
          label: 'Claude Code Chat',
          displayName: 'Claude Code Chat',
          bindOptions: { kind: 'claude-code' },
          itemKind: 'bindable',
          description: undefined,
        },
        {
          label: 'Cursor AI',
          displayName: 'Cursor AI',
          bindOptions: { kind: 'cursor-ai' },
          itemKind: 'bindable',
          description: undefined,
        },
      ]);
    });

    it('keeps terminal-more in same group as terminals without extra separator', () => {
      const mockTerminal = { name: 'bash' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        terminal: [
          {
            label: 'Terminal "bash"',
            displayName: 'Terminal "bash"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            itemKind: 'bindable',
            terminalInfo: { terminal: mockTerminal, name: 'bash', isActive: false },
          },
        ],
        'terminal-more': {
          label: 'More terminals...',
          displayName: 'More terminals...',
          remainingCount: 3,
          itemKind: 'terminal-more',
        },
        'text-editor': [
          {
            label: 'Text Editor',
            displayName: 'Text Editor',
            bindOptions: { kind: 'text-editor' },
            itemKind: 'bindable',
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toStrictEqual([
        separator('Terminals'),
        {
          label: 'Terminal "bash"',
          displayName: 'Terminal "bash"',
          bindOptions: { kind: 'terminal', terminal: mockTerminal },
          itemKind: 'bindable',
          description: undefined,
          terminalInfo: { terminal: mockTerminal, name: 'bash', isActive: false },
        },
        {
          label: 'More terminals...',
          displayName: 'More terminals...',
          remainingCount: 3,
          itemKind: 'terminal-more',
          description: '3 more',
        },
        separator('Files'),
        {
          label: 'Text Editor',
          displayName: 'Text Editor',
          bindOptions: { kind: 'text-editor' },
          itemKind: 'bindable',
          description: undefined,
        },
      ]);
    });

    it('applies label builder to destination items but not separators', () => {
      const grouped: GroupedDestinationItems = {
        'claude-code': [
          {
            label: 'Claude Code Chat',
            displayName: 'Claude Code Chat',
            bindOptions: { kind: 'claude-code' },
            itemKind: 'bindable',
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, indentedLabelBuilder);

      expect(result[0]).toStrictEqual(separator('AI Assistants'));
      expect(result[1].label).toBe('    $(arrow-right) Claude Code Chat');
    });

    it('sets "bound \u00b7 active" description for bound and active terminals', () => {
      const mockTerminal = { name: 'zsh' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        terminal: [
          {
            label: 'Terminal "zsh"',
            displayName: 'Terminal "zsh"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            isActive: true,
            itemKind: 'bindable',
            boundState: 'bound',
            terminalInfo: {
              terminal: mockTerminal,
              name: 'zsh',
              isActive: true,
              boundState: 'bound',
            },
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result[1].description).toBe('bound \u00b7 active');
    });

    it('sets "bound" description for bound but inactive terminals', () => {
      const mockTerminal = { name: 'zsh' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        terminal: [
          {
            label: 'Terminal "zsh"',
            displayName: 'Terminal "zsh"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            isActive: false,
            itemKind: 'bindable',
            boundState: 'bound',
            terminalInfo: {
              terminal: mockTerminal,
              name: 'zsh',
              isActive: false,
              boundState: 'bound',
            },
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result[1].description).toBe('bound');
    });

    it('sets "active" description for active but not-bound terminals', () => {
      const mockTerminal = { name: 'zsh' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        terminal: [
          {
            label: 'Terminal "zsh"',
            displayName: 'Terminal "zsh"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            isActive: true,
            itemKind: 'bindable',
            boundState: 'not-bound',
            terminalInfo: {
              terminal: mockTerminal,
              name: 'zsh',
              isActive: true,
              boundState: 'not-bound',
            },
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result[1].description).toBe('active');
    });

    it('sets undefined description for inactive and not-bound terminals', () => {
      const mockTerminal = { name: 'node' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        terminal: [
          {
            label: 'Terminal "node"',
            displayName: 'Terminal "node"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            isActive: false,
            itemKind: 'bindable',
            boundState: 'not-bound',
            terminalInfo: {
              terminal: mockTerminal,
              name: 'node',
              isActive: false,
              boundState: 'not-bound',
            },
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result[1].description).toBeUndefined();
    });

    it('handles terminal-more item with remaining count description', () => {
      const grouped: GroupedDestinationItems = {
        'terminal-more': {
          label: 'More terminals...',
          displayName: 'More terminals...',
          remainingCount: 5,
          itemKind: 'terminal-more',
        },
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toStrictEqual([
        separator('Terminals'),
        {
          label: 'More terminals...',
          displayName: 'More terminals...',
          remainingCount: 5,
          itemKind: 'terminal-more',
          description: '5 more',
        },
      ]);
    });

    it('preserves all item properties while overriding label and description', () => {
      const mockTerminal = { name: 'fish' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        terminal: [
          {
            label: 'Terminal "fish"',
            displayName: 'Terminal "fish"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            isActive: true,
            itemKind: 'bindable',
            terminalInfo: { terminal: mockTerminal, name: 'fish', isActive: true },
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, indentedLabelBuilder);

      expect(result[1]).toStrictEqual({
        label: '    $(arrow-right) Terminal "fish"',
        displayName: 'Terminal "fish"',
        bindOptions: { kind: 'terminal', terminal: mockTerminal },
        isActive: true,
        itemKind: 'bindable',
        description: 'active',
        terminalInfo: { terminal: mockTerminal, name: 'fish', isActive: true },
      });
    });

    it('skips destination kinds not present in grouped', () => {
      const grouped: GroupedDestinationItems = {
        'cursor-ai': [
          {
            label: 'Cursor AI',
            displayName: 'Cursor AI',
            bindOptions: { kind: 'cursor-ai' },
            itemKind: 'bindable',
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toStrictEqual([
        separator('AI Assistants'),
        {
          label: 'Cursor AI',
          displayName: 'Cursor AI',
          bindOptions: { kind: 'cursor-ai' },
          itemKind: 'bindable',
          description: undefined,
        },
      ]);
    });

    it('ignores unknown keys in grouped that are not in sequence', () => {
      const grouped = {
        'claude-code': [
          {
            label: 'Claude Code Chat',
            displayName: 'Claude Code Chat',
            bindOptions: { kind: 'claude-code' },
            itemKind: 'bindable',
          },
        ],
        'unknown-type': [
          {
            label: 'Unknown',
            displayName: 'Unknown',
            bindOptions: { kind: 'unknown' },
            itemKind: 'bindable',
          },
        ],
      } as unknown as GroupedDestinationItems;

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toStrictEqual([
        separator('AI Assistants'),
        {
          label: 'Claude Code Chat',
          displayName: 'Claude Code Chat',
          bindOptions: { kind: 'claude-code' },
          itemKind: 'bindable',
          description: undefined,
        },
      ]);
    });
  });
});
