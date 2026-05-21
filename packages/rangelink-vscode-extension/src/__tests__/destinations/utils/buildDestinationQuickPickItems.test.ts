import * as vscode from 'vscode';

import {
  buildDestinationQuickPickItems,
  BUILTIN_AI_COUNT,
  DESTINATION_PICKER_SEQUENCE,
} from '../../../destinations/utils/buildDestinationQuickPickItems';
import type { FileMoreQuickPickItem, GroupedDestinationItems } from '../../../types';
import { AI_ASSISTANT_KINDS } from '../../../types';
import { createMockEligibleFile, createMockTextEditorQuickPickItem } from '../../helpers';

const separator = (label: string): vscode.QuickPickItem => ({
  label,
  kind: vscode.QuickPickItemKind.Separator,
});

describe('buildDestinationQuickPickItems', () => {
  describe('DESTINATION_PICKER_SEQUENCE', () => {
    it('defines the correct order of destination kinds', () => {
      expect(DESTINATION_PICKER_SEQUENCE).toStrictEqual([
        'claude-code',
        'gemini-code-assist',
        'cursor-ai',
        'github-copilot-chat',
        'terminal',
        'terminal-more',
        'text-editor',
        'file-more',
      ]);
    });
  });

  describe('BUILTIN_AI_COUNT', () => {
    it('equals AI_ASSISTANT_KINDS.length — update this test and the behavioral test below when adding a new built-in AI assistant', () => {
      expect(BUILTIN_AI_COUNT).toBe(AI_ASSISTANT_KINDS.length);
      expect(BUILTIN_AI_COUNT).toBe(4);
    });

    it('places custom AI assistants between built-in AI assistants and non-AI destinations', () => {
      const mockTerminal = { name: 'bash' } as vscode.Terminal;
      const grouped: GroupedDestinationItems = {
        'claude-code': [
          {
            label: 'Claude Code Chat',
            displayName: 'Claude Code Chat',
            bindOptions: { kind: 'claude-code' },
            itemKind: 'bindable',
          },
        ],
        'gemini-code-assist': [
          {
            label: 'Gemini Code Assist',
            displayName: 'Gemini Code Assist',
            bindOptions: { kind: 'gemini-code-assist' },
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
        'github-copilot-chat': [
          {
            label: 'GitHub Copilot Chat',
            displayName: 'GitHub Copilot Chat',
            bindOptions: { kind: 'github-copilot-chat' },
            itemKind: 'bindable',
          },
        ],
        'custom-ai:my-ai': [
          {
            label: 'My Custom AI',
            displayName: 'My Custom AI',
            bindOptions: { kind: 'custom-ai:my-ai' },
            itemKind: 'bindable',
          },
        ],
        terminal: [
          {
            label: 'Terminal "bash"',
            displayName: 'Terminal "bash"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            itemKind: 'bindable',
            terminalInfo: {
              bindOptions: { kind: 'terminal', terminal: mockTerminal },
              name: 'bash',
              isActive: false,
            },
          },
        ],
      };

      const identityLabelBuilder = (name: string): string => name;
      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      const labels = result.map((item) => ('displayName' in item ? item.displayName : item.label));

      expect(labels).toStrictEqual([
        'AI Assistants',
        'Claude Code Chat',
        'Gemini Code Assist',
        'Cursor AI',
        'GitHub Copilot Chat',
        'My Custom AI',
        'Terminals',
        'Terminal "bash"',
      ]);

      const aiSeparatorIndex = labels.indexOf('AI Assistants');
      const terminalSeparatorIndex = labels.indexOf('Terminals');
      const customAiIndex = labels.indexOf('My Custom AI');
      const copilotIndex = labels.indexOf('GitHub Copilot Chat');

      expect(customAiIndex).toBeGreaterThan(copilotIndex);
      expect(customAiIndex).toBeLessThan(terminalSeparatorIndex);
      expect(aiSeparatorIndex).toBeLessThan(copilotIndex);
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
      const fileInfo = createMockEligibleFile({ filename: 'app.ts', viewColumn: 1 });
      const fileItem = createMockTextEditorQuickPickItem(fileInfo);
      const grouped: GroupedDestinationItems = {
        'text-editor': [fileItem],
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
            itemKind: 'bindable',
            terminalInfo: {
              bindOptions: { kind: 'terminal', terminal: mockTerminal },
              name: 'bash',
              isActive: true,
            },
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
          itemKind: 'bindable',
          description: 'active',
          terminalInfo: {
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            name: 'bash',
            isActive: true,
          },
        },
        separator('Files'),
        {
          label: 'app.ts',
          displayName: 'app.ts',
          bindOptions: fileInfo.bindOptions,
          itemKind: 'bindable',
          description: 'Tab Group 1',
          fileInfo,
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
      const fileInfo = createMockEligibleFile({ filename: 'index.ts', viewColumn: 1 });
      const fileItem = createMockTextEditorQuickPickItem(fileInfo);
      const grouped: GroupedDestinationItems = {
        terminal: [
          {
            label: 'Terminal "bash"',
            displayName: 'Terminal "bash"',
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            itemKind: 'bindable',
            terminalInfo: {
              bindOptions: { kind: 'terminal', terminal: mockTerminal },
              name: 'bash',
              isActive: false,
            },
          },
        ],
        'terminal-more': {
          label: 'More terminals...',
          displayName: 'More terminals...',
          remainingCount: 3,
          itemKind: 'terminal-more',
        },
        'text-editor': [fileItem],
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
          terminalInfo: {
            bindOptions: { kind: 'terminal', terminal: mockTerminal },
            name: 'bash',
            isActive: false,
          },
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
          label: 'index.ts',
          displayName: 'index.ts',
          bindOptions: fileInfo.bindOptions,
          itemKind: 'bindable',
          description: 'Tab Group 1',
          fileInfo,
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
            itemKind: 'bindable',
            terminalInfo: {
              bindOptions: { kind: 'terminal', terminal: mockTerminal },
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
            itemKind: 'bindable',
            terminalInfo: {
              bindOptions: { kind: 'terminal', terminal: mockTerminal },
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
            itemKind: 'bindable',
            terminalInfo: {
              bindOptions: { kind: 'terminal', terminal: mockTerminal },
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
            itemKind: 'bindable',
            terminalInfo: {
              bindOptions: { kind: 'terminal', terminal: mockTerminal },
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
            itemKind: 'bindable',
            terminalInfo: {
              bindOptions: { kind: 'terminal', terminal: mockTerminal },
              name: 'fish',
              isActive: true,
            },
          },
        ],
      };

      const result = buildDestinationQuickPickItems(grouped, indentedLabelBuilder);

      expect(result[1]).toStrictEqual({
        label: '    $(arrow-right) Terminal "fish"',
        displayName: 'Terminal "fish"',
        bindOptions: { kind: 'terminal', terminal: mockTerminal },
        itemKind: 'bindable',
        description: 'active',
        terminalInfo: {
          bindOptions: { kind: 'terminal', terminal: mockTerminal },
          name: 'fish',
          isActive: true,
        },
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

    it('appends Tab Group to pre-built file description', () => {
      const fileInfo = createMockEligibleFile({
        filename: 'app.ts',
        viewColumn: 1,
        isActiveEditor: true,
        boundState: 'bound',
      });
      const fileItem = createMockTextEditorQuickPickItem(fileInfo, 'bound · active');
      const grouped: GroupedDestinationItems = {
        'text-editor': [fileItem],
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result[1]).toStrictEqual({
        label: 'app.ts',
        displayName: 'app.ts',
        description: 'bound · active · Tab Group 1',
        bindOptions: fileInfo.bindOptions,
        itemKind: 'bindable',
        fileInfo,
      });
    });

    it('handles file-more item with remaining count description', () => {
      const moreItem: FileMoreQuickPickItem = {
        label: 'More files...',
        displayName: 'More files...',
        remainingCount: 4,
        itemKind: 'file-more',
      };
      const grouped: GroupedDestinationItems = {
        'file-more': moreItem,
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toStrictEqual([
        separator('Files'),
        {
          label: 'More files...',
          displayName: 'More files...',
          remainingCount: 4,
          itemKind: 'file-more',
          description: '4 more',
        },
      ]);
    });

    it('keeps file-more in same group as files without extra separator', () => {
      const fileInfo = createMockEligibleFile({ filename: 'app.ts', viewColumn: 1 });
      const fileItem = createMockTextEditorQuickPickItem(fileInfo);
      const moreItem: FileMoreQuickPickItem = {
        label: 'More files...',
        displayName: 'More files...',
        remainingCount: 7,
        itemKind: 'file-more',
      };
      const grouped: GroupedDestinationItems = {
        'text-editor': [fileItem],
        'file-more': moreItem,
      };

      const result = buildDestinationQuickPickItems(grouped, identityLabelBuilder);

      expect(result).toStrictEqual([
        separator('Files'),
        {
          label: 'app.ts',
          displayName: 'app.ts',
          bindOptions: fileInfo.bindOptions,
          itemKind: 'bindable',
          description: 'Tab Group 1',
          fileInfo,
        },
        {
          label: 'More files...',
          displayName: 'More files...',
          remainingCount: 7,
          itemKind: 'file-more',
          description: '7 more',
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
