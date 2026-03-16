import assert from 'node:assert';

import * as vscode from 'vscode';

const EXPECTED_COMMAND_IDS = [
  'rangelink.copyLinkWithRelativePath',
  'rangelink.copyLinkWithAbsolutePath',
  'rangelink.copyPortableLinkWithRelativePath',
  'rangelink.copyPortableLinkWithAbsolutePath',
  'rangelink.copyLinkOnlyWithRelativePath',
  'rangelink.copyLinkOnlyWithAbsolutePath',
  'rangelink.pasteSelectedTextToDestination',
  'rangelink.showVersion',
  'rangelink.bindToDestination',
  'rangelink.bindToTerminal',
  'rangelink.bindToTerminalHere',
  'rangelink.bindToTextEditor',
  'rangelink.bindToTextEditorHere',
  'rangelink.bindToCursorAI',
  'rangelink.bindToClaudeCode',
  'rangelink.bindToGitHubCopilotChat',
  'rangelink.unbindDestination',
  'rangelink.jumpToBoundDestination',
  'rangelink.openStatusBarMenu',
  'rangelink.bookmark.add',
  'rangelink.bookmark.list',
  // TODO: https://github.com/couimet/rangeLink/issues/461 — unskip after https://github.com/couimet/rangeLink/issues/366 unhides bookmarks
  // 'rangelink.bookmark.manage',
  // TODO: https://github.com/couimet/rangeLink/issues/461 — unskip after https://github.com/couimet/rangeLink/issues/366 unhides bookmarks
  // 'rangelink.bookmark.navigate',
  'rangelink.pasteFileAbsolutePath',
  'rangelink.pasteFileRelativePath',
  'rangelink.pasteCurrentFileAbsolutePath',
  'rangelink.pasteCurrentFileRelativePath',
  'rangelink.goToRangeLink',
  'rangelink.explorer.bind',
  'rangelink.explorer.pasteFilePath',
  'rangelink.explorer.pasteRelativeFilePath',
  'rangelink.explorer.unbind',
  'rangelink.editorTab.pasteFilePath',
  'rangelink.editorTab.pasteRelativeFilePath',
  'rangelink.editorContent.pasteFilePath',
  'rangelink.editorContent.pasteRelativeFilePath',
  'rangelink.editorContent.bind',
  'rangelink.editorContent.unbind',
  'rangelink.editorContext.copyLink',
  'rangelink.editorContext.copyLinkAbsolute',
  'rangelink.editorContext.copyPortableLink',
  'rangelink.editorContext.copyPortableLinkAbsolute',
  'rangelink.editorContext.pasteSelectedText',
  'rangelink.editorContext.saveBookmark',
  'rangelink.terminal.bind',
  'rangelink.terminal.copyLinkGuard',
  'rangelink.terminal.linkBridge',
  'rangelink.terminal.pasteSelectedTextToDestination',
  'rangelink.terminal.unbind',
  'rangelink.handleDocumentLinkClick',
  'rangelink.handleFilePathClick',
] as const;

suite('Command Registration', () => {
  let registeredCommands: string[];

  suiteSetup(async () => {
    registeredCommands = await vscode.commands.getCommands(true);
  });

  for (const commandId of EXPECTED_COMMAND_IDS) {
    test(`${commandId} is registered`, () => {
      assert.ok(
        registeredCommands.includes(commandId),
        `Expected command '${commandId}' to be registered but it was not found`,
      );
    });
  }
});
