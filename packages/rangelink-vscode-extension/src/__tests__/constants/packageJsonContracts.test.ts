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
  default: string | boolean;
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
          title: 'Copy Portable Link',
          category: 'RangeLink',
          icon: '$(link-external)',
          enablement: 'editorHasSelection',
        });
      });

      it('rangelink.copyPortableLinkWithAbsolutePath', () => {
        expect(findCommand('rangelink.copyPortableLinkWithAbsolutePath')).toStrictEqual({
          command: 'rangelink.copyPortableLinkWithAbsolutePath',
          title: 'Copy Portable Link (Absolute)',
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
          title: 'Bind to Terminal',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToTerminalHere', () => {
        expect(findCommand('rangelink.bindToTerminalHere')).toStrictEqual({
          command: 'rangelink.bindToTerminalHere',
          title: 'Bind Here',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToTextEditor', () => {
        expect(findCommand('rangelink.bindToTextEditor')).toStrictEqual({
          command: 'rangelink.bindToTextEditor',
          title: 'Bind to Text Editor',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToTextEditorHere', () => {
        expect(findCommand('rangelink.bindToTextEditorHere')).toStrictEqual({
          command: 'rangelink.bindToTextEditorHere',
          title: 'Bind Here',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToCursorAI', () => {
        expect(findCommand('rangelink.bindToCursorAI')).toStrictEqual({
          command: 'rangelink.bindToCursorAI',
          title: 'Bind to Cursor AI',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToClaudeCode', () => {
        expect(findCommand('rangelink.bindToClaudeCode')).toStrictEqual({
          command: 'rangelink.bindToClaudeCode',
          title: 'Bind to Claude Code',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.bindToGitHubCopilotChat', () => {
        expect(findCommand('rangelink.bindToGitHubCopilotChat')).toStrictEqual({
          command: 'rangelink.bindToGitHubCopilotChat',
          title: 'Bind to GitHub Copilot Chat',
          category: 'RangeLink',
          icon: '$(link)',
        });
      });

      it('rangelink.unbindDestination', () => {
        expect(findCommand('rangelink.unbindDestination')).toStrictEqual({
          command: 'rangelink.unbindDestination',
          title: 'Unbind',
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
          title: 'Open Menu',
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

      it('rangelink.goToRangeLink', () => {
        expect(findCommand('rangelink.goToRangeLink')).toStrictEqual({
          command: 'rangelink.goToRangeLink',
          title: 'Go to Link',
          category: 'RangeLink',
          icon: '$(go-to-file)',
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
          title: 'Paste File Path (Absolute)',
          category: 'RangeLink',
          icon: '$(file-symlink-file)',
        });
      });

      it('rangelink.pasteFileRelativePath', () => {
        expect(findCommand('rangelink.pasteFileRelativePath')).toStrictEqual({
          command: 'rangelink.pasteFileRelativePath',
          title: 'Paste File Path',
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

    describe('context-menu-specific commands (no category - hidden from palette)', () => {
      it('rangelink.explorer.pasteFilePath', () => {
        expect(findCommand('rangelink.explorer.pasteFilePath')).toStrictEqual({
          command: 'rangelink.explorer.pasteFilePath',
          title: 'RangeLink: Paste File Path',
          icon: '$(file-symlink-file)',
        });
      });

      it('rangelink.explorer.pasteRelativeFilePath', () => {
        expect(findCommand('rangelink.explorer.pasteRelativeFilePath')).toStrictEqual({
          command: 'rangelink.explorer.pasteRelativeFilePath',
          title: 'RangeLink: Paste Relative File Path',
          icon: '$(file-symlink-file)',
        });
      });

      it('rangelink.editorTab.pasteFilePath', () => {
        expect(findCommand('rangelink.editorTab.pasteFilePath')).toStrictEqual({
          command: 'rangelink.editorTab.pasteFilePath',
          title: 'RangeLink: Paste File Path',
          icon: '$(file-symlink-file)',
        });
      });

      it('rangelink.editorTab.pasteRelativeFilePath', () => {
        expect(findCommand('rangelink.editorTab.pasteRelativeFilePath')).toStrictEqual({
          command: 'rangelink.editorTab.pasteRelativeFilePath',
          title: 'RangeLink: Paste Relative File Path',
          icon: '$(file-symlink-file)',
        });
      });

      it('rangelink.editorContent.pasteFilePath', () => {
        expect(findCommand('rangelink.editorContent.pasteFilePath')).toStrictEqual({
          command: 'rangelink.editorContent.pasteFilePath',
          title: "RangeLink: Paste This File's Path",
          icon: '$(file-symlink-file)',
        });
      });

      it('rangelink.editorContent.pasteRelativeFilePath', () => {
        expect(findCommand('rangelink.editorContent.pasteRelativeFilePath')).toStrictEqual({
          command: 'rangelink.editorContent.pasteRelativeFilePath',
          title: "RangeLink: Paste This File's Relative Path",
          icon: '$(file-symlink-file)',
        });
      });

      it('rangelink.editorContent.bind', () => {
        expect(findCommand('rangelink.editorContent.bind')).toStrictEqual({
          command: 'rangelink.editorContent.bind',
          title: 'RangeLink: Bind Here',
          icon: '$(link)',
        });
      });

      it('rangelink.editorContent.unbind', () => {
        expect(findCommand('rangelink.editorContent.unbind')).toStrictEqual({
          command: 'rangelink.editorContent.unbind',
          title: 'RangeLink: Unbind',
          icon: '$(close)',
        });
      });

      it('rangelink.terminal.bind', () => {
        expect(findCommand('rangelink.terminal.bind')).toStrictEqual({
          command: 'rangelink.terminal.bind',
          title: 'RangeLink: Bind Here',
          icon: '$(link)',
        });
      });

      it('rangelink.terminal.unbind', () => {
        expect(findCommand('rangelink.terminal.unbind')).toStrictEqual({
          command: 'rangelink.terminal.unbind',
          title: 'RangeLink: Unbind',
          icon: '$(close)',
        });
      });

      it('rangelink.editorContext.copyLink', () => {
        expect(findCommand('rangelink.editorContext.copyLink')).toStrictEqual({
          command: 'rangelink.editorContext.copyLink',
          title: 'RangeLink: Copy Range Link',
          icon: '$(link)',
        });
      });

      it('rangelink.editorContext.copyLinkAbsolute', () => {
        expect(findCommand('rangelink.editorContext.copyLinkAbsolute')).toStrictEqual({
          command: 'rangelink.editorContext.copyLinkAbsolute',
          title: 'RangeLink: Copy Range Link (Absolute)',
          icon: '$(link)',
        });
      });

      it('rangelink.editorContext.copyPortableLink', () => {
        expect(findCommand('rangelink.editorContext.copyPortableLink')).toStrictEqual({
          command: 'rangelink.editorContext.copyPortableLink',
          title: 'RangeLink: Copy Portable Link',
          icon: '$(link)',
        });
      });

      it('rangelink.editorContext.copyPortableLinkAbsolute', () => {
        expect(findCommand('rangelink.editorContext.copyPortableLinkAbsolute')).toStrictEqual({
          command: 'rangelink.editorContext.copyPortableLinkAbsolute',
          title: 'RangeLink: Copy Portable Link (Absolute)',
          icon: '$(link)',
        });
      });

      it('rangelink.editorContext.pasteSelectedText', () => {
        expect(findCommand('rangelink.editorContext.pasteSelectedText')).toStrictEqual({
          command: 'rangelink.editorContext.pasteSelectedText',
          title: 'RangeLink: Paste Selected Text',
          icon: '$(clippy)',
        });
      });

      it('rangelink.editorContext.saveBookmark', () => {
        expect(findCommand('rangelink.editorContext.saveBookmark')).toStrictEqual({
          command: 'rangelink.editorContext.saveBookmark',
          title: 'RangeLink: Save Selection as Bookmark',
          icon: '$(bookmark)',
        });
      });
    });

    it('has the expected number of commands', () => {
      expect(commands).toHaveLength(41);
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

    describe('warning settings', () => {
      it('rangelink.warnOnDirtyBuffer', () => {
        expect(properties['rangelink.warnOnDirtyBuffer']).toStrictEqual({
          type: 'boolean',
          default: true,
          description: 'Show warning when generating link from file with unsaved changes',
        });
      });
    });

    it('has the expected number of configuration properties', () => {
      expect(Object.keys(properties)).toHaveLength(9);
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

    it('rangelink.goToRangeLink keybinding', () => {
      expect(findKeybinding('rangelink.goToRangeLink')).toStrictEqual({
        command: 'rangelink.goToRangeLink',
        key: 'ctrl+r ctrl+g',
        mac: 'cmd+r cmd+g',
      });
    });

    it('rangelink.openStatusBarMenu keybinding', () => {
      expect(findKeybinding('rangelink.openStatusBarMenu')).toStrictEqual({
        command: 'rangelink.openStatusBarMenu',
        key: 'ctrl+r ctrl+m',
        mac: 'cmd+r cmd+m',
      });
    });

    it('has the expected number of keybindings', () => {
      expect(keybindings).toHaveLength(14);
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

      it('editorContext.copyLink at top of RangeLink group', () => {
        expect(editorContextMenu[0]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.editorContext.copyLink',
          group: '8_rangelink@0',
        });
      });

      it('editorContext.copyLinkAbsolute in context menu', () => {
        expect(editorContextMenu[1]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.editorContext.copyLinkAbsolute',
          group: '8_rangelink@1',
        });
      });

      it('editorContext.copyPortableLink in context menu', () => {
        expect(editorContextMenu[2]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.editorContext.copyPortableLink',
          group: '8_rangelink@2',
        });
      });

      it('editorContext.copyPortableLinkAbsolute in context menu', () => {
        expect(editorContextMenu[3]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.editorContext.copyPortableLinkAbsolute',
          group: '8_rangelink@3',
        });
      });

      it('editorContext.pasteSelectedText in context menu', () => {
        expect(editorContextMenu[4]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.editorContext.pasteSelectedText',
          group: '8_rangelink@4',
        });
      });

      it('editorContext.saveBookmark in context menu', () => {
        expect(editorContextMenu[5]).toStrictEqual({
          when: 'editorHasSelection',
          command: 'rangelink.editorContext.saveBookmark',
          group: '8_rangelink@5',
        });
      });

      it('editorContent.pasteFilePath in context menu', () => {
        expect(editorContextMenu[6]).toStrictEqual({
          command: 'rangelink.editorContent.pasteFilePath',
          group: '8_rangelink_files@0',
        });
      });

      it('editorContent.pasteRelativeFilePath in context menu', () => {
        expect(editorContextMenu[7]).toStrictEqual({
          command: 'rangelink.editorContent.pasteRelativeFilePath',
          group: '8_rangelink_files@1',
        });
      });

      it('editorContent.bind for text editors', () => {
        expect(editorContextMenu[8]).toStrictEqual({
          command: 'rangelink.editorContent.bind',
          group: '8_rangelink_files@2',
          when: 'resourceScheme == file || resourceScheme == untitled',
        });
      });

      it('editorContent.unbind shows when bound', () => {
        expect(editorContextMenu[9]).toStrictEqual({
          when: 'rangelink.isBound',
          command: 'rangelink.editorContent.unbind',
          group: '8_rangelink_files@3',
        });
      });
    });

    describe('editor/title/context', () => {
      const editorTitleContextMenu = packageJson.contributes.menus[
        'editor/title/context'
      ] as MenuContribution[];

      it('has the expected number of editor title context menu items', () => {
        expect(editorTitleContextMenu).toHaveLength(4);
      });

      it('editorTab.pasteFilePath in editor title context menu', () => {
        expect(editorTitleContextMenu[0]).toStrictEqual({
          command: 'rangelink.editorTab.pasteFilePath',
          group: '3_rangelink@1',
        });
      });

      it('editorTab.pasteRelativeFilePath in editor title context menu', () => {
        expect(editorTitleContextMenu[1]).toStrictEqual({
          command: 'rangelink.editorTab.pasteRelativeFilePath',
          group: '3_rangelink@2',
        });
      });

      it('editorContent.bind in editor title context menu', () => {
        expect(editorTitleContextMenu[2]).toStrictEqual({
          command: 'rangelink.editorContent.bind',
          group: '3_rangelink@3',
          when: 'resourceScheme == file || resourceScheme == untitled',
        });
      });

      it('editorContent.unbind in editor title context menu', () => {
        expect(editorTitleContextMenu[3]).toStrictEqual({
          when: 'rangelink.isBound',
          command: 'rangelink.editorContent.unbind',
          group: '3_rangelink@4',
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

      it('explorer.pasteFilePath in explorer context menu', () => {
        expect(explorerContextMenu[0]).toStrictEqual({
          command: 'rangelink.explorer.pasteFilePath',
          group: '6_copypath@1',
        });
      });

      it('explorer.pasteRelativeFilePath in explorer context menu', () => {
        expect(explorerContextMenu[1]).toStrictEqual({
          command: 'rangelink.explorer.pasteRelativeFilePath',
          group: '6_copypath@2',
        });
      });
    });

    describe('commandPalette', () => {
      const commandPalette = packageJson.contributes.menus['commandPalette'] as MenuContribution[];

      it('has the expected number of commandPalette entries', () => {
        expect(commandPalette).toHaveLength(20);
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

      it('explorer.pasteFilePath is hidden from command palette', () => {
        expect(commandPalette[4]).toStrictEqual({
          command: 'rangelink.explorer.pasteFilePath',
          when: 'false',
        });
      });

      it('explorer.pasteRelativeFilePath is hidden from command palette', () => {
        expect(commandPalette[5]).toStrictEqual({
          command: 'rangelink.explorer.pasteRelativeFilePath',
          when: 'false',
        });
      });

      it('editorTab.pasteFilePath is hidden from command palette', () => {
        expect(commandPalette[6]).toStrictEqual({
          command: 'rangelink.editorTab.pasteFilePath',
          when: 'false',
        });
      });

      it('editorTab.pasteRelativeFilePath is hidden from command palette', () => {
        expect(commandPalette[7]).toStrictEqual({
          command: 'rangelink.editorTab.pasteRelativeFilePath',
          when: 'false',
        });
      });

      it('editorContent.pasteFilePath is hidden from command palette', () => {
        expect(commandPalette[8]).toStrictEqual({
          command: 'rangelink.editorContent.pasteFilePath',
          when: 'false',
        });
      });

      it('editorContent.pasteRelativeFilePath is hidden from command palette', () => {
        expect(commandPalette[9]).toStrictEqual({
          command: 'rangelink.editorContent.pasteRelativeFilePath',
          when: 'false',
        });
      });

      it('editorContent.bind is hidden from command palette', () => {
        expect(commandPalette[10]).toStrictEqual({
          command: 'rangelink.editorContent.bind',
          when: 'false',
        });
      });

      it('editorContent.unbind is hidden from command palette', () => {
        expect(commandPalette[11]).toStrictEqual({
          command: 'rangelink.editorContent.unbind',
          when: 'false',
        });
      });

      it('editorContext.copyLink is hidden from command palette', () => {
        expect(commandPalette[12]).toStrictEqual({
          command: 'rangelink.editorContext.copyLink',
          when: 'false',
        });
      });

      it('editorContext.copyLinkAbsolute is hidden from command palette', () => {
        expect(commandPalette[13]).toStrictEqual({
          command: 'rangelink.editorContext.copyLinkAbsolute',
          when: 'false',
        });
      });

      it('editorContext.copyPortableLink is hidden from command palette', () => {
        expect(commandPalette[14]).toStrictEqual({
          command: 'rangelink.editorContext.copyPortableLink',
          when: 'false',
        });
      });

      it('editorContext.copyPortableLinkAbsolute is hidden from command palette', () => {
        expect(commandPalette[15]).toStrictEqual({
          command: 'rangelink.editorContext.copyPortableLinkAbsolute',
          when: 'false',
        });
      });

      it('editorContext.pasteSelectedText is hidden from command palette', () => {
        expect(commandPalette[16]).toStrictEqual({
          command: 'rangelink.editorContext.pasteSelectedText',
          when: 'false',
        });
      });

      it('editorContext.saveBookmark is hidden from command palette', () => {
        expect(commandPalette[17]).toStrictEqual({
          command: 'rangelink.editorContext.saveBookmark',
          when: 'false',
        });
      });

      it('terminal.bind is hidden from command palette', () => {
        expect(commandPalette[18]).toStrictEqual({
          command: 'rangelink.terminal.bind',
          when: 'false',
        });
      });

      it('terminal.unbind is hidden from command palette', () => {
        expect(commandPalette[19]).toStrictEqual({
          command: 'rangelink.terminal.unbind',
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

      it('terminal.bind is always visible', () => {
        expect(terminalTitleContextMenu[0]).toStrictEqual({
          command: 'rangelink.terminal.bind',
          group: 'rangelink@1',
        });
      });

      it('terminal.unbind shows when any destination bound', () => {
        expect(terminalTitleContextMenu[1]).toStrictEqual({
          when: 'rangelink.isBound',
          command: 'rangelink.terminal.unbind',
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

      it('terminal.bind is always visible', () => {
        expect(terminalContextMenu[0]).toStrictEqual({
          command: 'rangelink.terminal.bind',
          group: 'rangelink@1',
        });
      });

      it('terminal.unbind shows when any destination bound', () => {
        expect(terminalContextMenu[1]).toStrictEqual({
          when: 'rangelink.isBound',
          command: 'rangelink.terminal.unbind',
          group: 'rangelink@2',
        });
      });
    });
  });
});
