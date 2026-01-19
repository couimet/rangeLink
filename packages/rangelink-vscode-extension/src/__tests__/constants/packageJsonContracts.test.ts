import packageJson from '../../../package.json';

interface CommandContribution {
  command: string;
  title: string;
  category: string;
  icon?: string;
  enablement?: string;
}

interface ConfigurationProperty {
  type: string;
  default: string;
  description: string;
  pattern?: string;
  enum?: string[];
  enumDescriptions?: string[];
}

interface KeybindingContribution {
  command: string;
  key: string;
  mac: string;
  when?: string;
}

interface MenuContribution {
  when?: string;
  command: string;
  group: string;
}

/**
 * Contract tests for package.json contributions.
 *
 * These tests freeze user-facing contracts (command titles, categories,
 * keybindings, configuration) to catch accidental changes.
 */
describe('package.json contributions', () => {
  describe('commands', () => {
    const commands = packageJson.contributes.commands as CommandContribution[];

    const findCommand = (commandId: string): CommandContribution | undefined =>
      commands.find((cmd) => cmd.command === commandId);

    describe('link copy commands', () => {
      it('rangelink.copyLinkWithRelativePath', () => {
        expect(findCommand('rangelink.copyLinkWithRelativePath')).toStrictEqual({
          command: 'rangelink.copyLinkWithRelativePath',
          title: 'Copy Range Link',
          category: 'RangeLink',
          icon: '$(link)',
          enablement: 'editorHasSelection',
        });
      });

      it('rangelink.copyLinkWithAbsolutePath', () => {
        expect(findCommand('rangelink.copyLinkWithAbsolutePath')).toStrictEqual({
          command: 'rangelink.copyLinkWithAbsolutePath',
          title: 'Copy Range Link (Absolute)',
          category: 'RangeLink',
          icon: '$(link-external)',
          enablement: 'editorHasSelection',
        });
      });

      it('rangelink.copyPortableLinkWithRelativePath', () => {
        expect(findCommand('rangelink.copyPortableLinkWithRelativePath')).toStrictEqual({
          command: 'rangelink.copyPortableLinkWithRelativePath',
          title: 'Copy Portable RangeLink',
          category: 'RangeLink',
          icon: '$(link-external)',
          enablement: 'editorHasSelection',
        });
      });

      it('rangelink.copyPortableLinkWithAbsolutePath', () => {
        expect(findCommand('rangelink.copyPortableLinkWithAbsolutePath')).toStrictEqual({
          command: 'rangelink.copyPortableLinkWithAbsolutePath',
          title: 'Copy Portable RangeLink (Absolute)',
          category: 'RangeLink',
          icon: '$(link-external)',
          enablement: 'editorHasSelection',
        });
      });

      it('rangelink.copyLinkOnlyWithRelativePath', () => {
        expect(findCommand('rangelink.copyLinkOnlyWithRelativePath')).toStrictEqual({
          command: 'rangelink.copyLinkOnlyWithRelativePath',
          title: 'Copy Range Link (Clipboard Only)',
          category: 'RangeLink',
          icon: '$(clippy)',
          enablement: 'editorHasSelection',
        });
      });

      it('rangelink.copyLinkOnlyWithAbsolutePath', () => {
        expect(findCommand('rangelink.copyLinkOnlyWithAbsolutePath')).toStrictEqual({
          command: 'rangelink.copyLinkOnlyWithAbsolutePath',
          title: 'Copy Range Link (Clipboard Only, Absolute)',
          category: 'RangeLink',
          icon: '$(clippy)',
          enablement: 'editorHasSelection',
        });
      });
    });

    describe('paste commands', () => {
      it('rangelink.pasteSelectedTextToDestination', () => {
        expect(findCommand('rangelink.pasteSelectedTextToDestination')).toStrictEqual({
          command: 'rangelink.pasteSelectedTextToDestination',
          title: 'Paste Selected Text to Bound Destination',
          category: 'RangeLink',
          icon: '$(symbol-snippet)',
          enablement: 'editorHasSelection',
        });
      });
    });

    describe('destination binding commands', () => {
      it('rangelink.bindToTerminal', () => {
        expect(findCommand('rangelink.bindToTerminal')).toStrictEqual({
          command: 'rangelink.bindToTerminal',
          title: 'Bind RangeLink to Terminal Destination',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToTerminalHere', () => {
        expect(findCommand('rangelink.bindToTerminalHere')).toStrictEqual({
          command: 'rangelink.bindToTerminalHere',
          title: 'Bind RangeLink Here',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToTextEditor', () => {
        expect(findCommand('rangelink.bindToTextEditor')).toStrictEqual({
          command: 'rangelink.bindToTextEditor',
          title: 'Bind RangeLink to Text Editor Destination',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToTextEditorHere', () => {
        expect(findCommand('rangelink.bindToTextEditorHere')).toStrictEqual({
          command: 'rangelink.bindToTextEditorHere',
          title: 'Bind RangeLink Here',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToCursorAI', () => {
        expect(findCommand('rangelink.bindToCursorAI')).toStrictEqual({
          command: 'rangelink.bindToCursorAI',
          title: 'Bind RangeLink to Cursor AI Destination',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToClaudeCode', () => {
        expect(findCommand('rangelink.bindToClaudeCode')).toStrictEqual({
          command: 'rangelink.bindToClaudeCode',
          title: 'Bind RangeLink to Claude Code Destination',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToGitHubCopilotChat', () => {
        expect(findCommand('rangelink.bindToGitHubCopilotChat')).toStrictEqual({
          command: 'rangelink.bindToGitHubCopilotChat',
          title: 'Bind RangeLink to GitHub Copilot Chat Destination',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.unbindDestination', () => {
        expect(findCommand('rangelink.unbindDestination')).toStrictEqual({
          command: 'rangelink.unbindDestination',
          title: 'Unbind RangeLink',
          category: 'RangeLink',
          icon: '$(close)',
        });
      });

      it('rangelink.jumpToBoundDestination', () => {
        expect(findCommand('rangelink.jumpToBoundDestination')).toStrictEqual({
          command: 'rangelink.jumpToBoundDestination',
          title: 'Jump to Bound Destination',
          category: 'RangeLink',
          icon: '$(target)',
        });
      });
    });

    describe('status bar commands', () => {
      it('rangelink.openStatusBarMenu', () => {
        expect(findCommand('rangelink.openStatusBarMenu')).toStrictEqual({
          command: 'rangelink.openStatusBarMenu',
          title: 'Open RangeLink Menu',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.showVersion', () => {
        expect(findCommand('rangelink.showVersion')).toStrictEqual({
          command: 'rangelink.showVersion',
          title: 'Show Version Info',
          category: 'RangeLink',
          icon: '$(info)',
        });
      });
    });

    describe('bookmark commands', () => {
      it('rangelink.bookmark.add', () => {
        expect(findCommand('rangelink.bookmark.add')).toStrictEqual({
          command: 'rangelink.bookmark.add',
          title: 'Save Selection as Bookmark',
          category: 'RangeLink',
          icon: '$(bookmark)',
          enablement: 'editorHasSelection',
        });
      });

      it('rangelink.bookmark.list', () => {
        expect(findCommand('rangelink.bookmark.list')).toStrictEqual({
          command: 'rangelink.bookmark.list',
          title: 'List Bookmarks',
          category: 'RangeLink',
          icon: '$(bookmark)',
        });
      });
    });

    describe('paste file path commands (context menu)', () => {
      it('rangelink.pasteFileAbsolutePath', () => {
        expect(findCommand('rangelink.pasteFileAbsolutePath')).toStrictEqual({
          command: 'rangelink.pasteFileAbsolutePath',
          title: 'RangeLink: Paste File Path (Absolute)',
          category: 'RangeLink',
          icon: '$(file-symlink-file)',
        });
      });

      it('rangelink.pasteFileRelativePath', () => {
        expect(findCommand('rangelink.pasteFileRelativePath')).toStrictEqual({
          command: 'rangelink.pasteFileRelativePath',
          title: 'RangeLink: Paste File Path',
          category: 'RangeLink',
          icon: '$(file-symlink-file)',
        });
      });
    });

    describe('paste current file path commands (command palette)', () => {
      it('rangelink.pasteCurrentFileAbsolutePath', () => {
        expect(findCommand('rangelink.pasteCurrentFileAbsolutePath')).toStrictEqual({
          command: 'rangelink.pasteCurrentFileAbsolutePath',
          title: 'Paste Current File Path (Absolute)',
          category: 'RangeLink',
          icon: '$(file-symlink-file)',
          enablement: 'editorIsOpen',
        });
      });

      it('rangelink.pasteCurrentFileRelativePath', () => {
        expect(findCommand('rangelink.pasteCurrentFileRelativePath')).toStrictEqual({
          command: 'rangelink.pasteCurrentFileRelativePath',
          title: 'Paste Current File Path',
          category: 'RangeLink',
          icon: '$(file-symlink-file)',
          enablement: 'editorIsOpen',
        });
      });
    });

    it('has the expected number of commands', () => {
      expect(commands).toHaveLength(24);
    });
  });

  describe('configuration', () => {
    const properties = packageJson.contributes.configuration.properties as Record<
      string,
      ConfigurationProperty
    >;

    describe('delimiter settings', () => {
      it('rangelink.delimiterLine', () => {
        expect(properties['rangelink.delimiterLine']).toStrictEqual({
          type: 'string',
          default: 'L',
          description: 'Delimiter used before line numbers (e.g., L in #L10-L20)',
          pattern: '^[^0-9]+$',
        });
      });

      it('rangelink.delimiterPosition', () => {
        expect(properties['rangelink.delimiterPosition']).toStrictEqual({
          type: 'string',
          default: 'C',
          description: 'Delimiter used before position numbers (e.g., C in #L10C5-L20C10)',
          pattern: '^[^0-9]+$',
        });
      });

      it('rangelink.delimiterHash', () => {
        expect(properties['rangelink.delimiterHash']).toStrictEqual({
          type: 'string',
          default: '#',
          description: 'Delimiter used before the range specification (e.g., # in path#L10-L20)',
          pattern: '^[^0-9]+$',
        });
      });

      it('rangelink.delimiterRange', () => {
        expect(properties['rangelink.delimiterRange']).toStrictEqual({
          type: 'string',
          default: '-',
          description: 'Delimiter used between start and end positions (e.g., - in #L10-L20)',
          pattern: '^[^0-9]+$',
        });
      });
    });

    describe('smart padding settings', () => {
      it('rangelink.smartPadding.pasteLink', () => {
        expect(properties['rangelink.smartPadding.pasteLink']).toStrictEqual({
          type: 'string',
          enum: ['both', 'before', 'after', 'none'],
          default: 'both',
          enumDescriptions: [
            'Add space before and after (prevents concatenation)',
            'Add space before only',
            'Add space after only',
            'No padding (paste link as-is)',
          ],
          description: 'Smart padding for generated RangeLinks when pasting to destinations',
        });
      });

      it('rangelink.smartPadding.pasteContent', () => {
        expect(properties['rangelink.smartPadding.pasteContent']).toStrictEqual({
          type: 'string',
          enum: ['both', 'before', 'after', 'none'],
          default: 'none',
          enumDescriptions: [
            'Add space before and after',
            'Add space before only',
            'Add space after only',
            'No padding (paste text exactly as selected)',
          ],
          description:
            'Smart padding for selected text when using Paste Selected Text to Destination (R-V)',
        });
      });

      it('rangelink.smartPadding.pasteFilePath', () => {
        expect(properties['rangelink.smartPadding.pasteFilePath']).toStrictEqual({
          type: 'string',
          enum: ['both', 'before', 'after', 'none'],
          default: 'both',
          enumDescriptions: [
            'Add space before and after (prevents concatenation)',
            'Add space before only',
            'Add space after only',
            'No padding (paste path as-is)',
          ],
          description: 'Smart padding for file paths when using Paste Path commands',
        });
      });

      it('rangelink.smartPadding.pasteBookmark', () => {
        expect(properties['rangelink.smartPadding.pasteBookmark']).toStrictEqual({
          type: 'string',
          enum: ['both', 'before', 'after', 'none'],
          default: 'both',
          enumDescriptions: [
            'Add space before and after (prevents concatenation)',
            'Add space before only',
            'Add space after only',
            'No padding (paste bookmark as-is)',
          ],
          description: 'Smart padding for saved bookmarks when pasting to destinations',
        });
      });
    });

    it('has the expected number of configuration properties', () => {
      expect(Object.keys(properties)).toHaveLength(8);
    });
  });

  describe('keybindings', () => {
    const keybindings = packageJson.contributes.keybindings as KeybindingContribution[];

    const findKeybinding = (commandId: string): KeybindingContribution | undefined =>
      keybindings.find((kb) => kb.command === commandId);

    it('rangelink.copyLinkWithRelativePath keybinding', () => {
      expect(findKeybinding('rangelink.copyLinkWithRelativePath')).toStrictEqual({
        command: 'rangelink.copyLinkWithRelativePath',
        key: 'ctrl+r ctrl+l',
        mac: 'cmd+r cmd+l',
        when: 'editorHasSelection',
      });
    });

    it('rangelink.copyLinkWithAbsolutePath keybinding', () => {
      expect(findKeybinding('rangelink.copyLinkWithAbsolutePath')).toStrictEqual({
        command: 'rangelink.copyLinkWithAbsolutePath',
        key: 'ctrl+r ctrl+shift+l',
        mac: 'cmd+r cmd+shift+l',
        when: 'editorHasSelection',
      });
    });

    it('rangelink.copyPortableLinkWithRelativePath keybinding', () => {
      expect(findKeybinding('rangelink.copyPortableLinkWithRelativePath')).toStrictEqual({
        command: 'rangelink.copyPortableLinkWithRelativePath',
        key: 'ctrl+r ctrl+p',
        mac: 'cmd+r cmd+p',
        when: 'editorHasSelection',
      });
    });

    it('rangelink.copyPortableLinkWithAbsolutePath keybinding', () => {
      expect(findKeybinding('rangelink.copyPortableLinkWithAbsolutePath')).toStrictEqual({
        command: 'rangelink.copyPortableLinkWithAbsolutePath',
        key: 'ctrl+r ctrl+shift+p',
        mac: 'cmd+r cmd+shift+p',
        when: 'editorHasSelection',
      });
    });

    it('rangelink.copyLinkOnlyWithRelativePath keybinding', () => {
      expect(findKeybinding('rangelink.copyLinkOnlyWithRelativePath')).toStrictEqual({
        command: 'rangelink.copyLinkOnlyWithRelativePath',
        key: 'ctrl+r ctrl+c',
        mac: 'cmd+r cmd+c',
        when: 'editorHasSelection',
      });
    });

    it('rangelink.copyLinkOnlyWithAbsolutePath keybinding', () => {
      expect(findKeybinding('rangelink.copyLinkOnlyWithAbsolutePath')).toStrictEqual({
        command: 'rangelink.copyLinkOnlyWithAbsolutePath',
        key: 'ctrl+r ctrl+shift+c',
        mac: 'cmd+r cmd+shift+c',
        when: 'editorHasSelection',
      });
    });

    it('rangelink.pasteSelectedTextToDestination keybinding', () => {
      expect(findKeybinding('rangelink.pasteSelectedTextToDestination')).toStrictEqual({
        command: 'rangelink.pasteSelectedTextToDestination',
        key: 'ctrl+r ctrl+v',
        mac: 'cmd+r cmd+v',
        when: 'editorHasSelection',
      });
    });

    it('rangelink.pasteCurrentFileRelativePath keybinding', () => {
      expect(findKeybinding('rangelink.pasteCurrentFileRelativePath')).toStrictEqual({
        command: 'rangelink.pasteCurrentFileRelativePath',
        key: 'ctrl+r ctrl+f',
        mac: 'cmd+r cmd+f',
        when: 'editorIsOpen',
      });
    });

    it('rangelink.pasteCurrentFileAbsolutePath keybinding', () => {
      expect(findKeybinding('rangelink.pasteCurrentFileAbsolutePath')).toStrictEqual({
        command: 'rangelink.pasteCurrentFileAbsolutePath',
        key: 'ctrl+r ctrl+shift+f',
        mac: 'cmd+r cmd+shift+f',
        when: 'editorIsOpen',
      });
    });

    it('rangelink.jumpToBoundDestination keybinding', () => {
      expect(findKeybinding('rangelink.jumpToBoundDestination')).toStrictEqual({
        command: 'rangelink.jumpToBoundDestination',
        key: 'ctrl+r ctrl+j',
        mac: 'cmd+r cmd+j',
      });
    });

    it('rangelink.bookmark.add keybinding', () => {
      expect(findKeybinding('rangelink.bookmark.add')).toStrictEqual({
        command: 'rangelink.bookmark.add',
        key: 'ctrl+r ctrl+b ctrl+s',
        mac: 'cmd+r cmd+b cmd+s',
        when: 'editorHasSelection',
      });
    });

    it('rangelink.bookmark.list keybinding', () => {
      expect(findKeybinding('rangelink.bookmark.list')).toStrictEqual({
        command: 'rangelink.bookmark.list',
        key: 'ctrl+r ctrl+b ctrl+l',
        mac: 'cmd+r cmd+b cmd+l',
      });
    });

    it('has the expected number of keybindings', () => {
      expect(keybindings).toHaveLength(12);
    });
  });

  describe('menus', () => {
    describe('editor/context', () => {
      const editorContextMenu = packageJson.contributes.menus[
        'editor/context'
      ] as MenuContribution[];

      it('has the expected number of editor context menu items', () => {
        expect(editorContextMenu).toHaveLength(10);
      });

      it('bindToTextEditorHere at top of RangeLink group', () => {
        expect(editorContextMenu[0]).toStrictEqual({
          command: 'rangelink.bindToTextEditorHere',
          group: '8_rangelink@0',
          when: 'resourceScheme == file || resourceScheme == untitled',
        });
      });

      it('copyLinkWithRelativePath in context menu', () => {
        expect(editorContextMenu[1]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.copyLinkWithRelativePath',
          group: '8_rangelink@1',
        });
      });

      it('copyLinkWithAbsolutePath in context menu', () => {
        expect(editorContextMenu[2]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.copyLinkWithAbsolutePath',
          group: '8_rangelink@2',
        });
      });

      it('copyPortableLinkWithRelativePath in context menu', () => {
        expect(editorContextMenu[3]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.copyPortableLinkWithRelativePath',
          group: '8_rangelink@3',
        });
      });

      it('copyPortableLinkWithAbsolutePath in context menu', () => {
        expect(editorContextMenu[4]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.copyPortableLinkWithAbsolutePath',
          group: '8_rangelink@4',
        });
      });

      it('pasteSelectedTextToDestination in context menu', () => {
        expect(editorContextMenu[5]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.pasteSelectedTextToDestination',
          group: '8_rangelink@5',
        });
      });

      it('bookmark.add in context menu', () => {
        expect(editorContextMenu[6]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.bookmark.add',
          group: '8_rangelink@6',
        });
      });

      it('unbindDestination at bottom of RangeLink group', () => {
        expect(editorContextMenu[7]).toStrictEqual({
          when: 'rangelink.isBound',
          command: 'rangelink.unbindDestination',
          group: '8_rangelink@7',
        });
      });

      it('pasteFileRelativePath in editor context menu', () => {
        expect(editorContextMenu[8]).toStrictEqual({
          command: 'rangelink.pasteFileRelativePath',
          group: '5_cutcopypaste@10',
        });
      });

      it('pasteFileAbsolutePath in editor context menu', () => {
        expect(editorContextMenu[9]).toStrictEqual({
          command: 'rangelink.pasteFileAbsolutePath',
          group: '5_cutcopypaste@11',
        });
      });
    });

    describe('editor/title/context', () => {
      const editorTitleContextMenu = packageJson.contributes.menus[
        'editor/title/context'
      ] as MenuContribution[];

      it('has the expected number of editor title context menu items', () => {
        expect(editorTitleContextMenu).toHaveLength(2);
      });

      it('pasteFilePathRelative in editor title context menu', () => {
        expect(editorTitleContextMenu[0]).toStrictEqual({
          command: 'rangelink.pasteFileRelativePath',
          group: '5_cutcopypaste@10',
        });
      });

      it('pasteFilePath in editor title context menu', () => {
        expect(editorTitleContextMenu[1]).toStrictEqual({
          command: 'rangelink.pasteFileAbsolutePath',
          group: '5_cutcopypaste@11',
        });
      });
    });

    describe('explorer/context', () => {
      const explorerContextMenu = packageJson.contributes.menus[
        'explorer/context'
      ] as MenuContribution[];

      it('has the expected number of explorer context menu items', () => {
        expect(explorerContextMenu).toHaveLength(2);
      });

      it('pasteFilePathRelative in explorer context menu', () => {
        expect(explorerContextMenu[0]).toStrictEqual({
          command: 'rangelink.pasteFileRelativePath',
          group: '5_cutcopypaste@10',
        });
      });

      it('pasteFilePath in explorer context menu', () => {
        expect(explorerContextMenu[1]).toStrictEqual({
          command: 'rangelink.pasteFileAbsolutePath',
          group: '5_cutcopypaste@11',
        });
      });
    });

    describe('commandPalette', () => {
      const commandPalette = packageJson.contributes.menus['commandPalette'] as MenuContribution[];

      it('has the expected number of commandPalette entries', () => {
        expect(commandPalette).toHaveLength(4);
      });

      it('bindToTerminalHere is hidden from command palette', () => {
        expect(commandPalette[0]).toStrictEqual({
          command: 'rangelink.bindToTerminalHere',
          when: 'false',
        });
      });

      it('bindToTextEditorHere is hidden from command palette', () => {
        expect(commandPalette[1]).toStrictEqual({
          command: 'rangelink.bindToTextEditorHere',
          when: 'false',
        });
      });

      it('pasteFileAbsolutePath is hidden from command palette', () => {
        expect(commandPalette[2]).toStrictEqual({
          command: 'rangelink.pasteFileAbsolutePath',
          when: 'false',
        });
      });

      it('pasteFileRelativePath is hidden from command palette', () => {
        expect(commandPalette[3]).toStrictEqual({
          command: 'rangelink.pasteFileRelativePath',
          when: 'false',
        });
      });
    });

    describe('terminal/title/context', () => {
      const terminalTitleContextMenu = packageJson.contributes.menus[
        'terminal/title/context'
      ] as MenuContribution[];

      it('has the expected number of terminal title context menu items', () => {
        expect(terminalTitleContextMenu).toHaveLength(2);
      });

      it('bindToTerminalHere is always visible', () => {
        expect(terminalTitleContextMenu[0]).toStrictEqual({
          command: 'rangelink.bindToTerminalHere',
          group: 'rangelink@1',
        });
      });

      it('unbindDestination shows when any destination bound', () => {
        expect(terminalTitleContextMenu[1]).toStrictEqual({
          when: 'rangelink.isBound',
          command: 'rangelink.unbindDestination',
          group: 'rangelink@2',
        });
      });
    });

    describe('terminal/context', () => {
      const terminalContextMenu = packageJson.contributes.menus[
        'terminal/context'
      ] as MenuContribution[];

      it('has the expected number of terminal context menu items', () => {
        expect(terminalContextMenu).toHaveLength(2);
      });

      it('bindToTerminalHere is always visible', () => {
        expect(terminalContextMenu[0]).toStrictEqual({
          command: 'rangelink.bindToTerminalHere',
          group: 'rangelink@1',
        });
      });

      it('unbindDestination shows when any destination bound', () => {
        expect(terminalContextMenu[1]).toStrictEqual({
          when: 'rangelink.isBound',
          command: 'rangelink.unbindDestination',
          group: 'rangelink@2',
        });
      });
    });
  });
});
