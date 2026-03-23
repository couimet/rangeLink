import { createMockLogger } from 'barebone-logger-testing';

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
import { FilePathDocumentProvider } from '../navigation/FilePathDocumentProvider';
import { FilePathTerminalProvider } from '../navigation/FilePathTerminalProvider';
import { RangeLinkDocumentProvider } from '../navigation/RangeLinkDocumentProvider';
import { RangeLinkTerminalProvider } from '../navigation/RangeLinkTerminalProvider';
import { wireSubscriptions } from '../wireSubscriptions';

import { createMockConfigGetter, createMockVscodeAdapter } from './helpers';

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

const createMinimalContext = () => ({
  subscriptions: [] as Array<{ dispose(): void }>,
  globalState: {
    get: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockReturnValue([]),
    setKeysForSync: jest.fn(),
  },
});

describe('wireSubscriptions', () => {
  let context: ReturnType<typeof createMinimalContext>;
  let mockAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let registerCommandSpy: jest.SpyInstance;
  let registerTerminalLinkProviderSpy: jest.SpyInstance;
  let registerDocumentLinkProviderSpy: jest.SpyInstance;

  beforeEach(() => {
    context = createMinimalContext();
    const mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter({
      logger: mockLogger,
      workspaceOptions: {
        getConfiguration: jest.fn().mockReturnValue(createMockConfigGetter()),
      },
    });
    registerCommandSpy = jest.spyOn(mockAdapter, 'registerCommand');
    registerTerminalLinkProviderSpy = jest.spyOn(mockAdapter, 'registerTerminalLinkProvider');
    registerDocumentLinkProviderSpy = jest.spyOn(mockAdapter, 'registerDocumentLinkProvider');

    wireSubscriptions(context as any, {
      ideAdapter: mockAdapter,
      logger: mockLogger,
      versionInfo: undefined,
    });
  });

  it('registers all expected commands', () => {
    const registeredCommands = registerCommandSpy.mock.calls.map(
      (call: unknown[]) => call[0] as string,
    );

    for (const cmd of EXPECTED_COMMANDS) {
      expect(registeredCommands).toContain(cmd);
    }

    expect(registeredCommands).toHaveLength(50);
  });

  it('registers FilePathTerminalProvider and RangeLinkTerminalProvider', () => {
    expect(registerTerminalLinkProviderSpy).toHaveBeenCalledTimes(2);

    const providers = registerTerminalLinkProviderSpy.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(providers[0]).toBeInstanceOf(FilePathTerminalProvider);
    expect(providers[1]).toBeInstanceOf(RangeLinkTerminalProvider);
  });

  it('registers FilePathDocumentProvider and RangeLinkDocumentProvider with file+untitled schemes', () => {
    expect(registerDocumentLinkProviderSpy).toHaveBeenCalledTimes(2);

    const calls = registerDocumentLinkProviderSpy.mock.calls;

    expect(calls[0][0]).toStrictEqual(DOCUMENT_SELECTOR);
    expect(calls[0][1]).toBeInstanceOf(FilePathDocumentProvider);

    expect(calls[1][0]).toStrictEqual(DOCUMENT_SELECTOR);
    expect(calls[1][1]).toBeInstanceOf(RangeLinkDocumentProvider);
  });
});
