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
      it('rangelink.explorer.bind', () => {
        expect(findCommand('rangelink.explorer.bind')).toStrictEqual({
          command: 'rangelink.explorer.bind',
          title: 'RangeLink: Bind Here',
          icon: '$(link)',
        });
      });

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

      it('rangelink.explorer.unbind', () => {
        expect(findCommand('rangelink.explorer.unbind')).toStrictEqual({
          command: 'rangelink.explorer.unbind',
          title: 'RangeLink: Unbind Destination',
          icon: '$(link)',
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
      expect(commands).toHaveLength(42);
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
    it('defines all expected keybindings', () => {
      const keybindings = packageJson.contributes.keybindings as KeybindingContribution[];

      const expectedKeybindings: KeybindingContribution[] = [
        { command: 'rangelink.bookmark.add', key: 'ctrl+r ctrl+b ctrl+s', mac: 'cmd+r cmd+b cmd+s', when: 'editorHasSelection' },
        { command: 'rangelink.bookmark.list', key: 'ctrl+r ctrl+b ctrl+l', mac: 'cmd+r cmd+b cmd+l' },
        { command: 'rangelink.copyLinkOnlyWithAbsolutePath', key: 'ctrl+r ctrl+shift+c', mac: 'cmd+r cmd+shift+c', when: 'editorHasSelection' },
        { command: 'rangelink.copyLinkOnlyWithRelativePath', key: 'ctrl+r ctrl+c', mac: 'cmd+r cmd+c', when: 'editorHasSelection' },
        { command: 'rangelink.copyLinkWithAbsolutePath', key: 'ctrl+r ctrl+shift+l', mac: 'cmd+r cmd+shift+l', when: 'editorHasSelection' },
        { command: 'rangelink.copyLinkWithRelativePath', key: 'ctrl+r ctrl+l', mac: 'cmd+r cmd+l', when: 'editorHasSelection' },
        { command: 'rangelink.copyPortableLinkWithAbsolutePath', key: 'ctrl+r ctrl+shift+p', mac: 'cmd+r cmd+shift+p', when: 'editorHasSelection' },
        { command: 'rangelink.copyPortableLinkWithRelativePath', key: 'ctrl+r ctrl+p', mac: 'cmd+r cmd+p', when: 'editorHasSelection' },
        { command: 'rangelink.goToRangeLink', key: 'ctrl+r ctrl+g', mac: 'cmd+r cmd+g' },
        { command: 'rangelink.jumpToBoundDestination', key: 'ctrl+r ctrl+j', mac: 'cmd+r cmd+j' },
        { command: 'rangelink.pasteCurrentFileAbsolutePath', key: 'ctrl+r ctrl+shift+f', mac: 'cmd+r cmd+shift+f', when: 'editorIsOpen' },
        { command: 'rangelink.pasteCurrentFileRelativePath', key: 'ctrl+r ctrl+f', mac: 'cmd+r cmd+f', when: 'editorIsOpen' },
        { command: 'rangelink.pasteSelectedTextToDestination', key: 'ctrl+r ctrl+v', mac: 'cmd+r cmd+v', when: 'editorHasSelection' },
      ];

      const sortByCommand = (a: KeybindingContribution, b: KeybindingContribution) =>
        a.command.localeCompare(b.command);

      expect([...keybindings].sort(sortByCommand)).toStrictEqual(expectedKeybindings.sort(sortByCommand));
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
        expect(explorerContextMenu).toHaveLength(4);
      });

      it('explorer.pasteFilePath in explorer context menu', () => {
        expect(explorerContextMenu[0]).toStrictEqual({
          command: 'rangelink.explorer.pasteFilePath',
          group: '6_copypath@100',
        });
      });

      it('explorer.pasteRelativeFilePath in explorer context menu', () => {
        expect(explorerContextMenu[1]).toStrictEqual({
          command: 'rangelink.explorer.pasteRelativeFilePath',
          group: '6_copypath@101',
        });
      });

      it('explorer.bind in explorer context menu for non-folder items', () => {
        expect(explorerContextMenu[2]).toStrictEqual({
          command: 'rangelink.explorer.bind',
          group: '6_copypath@102',
          when: 'explorerResourceIsFolder == false',
        });
      });

      it('explorer.unbind shows when bound and not a folder', () => {
        expect(explorerContextMenu[3]).toStrictEqual({
          command: 'rangelink.explorer.unbind',
          group: '6_copypath@103',
          when: 'rangelink.isBound && explorerResourceIsFolder == false',
        });
      });
    });

    describe('commandPalette', () => {
      /**
       * VSCode convention: commands are visible in the palette by default.
       * The commandPalette menu section is ONLY used to hide commands
       * (via `when: "false"`). Commands not listed here remain visible.
       */
      it('lists all context-menu-only commands with when:false to hide them', () => {
        const commandPalette = packageJson.contributes.menus[
          'commandPalette'
        ] as MenuContribution[];

        const actualCommands = commandPalette.map((entry) => entry.command).sort();

        const expectedHiddenCommands = [
          'rangelink.bindToTerminalHere',
          'rangelink.editorContent.bind',
          'rangelink.editorContent.pasteFilePath',
          'rangelink.editorContent.pasteRelativeFilePath',
          'rangelink.editorContent.unbind',
          'rangelink.editorContext.copyLink',
          'rangelink.editorContext.copyLinkAbsolute',
          'rangelink.editorContext.copyPortableLink',
          'rangelink.editorContext.copyPortableLinkAbsolute',
          'rangelink.editorContext.pasteSelectedText',
          'rangelink.editorContext.saveBookmark',
          'rangelink.editorTab.pasteFilePath',
          'rangelink.editorTab.pasteRelativeFilePath',
          'rangelink.explorer.bind',
          'rangelink.explorer.pasteFilePath',
          'rangelink.explorer.pasteRelativeFilePath',
          'rangelink.explorer.unbind',
          'rangelink.pasteFileAbsolutePath',
          'rangelink.pasteFileRelativePath',
          'rangelink.terminal.bind',
          'rangelink.terminal.unbind',
        ].sort();

        expect(actualCommands).toStrictEqual(expectedHiddenCommands);

        for (const entry of commandPalette) {
          expect(entry.when).toBe('false');
        }
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
