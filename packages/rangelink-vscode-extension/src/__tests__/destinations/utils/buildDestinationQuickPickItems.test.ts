import type * as vscode from 'vscode';

import {
  buildDestinationQuickPickItems,
  DESTINATION_PICKER_SEQUENCE,
} from '../../../destinations/utils/buildDestinationQuickPickItems';
import type { GroupedDestinationItems } from '../../../types';

describe('buildDestinationQuickPickItems', () => {
  describe('DESTINATION_PICKER_SEQUENCE', () => {
    it('defines the correct order of destination types', () => {
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

    it('builds items in DESTINATION_PICKER_SEQUENCE order', () => {
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
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toHaveLength(3);
      expect(result[0].label).toBe('Claude Code Chat');
      expect(result[1].label).toBe('Terminal "bash"');
      expect(result[2].label).toBe('Text Editor');
    });

    it('applies label builder to each item', () => {
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

      expect(result[0].label).toBe('    $(arrow-right) Claude Code Chat');
    });

    it('sets active description for active terminals', () => {
      const mockTerminal = { name: 'zsh' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        terminal: [
          {
            label: 'Terminal "zsh"',
            displayName: 'Terminal "zsh"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            isActive: true,
            itemKind: 'bindable',
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result[0].description).toBe('active');
    });

    it('sets undefined description for inactive terminals', () => {
      const mockTerminal = { name: 'node' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        terminal: [
          {
            label: 'Terminal "node"',
            displayName: 'Terminal "node"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            isActive: false,
            itemKind: 'bindable',
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result[0].description).toBeUndefined();
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

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('More terminals...');
      expect(result[0].description).toBe('5 more');
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
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, indentedLabelBuilder);

      expect(result[0]).toStrictEqual({
        label: '    $(arrow-right) Terminal "fish"',
        displayName: 'Terminal "fish"',
        bindOptions: { kind: 'terminal', terminal: mockTerminal },
        isActive: true,
        itemKind: 'bindable',
        description: 'active',
      });
    });

    it('skips destination types not present in grouped', () => {
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

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Cursor AI');
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

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Claude Code Chat');
    });
  });
});
