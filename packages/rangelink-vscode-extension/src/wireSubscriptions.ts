import type * as vscode from 'vscode';

import { createBindAIAssistantCommand } from './commands/createBindAIAssistantCommand';
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
} from './constants';
import type { WiringServices } from './createWiringServices';
import type { SubscriptionRegistrar } from './SubscriptionRegistrar';
import { type FilePathClickArgs, PathFormat, type RangeLinkClickArgs } from './types';

/**
 * Wire all commands and providers into subscriptions.
 * Pure wiring — receives pre-built services and a registrar abstraction.
 */
export const wireSubscriptions = (
  registrar: SubscriptionRegistrar,
  services: WiringServices,
): void => {
  const {
    ideAdapter,
    logger,
    availabilityService,
    destinationManager,
    statusBar,
    linkGenerator,
    textSelectionPaster,
    filePathPaster,
    terminalSelectionService,
    bindToTerminalCommand,
    bindToTextEditorCommand,
    showVersionCommand,
    bindToDestinationCommand,
    jumpToDestinationCommand,
    goToRangeLinkCommand,
    addBookmarkCommand,
    listBookmarksCommand,
    manageBookmarksCommand,
    filePathTerminalProvider,
    filePathDocumentProvider,
    terminalLinkProvider,
    documentLinkProvider,
    delimiterCache,
  } = services;

  const bindToTerminalHandler = async (terminal?: unknown) => {
    await bindToTerminalCommand.execute(terminal as vscode.Terminal | undefined);
  };
  const bindToTextEditorHandler = async (uri?: unknown) => {
    await bindToTextEditorCommand.execute(uri as vscode.Uri | undefined);
  };

  // Disposables
  registrar.pushDisposable(delimiterCache);
  registrar.pushDisposable(statusBar);
  registrar.pushDisposable(destinationManager);

  // Link providers
  registrar.registerTerminalLinkProvider(
    filePathTerminalProvider,
    'File path terminal link provider registered',
  );
  registrar.registerDocumentLinkProvider(
    [{ scheme: 'file' }, { scheme: 'untitled' }],
    filePathDocumentProvider,
    'File path document link provider registered',
  );
  registrar.registerTerminalLinkProvider(terminalLinkProvider, 'Terminal link provider registered');
  registrar.registerDocumentLinkProvider(
    [{ scheme: 'file' }, { scheme: 'untitled' }],
    documentLinkProvider,
    'Document link provider registered',
  );

  // Commands
  registrar.registerCommand(CMD_OPEN_STATUS_BAR_MENU, () => statusBar.openMenu());
  registrar.registerCommand(CMD_COPY_LINK_RELATIVE, () =>
    linkGenerator.createLink(PathFormat.WorkspaceRelative),
  );
  registrar.registerCommand(CMD_COPY_LINK_ABSOLUTE, () =>
    linkGenerator.createLink(PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_COPY_PORTABLE_LINK_RELATIVE, () =>
    linkGenerator.createPortableLink(PathFormat.WorkspaceRelative),
  );
  registrar.registerCommand(CMD_COPY_PORTABLE_LINK_ABSOLUTE, () =>
    linkGenerator.createPortableLink(PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_COPY_LINK_ONLY_RELATIVE, () =>
    linkGenerator.createLinkOnly(PathFormat.WorkspaceRelative),
  );
  registrar.registerCommand(CMD_COPY_LINK_ONLY_ABSOLUTE, () =>
    linkGenerator.createLinkOnly(PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_PASTE_TO_DESTINATION, () =>
    textSelectionPaster.pasteSelectedTextToDestination(),
  );
  registrar.registerCommand(CMD_SHOW_VERSION, () => showVersionCommand.execute());
  registrar.registerCommand(CMD_BIND_TO_TERMINAL, bindToTerminalHandler);
  registrar.registerCommand(CMD_BIND_TO_TERMINAL_HERE, bindToTerminalHandler);
  registrar.registerCommand(CMD_BIND_TO_TEXT_EDITOR, bindToTextEditorHandler);
  registrar.registerCommand(CMD_BIND_TO_TEXT_EDITOR_HERE, bindToTextEditorHandler);

  for (const [cmd, kind] of [
    [CMD_BIND_TO_CURSOR_AI, 'cursor-ai'],
    [CMD_BIND_TO_CLAUDE_CODE, 'claude-code'],
    [CMD_BIND_TO_GITHUB_COPILOT_CHAT, 'github-copilot-chat'],
  ] as const) {
    registrar.registerCommand(
      cmd,
      createBindAIAssistantCommand(
        kind,
        availabilityService,
        destinationManager,
        ideAdapter,
        logger,
      ),
    );
  }

  registrar.registerCommand(CMD_UNBIND_DESTINATION, () => {
    destinationManager.unbind();
  });
  registrar.registerCommand(CMD_BIND_TO_DESTINATION, async () => {
    await bindToDestinationCommand.execute();
  });
  registrar.registerCommand(CMD_JUMP_TO_DESTINATION, async () => {
    await jumpToDestinationCommand.execute();
  });
  registrar.registerCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, (args) =>
    documentLinkProvider.handleLinkClick(args as RangeLinkClickArgs),
  );
  registrar.registerCommand(CMD_HANDLE_FILE_PATH_CLICK, (args) =>
    filePathDocumentProvider.handleLinkClick(args as FilePathClickArgs),
  );
  registrar.registerCommand(CMD_GO_TO_RANGELINK, () => goToRangeLinkCommand.execute());
  registrar.registerCommand(CMD_BOOKMARK_ADD, () => addBookmarkCommand.execute());
  registrar.registerCommand(CMD_BOOKMARK_LIST, () => listBookmarksCommand.execute());
  registrar.registerCommand(CMD_BOOKMARK_MANAGE, () => manageBookmarksCommand.execute());

  registrar.registerCommand(CMD_PASTE_FILE_PATH_ABSOLUTE, (uri) =>
    filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_PASTE_FILE_PATH_RELATIVE, (uri) =>
    filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.WorkspaceRelative),
  );
  registrar.registerCommand(CMD_PASTE_CURRENT_FILE_PATH_ABSOLUTE, () =>
    filePathPaster.pasteCurrentFilePathToDestination(PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_PASTE_CURRENT_FILE_PATH_RELATIVE, () =>
    filePathPaster.pasteCurrentFilePathToDestination(PathFormat.WorkspaceRelative),
  );

  registrar.registerCommand(CMD_CONTEXT_EXPLORER_PASTE_FILE_PATH, (uri) =>
    filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_CONTEXT_EXPLORER_PASTE_RELATIVE_FILE_PATH, (uri) =>
    filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.WorkspaceRelative),
  );
  registrar.registerCommand(CMD_CONTEXT_EXPLORER_BIND, bindToTextEditorHandler);
  registrar.registerCommand(CMD_CONTEXT_EXPLORER_UNBIND, () => {
    destinationManager.unbind();
  });

  registrar.registerCommand(CMD_CONTEXT_EDITOR_TAB_PASTE_FILE_PATH, (uri) =>
    filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_CONTEXT_EDITOR_TAB_PASTE_RELATIVE_FILE_PATH, (uri) =>
    filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.WorkspaceRelative),
  );

  registrar.registerCommand(CMD_CONTEXT_EDITOR_CONTENT_PASTE_FILE_PATH, (uri) =>
    uri
      ? filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.Absolute)
      : filePathPaster.pasteCurrentFilePathToDestination(PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_CONTEXT_EDITOR_CONTENT_PASTE_RELATIVE_FILE_PATH, (uri) =>
    uri
      ? filePathPaster.pasteFilePathToDestination(uri as vscode.Uri, PathFormat.WorkspaceRelative)
      : filePathPaster.pasteCurrentFilePathToDestination(PathFormat.WorkspaceRelative),
  );
  registrar.registerCommand(CMD_CONTEXT_EDITOR_CONTENT_BIND, bindToTextEditorHandler);
  registrar.registerCommand(CMD_CONTEXT_EDITOR_CONTENT_UNBIND, () => {
    destinationManager.unbind();
  });

  registrar.registerCommand(CMD_CONTEXT_TERMINAL_BIND, bindToTerminalHandler);
  registrar.registerCommand(CMD_CONTEXT_TERMINAL_UNBIND, () => {
    destinationManager.unbind();
  });

  registrar.registerCommand(CMD_TERMINAL_PASTE_SELECTED_TEXT, () =>
    terminalSelectionService.pasteTerminalSelectionToDestination(),
  );
  registrar.registerCommand(CMD_TERMINAL_LINK_BRIDGE, () =>
    terminalSelectionService.terminalLinkBridge(),
  );
  registrar.registerCommand(CMD_TERMINAL_COPY_LINK_GUARD, () =>
    terminalSelectionService.terminalCopyLinkGuard(),
  );

  registrar.registerCommand(CMD_CONTEXT_EDITOR_COPY_LINK, () =>
    linkGenerator.createLink(PathFormat.WorkspaceRelative),
  );
  registrar.registerCommand(CMD_CONTEXT_EDITOR_COPY_LINK_ABSOLUTE, () =>
    linkGenerator.createLink(PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK, () =>
    linkGenerator.createPortableLink(PathFormat.WorkspaceRelative),
  );
  registrar.registerCommand(CMD_CONTEXT_EDITOR_COPY_PORTABLE_LINK_ABSOLUTE, () =>
    linkGenerator.createPortableLink(PathFormat.Absolute),
  );
  registrar.registerCommand(CMD_CONTEXT_EDITOR_PASTE_SELECTED_TEXT, () =>
    textSelectionPaster.pasteSelectedTextToDestination(),
  );
  registrar.registerCommand(CMD_CONTEXT_EDITOR_SAVE_BOOKMARK, () => addBookmarkCommand.execute());
};
