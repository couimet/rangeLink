import {
  CMD_BIND_TO_CLAUDE_CODE,
  CMD_BIND_TO_CURSOR_AI,
  CMD_BIND_TO_DESTINATION,
  CMD_BIND_TO_GITHUB_COPILOT_CHAT,
  CMD_BIND_TO_TERMINAL,
  CMD_BIND_TO_TERMINAL_HERE,
  CMD_BIND_TO_TEXT_EDITOR,
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_BOOKMARK_ADD,
  CMD_BOOKMARK_LIST,
  CMD_BOOKMARK_MANAGE,
  CMD_CONTEXT_EDITOR_CONTENT_BIND,
  CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH,
  CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH,
  CMD_CONTEXT_EDITOR_CONTENT_UNBIND,
  CMD_CONTEXT_EDITOR_COPY_LINK,
  CMD_CONTEXT_EDITOR_COPY_LINK_ABSOLUTE,
  CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK,
  CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK_ABSOLUTE,
  CMD_CONTEXT_EDITOR_PASTE_SELECTED_TEXT,
  CMD_CONTEXT_EDITOR_SAVE_BOOKMARK,
  CMD_CONTEXT_EDITOR_TAB_PASTE_FILE_PATH,
  CMD_CONTEXT_EDITOR_TAB_PASTE_RELATIVE_FILE_PATH,
  CMD_CONTEXT_EXPLORER_BIND,
  CMD_CONTEXT_EXPLORER_PASTE_FILE_PATH,
  CMD_CONTEXT_EXPLORER_PASTE_RELATIVE_FILE_PATH,
  CMD_CONTEXT_EXPLORER_UNBIND,
  CMD_CONTEXT_TERMINAL_BIND,
  CMD_CONTEXT_TERMINAL_UNBIND,
  CMD_COPY_LINK_ABSOLUTE,
  CMD_COPY_LINK_ONLY_ABSOLUTE,
  CMD_COPY_LINK_ONLY_RELATIVE,
  CMD_COPY_LINK_RELATIVE,
  CMD_COPY_PORTABLE_LINK_ABSOLUTE,
  CMD_COPY_PORTABLE_LINK_RELATIVE,
  CMD_GO_TO_RANGELINK,
  CMD_HANDLE_DOCUMENT_LINK_CLICK,
  CMD_HANDLE_FILE_PATH_CLICK,
  CMD_JUMP_TO_DESTINATION,
  CMD_OPEN_STATUS_BAR_MENU,
  CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
  CMD_PASTE_FILE_PATH_ABSOLUTE,
  CMD_PASTE_FILE_PATH_RELATIVE,
  CMD_PASTE_TO_DESTINATION,
  CMD_SHOW_VERSION,
  CMD_TERMINAL_COPY_LINK_GUARD,
  CMD_TERMINAL_LINK_BRIDGE,
  CMD_TERMINAL_PASTE_SELECTED_TEXT,
  CMD_UNBIND_DESTINATION,
} from '../constants';
import { wireSubscriptions } from '../wireSubscriptions';

import {
  createMockSubscriptionRegistrar,
  createMockUri,
  createMockWiringServices,
} from './helpers';

const EXPECTED_COMMANDS = [
  CMD_OPEN_STATUS_BAR_MENU,
  CMD_COPY_LINK_RELATIVE,
  CMD_COPY_LINK_ABSOLUTE,
  CMD_COPY_PORTABLE_LINK_RELATIVE,
  CMD_COPY_PORTABLE_LINK_ABSOLUTE,
  CMD_COPY_LINK_ONLY_RELATIVE,
  CMD_COPY_LINK_ONLY_ABSOLUTE,
  CMD_PASTE_TO_DESTINATION,
  CMD_SHOW_VERSION,
  CMD_BIND_TO_TERMINAL,
  CMD_BIND_TO_TERMINAL_HERE,
  CMD_BIND_TO_TEXT_EDITOR,
  CMD_BIND_TO_TEXT_EDITOR_HERE,
  CMD_BIND_TO_CURSOR_AI,
  CMD_BIND_TO_CLAUDE_CODE,
  CMD_BIND_TO_GITHUB_COPILOT_CHAT,
  CMD_UNBIND_DESTINATION,
  CMD_BIND_TO_DESTINATION,
  CMD_JUMP_TO_DESTINATION,
  CMD_HANDLE_DOCUMENT_LINK_CLICK,
  CMD_HANDLE_FILE_PATH_CLICK,
  CMD_GO_TO_RANGELINK,
  CMD_BOOKMARK_ADD,
  CMD_BOOKMARK_LIST,
  CMD_BOOKMARK_MANAGE,
  CMD_PASTE_FILE_PATH_ABSOLUTE,
  CMD_PASTE_FILE_PATH_RELATIVE,
  CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE,
  CMD_PASTE_CURRENT_FILE_PATH_RELATIVE,
  CMD_CONTEXT_EXPLORER_PASTE_FILE_PATH,
  CMD_CONTEXT_EXPLORER_PASTE_RELATIVE_FILE_PATH,
  CMD_CONTEXT_EXPLORER_BIND,
  CMD_CONTEXT_EXPLORER_UNBIND,
  CMD_CONTEXT_EDITOR_TAB_PASTE_FILE_PATH,
  CMD_CONTEXT_EDITOR_TAB_PASTE_RELATIVE_FILE_PATH,
  CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH,
  CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH,
  CMD_CONTEXT_EDITOR_CONTENT_BIND,
  CMD_CONTEXT_EDITOR_CONTENT_UNBIND,
  CMD_CONTEXT_TERMINAL_BIND,
  CMD_CONTEXT_TERMINAL_UNBIND,
  CMD_TERMINAL_PASTE_SELECTED_TEXT,
  CMD_TERMINAL_LINK_BRIDGE,
  CMD_TERMINAL_COPY_LINK_GUARD,
  CMD_CONTEXT_EDITOR_COPY_LINK,
  CMD_CONTEXT_EDITOR_COPY_LINK_ABSOLUTE,
  CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK,
  CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK_ABSOLUTE,
  CMD_CONTEXT_EDITOR_PASTE_SELECTED_TEXT,
  CMD_CONTEXT_EDITOR_SAVE_BOOKMARK,
];

const DOCUMENT_SELECTOR = [{ scheme: 'file' }, { scheme: 'untitled' }];

describe('wireSubscriptions', () => {
  let registrar: ReturnType<typeof createMockSubscriptionRegistrar>;
  let services: ReturnType<typeof createMockWiringServices>;

  beforeEach(() => {
    registrar = createMockSubscriptionRegistrar();
    services = createMockWiringServices();
    wireSubscriptions(registrar, services);
  });

  it('registers all expected commands', () => {
    const registeredCommands = registrar.registerCommand.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );

    for (const cmd of EXPECTED_COMMANDS) {
      expect(registeredCommands).toContain(cmd);
    }

    expect(registeredCommands).toHaveLength(50);
  });

  it('registers 2 terminal link providers', () => {
    expect(registrar.registerTerminalLinkProvider).toHaveBeenCalledTimes(2);
  });

  it('registers 2 document link providers with file+untitled schemes', () => {
    expect(registrar.registerDocumentLinkProvider).toHaveBeenCalledTimes(2);

    const calls = registrar.registerDocumentLinkProvider.mock.calls;
    expect(calls[0][0]).toStrictEqual(DOCUMENT_SELECTOR);
    expect(calls[1][0]).toStrictEqual(DOCUMENT_SELECTOR);
  });

  it('pushes 3 disposables (delimiterCache, statusBar, destinationManager)', () => {
    expect(registrar.pushDisposable).toHaveBeenCalledTimes(3);
  });

  describe('closure delegation', () => {
    it('CMD_COPY_LINK_RELATIVE delegates to linkGenerator.createLink with WorkspaceRelative', () => {
      registrar.getHandler(CMD_COPY_LINK_RELATIVE)();
      expect(services.linkGenerator.createLink).toHaveBeenCalledWith('workspace-relative');
    });

    it('CMD_COPY_LINK_ABSOLUTE delegates to linkGenerator.createLink with Absolute', () => {
      registrar.getHandler(CMD_COPY_LINK_ABSOLUTE)();
      expect(services.linkGenerator.createLink).toHaveBeenCalledWith('absolute');
    });

    it('CMD_OPEN_STATUS_BAR_MENU delegates to statusBar.openMenu', () => {
      registrar.getHandler(CMD_OPEN_STATUS_BAR_MENU)();
      expect(services.statusBar.openMenu).toHaveBeenCalledTimes(1);
    });

    it('CMD_PASTE_TO_DESTINATION delegates to textSelectionPaster', () => {
      registrar.getHandler(CMD_PASTE_TO_DESTINATION)();
      expect(services.textSelectionPaster.pasteSelectedTextToDestination).toHaveBeenCalledTimes(1);
    });

    it('CMD_SHOW_VERSION delegates to showVersionCommand.execute', () => {
      registrar.getHandler(CMD_SHOW_VERSION)();
      expect(services.showVersionCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('CMD_UNBIND_DESTINATION delegates to destinationManager.unbind', () => {
      registrar.getHandler(CMD_UNBIND_DESTINATION)();
      expect(services.destinationManager.unbind).toHaveBeenCalledTimes(1);
    });

    it('CMD_TERMINAL_PASTE_SELECTED_TEXT delegates to terminalSelectionService', () => {
      registrar.getHandler(CMD_TERMINAL_PASTE_SELECTED_TEXT)();
      expect(services.terminalSelectionService.pasteTerminalSelectionToDestination).toHaveBeenCalledTimes(1);
    });

    it('CMD_BOOKMARK_ADD delegates to addBookmarkCommand.execute', () => {
      registrar.getHandler(CMD_BOOKMARK_ADD)();
      expect(services.addBookmarkCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('CMD_PASTE_FILE_PATH_ABSOLUTE delegates to filePathPaster with uri and Absolute', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      registrar.getHandler(CMD_PASTE_FILE_PATH_ABSOLUTE)(mockUri);
      expect(services.filePathPaster.pasteFilePathToDestination).toHaveBeenCalledWith(
        mockUri,
        'absolute',
      );
    });

    it('CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH calls pasteFilePathToDestination when uri provided', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      registrar.getHandler(CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH)(mockUri);
      expect(services.filePathPaster.pasteFilePathToDestination).toHaveBeenCalledWith(
        mockUri,
        'absolute',
      );
    });

    it('CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH calls pasteCurrentFilePathToDestination when no uri', () => {
      registrar.getHandler(CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH)(undefined);
      expect(services.filePathPaster.pasteCurrentFilePathToDestination).toHaveBeenCalledWith(
        'absolute',
      );
    });

    it('CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH calls pasteFilePathToDestination when uri provided', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      registrar.getHandler(CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH)(mockUri);
      expect(services.filePathPaster.pasteFilePathToDestination).toHaveBeenCalledWith(
        mockUri,
        'workspace-relative',
      );
    });

    it('CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH calls pasteCurrentFilePathToDestination when no uri', () => {
      registrar.getHandler(CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH)(undefined);
      expect(services.filePathPaster.pasteCurrentFilePathToDestination).toHaveBeenCalledWith(
        'workspace-relative',
      );
    });

    it('CMD_COPY_PORTABLE_LINK_RELATIVE delegates to linkGenerator.createPortableLink', () => {
      registrar.getHandler(CMD_COPY_PORTABLE_LINK_RELATIVE)();
      expect(services.linkGenerator.createPortableLink).toHaveBeenCalledWith('workspace-relative');
    });

    it('CMD_COPY_PORTABLE_LINK_ABSOLUTE delegates to linkGenerator.createPortableLink', () => {
      registrar.getHandler(CMD_COPY_PORTABLE_LINK_ABSOLUTE)();
      expect(services.linkGenerator.createPortableLink).toHaveBeenCalledWith('absolute');
    });

    it('CMD_COPY_LINK_ONLY_RELATIVE delegates to linkGenerator.createLinkOnly', () => {
      registrar.getHandler(CMD_COPY_LINK_ONLY_RELATIVE)();
      expect(services.linkGenerator.createLinkOnly).toHaveBeenCalledWith('workspace-relative');
    });

    it('CMD_COPY_LINK_ONLY_ABSOLUTE delegates to linkGenerator.createLinkOnly', () => {
      registrar.getHandler(CMD_COPY_LINK_ONLY_ABSOLUTE)();
      expect(services.linkGenerator.createLinkOnly).toHaveBeenCalledWith('absolute');
    });

    it('CMD_GO_TO_RANGELINK delegates to goToRangeLinkCommand.execute', () => {
      registrar.getHandler(CMD_GO_TO_RANGELINK)();
      expect(services.goToRangeLinkCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('CMD_BOOKMARK_LIST delegates to listBookmarksCommand.execute', () => {
      registrar.getHandler(CMD_BOOKMARK_LIST)();
      expect(services.listBookmarksCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('CMD_BOOKMARK_MANAGE delegates to manageBookmarksCommand.execute', () => {
      registrar.getHandler(CMD_BOOKMARK_MANAGE)();
      expect(services.manageBookmarksCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('CMD_TERMINAL_LINK_BRIDGE delegates to terminalSelectionService.terminalLinkBridge', () => {
      registrar.getHandler(CMD_TERMINAL_LINK_BRIDGE)();
      expect(services.terminalSelectionService.terminalLinkBridge).toHaveBeenCalledTimes(1);
    });

    it('CMD_TERMINAL_COPY_LINK_GUARD delegates to terminalSelectionService.terminalCopyLinkGuard', () => {
      registrar.getHandler(CMD_TERMINAL_COPY_LINK_GUARD)();
      expect(services.terminalSelectionService.terminalCopyLinkGuard).toHaveBeenCalledTimes(1);
    });

    it('CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE delegates to filePathPaster.pasteCurrentFilePathToDestination', () => {
      registrar.getHandler(CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE)();
      expect(services.filePathPaster.pasteCurrentFilePathToDestination).toHaveBeenCalledWith('absolute');
    });

    it('CMD_PASTE_CURRENT_FILE_PATH_RELATIVE delegates to filePathPaster.pasteCurrentFilePathToDestination', () => {
      registrar.getHandler(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE)();
      expect(services.filePathPaster.pasteCurrentFilePathToDestination).toHaveBeenCalledWith('workspace-relative');
    });

    it('CMD_CONTEXT_EDITOR_COPY_LINK delegates to linkGenerator.createLink', () => {
      registrar.getHandler(CMD_CONTEXT_EDITOR_COPY_LINK)();
      expect(services.linkGenerator.createLink).toHaveBeenCalledWith('workspace-relative');
    });

    it('CMD_CONTEXT_EDITOR_COPY_LINK_ABSOLUTE delegates to linkGenerator.createLink', () => {
      registrar.getHandler(CMD_CONTEXT_EDITOR_COPY_LINK_ABSOLUTE)();
      expect(services.linkGenerator.createLink).toHaveBeenCalledWith('absolute');
    });

    it('CMD_CONTEXT_EDITOR_PASTE_SELECTED_TEXT delegates to textSelectionPaster', () => {
      registrar.getHandler(CMD_CONTEXT_EDITOR_PASTE_SELECTED_TEXT)();
      expect(services.textSelectionPaster.pasteSelectedTextToDestination).toHaveBeenCalledTimes(1);
    });

    it('CMD_CONTEXT_EDITOR_SAVE_BOOKMARK delegates to addBookmarkCommand.execute', () => {
      registrar.getHandler(CMD_CONTEXT_EDITOR_SAVE_BOOKMARK)();
      expect(services.addBookmarkCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK delegates to linkGenerator.createPortableLink', () => {
      registrar.getHandler(CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK)();
      expect(services.linkGenerator.createPortableLink).toHaveBeenCalledWith('workspace-relative');
    });

    it('CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK_ABSOLUTE delegates to linkGenerator.createPortableLink', () => {
      registrar.getHandler(CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK_ABSOLUTE)();
      expect(services.linkGenerator.createPortableLink).toHaveBeenCalledWith('absolute');
    });

    it('CMD_BIND_TO_TERMINAL delegates to bindToTerminalCommand.execute', async () => {
      await registrar.getHandler(CMD_BIND_TO_TERMINAL)();
      expect(services.bindToTerminalCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('CMD_BIND_TO_DESTINATION delegates to bindToDestinationCommand.execute', async () => {
      await registrar.getHandler(CMD_BIND_TO_DESTINATION)();
      expect(services.bindToDestinationCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('CMD_JUMP_TO_DESTINATION delegates to jumpToDestinationCommand.execute', async () => {
      await registrar.getHandler(CMD_JUMP_TO_DESTINATION)();
      expect(services.jumpToDestinationCommand.execute).toHaveBeenCalledTimes(1);
    });

    it('CMD_HANDLE_DOCUMENT_LINK_CLICK delegates to documentLinkProvider.handleLinkClick', () => {
      const mockArgs = { linkText: 'file.ts#L1', parsedLink: {} };
      registrar.getHandler(CMD_HANDLE_DOCUMENT_LINK_CLICK)(mockArgs);
      expect(services.documentLinkProvider.handleLinkClick).toHaveBeenCalledWith(mockArgs);
    });

    it('CMD_HANDLE_FILE_PATH_CLICK delegates to filePathDocumentProvider.handleLinkClick', () => {
      const mockArgs = { path: '/workspace/file.ts' };
      registrar.getHandler(CMD_HANDLE_FILE_PATH_CLICK)(mockArgs);
      expect(services.filePathDocumentProvider.handleLinkClick).toHaveBeenCalledWith(mockArgs);
    });

    it('CMD_PASTE_FILE_PATH_RELATIVE delegates to filePathPaster with WorkspaceRelative', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      registrar.getHandler(CMD_PASTE_FILE_PATH_RELATIVE)(mockUri);
      expect(services.filePathPaster.pasteFilePathToDestination).toHaveBeenCalledWith(
        mockUri,
        'workspace-relative',
      );
    });

    it('CMD_CONTEXT_EXPLORER_PASTE_FILE_PATH delegates to filePathPaster with absolute', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      registrar.getHandler(CMD_CONTEXT_EXPLORER_PASTE_FILE_PATH)(mockUri);
      expect(services.filePathPaster.pasteFilePathToDestination).toHaveBeenCalledWith(
        mockUri,
        'absolute',
      );
    });

    it('CMD_CONTEXT_EXPLORER_PASTE_RELATIVE_FILE_PATH delegates to filePathPaster with workspace-relative', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      registrar.getHandler(CMD_CONTEXT_EXPLORER_PASTE_RELATIVE_FILE_PATH)(mockUri);
      expect(services.filePathPaster.pasteFilePathToDestination).toHaveBeenCalledWith(
        mockUri,
        'workspace-relative',
      );
    });

    it('CMD_CONTEXT_EXPLORER_UNBIND delegates to destinationManager.unbind', () => {
      registrar.getHandler(CMD_CONTEXT_EXPLORER_UNBIND)();
      expect(services.destinationManager.unbind).toHaveBeenCalledTimes(1);
    });

    it('CMD_CONTEXT_EDITOR_TAB_PASTE_FILE_PATH delegates to filePathPaster with absolute', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      registrar.getHandler(CMD_CONTEXT_EDITOR_TAB_PASTE_FILE_PATH)(mockUri);
      expect(services.filePathPaster.pasteFilePathToDestination).toHaveBeenCalledWith(
        mockUri,
        'absolute',
      );
    });

    it('CMD_CONTEXT_EDITOR_TAB_PASTE_RELATIVE_FILE_PATH delegates to filePathPaster with workspace-relative', () => {
      const mockUri = createMockUri('/workspace/src/file.ts');
      registrar.getHandler(CMD_CONTEXT_EDITOR_TAB_PASTE_RELATIVE_FILE_PATH)(mockUri);
      expect(services.filePathPaster.pasteFilePathToDestination).toHaveBeenCalledWith(
        mockUri,
        'workspace-relative',
      );
    });

    it('CMD_CONTEXT_EDITOR_CONTENT_UNBIND delegates to destinationManager.unbind', () => {
      registrar.getHandler(CMD_CONTEXT_EDITOR_CONTENT_UNBIND)();
      expect(services.destinationManager.unbind).toHaveBeenCalledTimes(1);
    });

    it('CMD_CONTEXT_TERMINAL_UNBIND delegates to destinationManager.unbind', () => {
      registrar.getHandler(CMD_CONTEXT_TERMINAL_UNBIND)();
      expect(services.destinationManager.unbind).toHaveBeenCalledTimes(1);
    });
  });
});
