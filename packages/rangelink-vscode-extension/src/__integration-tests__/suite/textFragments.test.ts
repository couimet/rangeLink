import {
  CMD_COPY_TEXT_FRAGMENT_ABSOLUTE,
  CMD_COPY_TEXT_FRAGMENT_ONLY_ABSOLUTE,
  CMD_COPY_TEXT_FRAGMENT_ONLY_RELATIVE,
  CMD_COPY_TEXT_FRAGMENT_RELATIVE,
} from '../../constants/commandIds';
import {
  assertClipboardEquals,
  assertClipboardWriteLogged,
  assertFnLogged,
  assertNoClipboardWriteLogged,
  assertTerminalBufferEquals,
  createTempDir,
  getLogCapture,
  standardSuite,
  withClipboardRestored,
  withClipboardSentinel,
} from '../helpers';

import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

const COPY_STATUS_BAR = '✓ RangeLink: Text fragment copied to clipboard';

const NOT_UNIQUE_MESSAGE = 'Cannot generate a text fragment link - the selected text is not unique in the file. Select a longer block of text and try again.';

const MULTIPLE_SELECTIONS_MESSAGE = 'Cannot generate a text fragment link from multiple selections. Select a single block of text and try again.';

const GENERATION_FAILED_MESSAGE = 'Failed to generate text fragment link';

const NO_TEXT_SELECTED_MESSAGE = 'No text selected. Click in the file, select text, and try again.';

// The directive marker is literal on purpose: a change to it must fail the test.
const buildExpectedLink = (referencePath: string, encodedStart: string): string => `${referencePath}:~:text=${encodedStart}`;

const buildRelativePath = (uri: vscode.Uri): string => vscode.workspace.asRelativePath(uri, false);

standardSuite('Text Fragment Link Generation', (ss) => {
  const selectLine = async (uri: vscode.Uri, line: number, text: string): Promise<void> => {
    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(line, 0), new vscode.Position(line, text.length));
    await ss.settle();
  };

  const copyRelativeLink = async (): Promise<void> => {
    await vscode.commands.executeCommand(CMD_COPY_TEXT_FRAGMENT_ONLY_RELATIVE);
    await ss.settle();
  };

  test('text-fragment-generation-001: copying a unique selection writes a workspace-relative text fragment link to the clipboard', async () => {
    const selectionText = 'answer = 42;';
    const { uri } = ss.createContentFile('thg-001', 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLine(uri, 1, selectionText);

    const expectedLink = buildExpectedLink(buildRelativePath(uri), 'answer%20%3D%2042%3B');
    ss.expectStatusBarMessages([COPY_STATUS_BAR]);

    const logCapture = getLogCapture();
    logCapture.mark('before-thg-001');

    const clipboard = await assertClipboardEquals(
      'Copy Text Fragment Link should copy a workspace-relative text fragment link to the clipboard',
      copyRelativeLink,
      expectedLink,
    );

    const lines = logCapture.getLinesSince('before-thg-001');
    assertClipboardWriteLogged(lines, { textLength: expectedLink.length });
    assertFnLogged(lines, { fn: 'generateTextFragmentLink' });
    // Negative: a text fragment link carries no numeric anchor at all.
    assert.strictEqual(clipboard.includes('#L'), false, `Expected no numeric anchor in text fragment link: ${clipboard}`);
  });

  test('text-fragment-generation-002: copying with the absolute format writes the absolute path', async () => {
    const selectionText = 'ABSOLUTE TARGET LINE';
    const { uri } = ss.createContentFile('thg-002', 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLine(uri, 1, selectionText);

    const absoluteLink = buildExpectedLink(uri.fsPath, 'ABSOLUTE%20TARGET%20LINE');
    const relativeLink = buildExpectedLink(buildRelativePath(uri), 'ABSOLUTE%20TARGET%20LINE');
    assert.notStrictEqual(absoluteLink, relativeLink, 'Absolute and workspace-relative links must differ so the format stays observable');

    ss.expectStatusBarMessages([COPY_STATUS_BAR]);

    const clipboard = await assertClipboardEquals(
      'Copy Text Fragment Link (Absolute) should copy an absolute-path text fragment link to the clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_TEXT_FRAGMENT_ONLY_ABSOLUTE);
        await ss.settle();
      },
      absoluteLink,
    );

    // Negative: the workspace-relative form must not have been emitted instead.
    assert.notStrictEqual(clipboard, relativeLink, 'Expected the absolute path, not the workspace-relative path');
  });

  test('text-fragment-generation-003: sending to a bound terminal delivers the padded relative link and restores the clipboard', async () => {
    const terminalName = 'thg-003-dest';
    const selectionText = 'TERMINAL SEND TARGET';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);
    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Terminal ("${terminalName}")`, `✓ RangeLink: Text fragment sent to Terminal ("${terminalName}")`]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });

    const { uri } = ss.createContentFile('thg-003', 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLine(uri, 1, selectionText);
    capturing.clearCaptured();

    const expectedLink = buildExpectedLink(buildRelativePath(uri), 'TERMINAL%20SEND%20TARGET');
    const logCapture = getLogCapture();
    const marker = 'before-thg-003';

    // The send stages the link on the clipboard for the paste, then restores it.
    await withClipboardSentinel(marker, 'text-fragment-generation-003: send', async () => {
      await vscode.commands.executeCommand(CMD_COPY_TEXT_FRAGMENT_RELATIVE);
      await ss.settle();
    });

    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${expectedLink} `);
    assertFnLogged(logCapture.getLinesSince(marker), { fn: 'generateTextFragmentLink' });
  });

  test('text-fragment-generation-004: sending the absolute format to a bound terminal delivers the padded absolute link', async () => {
    const terminalName = 'thg-004-dest';
    const selectionText = 'TERMINAL ABSOLUTE TARGET';
    const capturing = await ss.createAndBindCapturingTerminal(terminalName);
    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Terminal ("${terminalName}")`, `✓ RangeLink: Text fragment sent to Terminal ("${terminalName}")`]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });

    const { uri } = ss.createContentFile('thg-004', 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLine(uri, 1, selectionText);
    capturing.clearCaptured();

    const expectedLink = buildExpectedLink(uri.fsPath, 'TERMINAL%20ABSOLUTE%20TARGET');
    const logCapture = getLogCapture();
    const marker = 'before-thg-004';

    await withClipboardSentinel(marker, 'text-fragment-generation-004: send', async () => {
      await vscode.commands.executeCommand(CMD_COPY_TEXT_FRAGMENT_ABSOLUTE);
      await ss.settle();
    });

    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${expectedLink} `);
    assertFnLogged(logCapture.getLinesSince(marker), { fn: 'generateTextFragmentLink' });
  });

  test('text-fragment-generation-005: a non-unique selection shows the not-unique error and writes nothing', async () => {
    const duplicatedText = 'DUPLICATED SENTINEL LINE';
    const { uri } = ss.createContentFile('thg-005', 3, (i) => (i === 1 ? 'filler line 2' : duplicatedText));
    await selectLine(uri, 0, duplicatedText);

    ss.expectToastMessages([{ level: 'error', message: NOT_UNIQUE_MESSAGE }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-thg-005');

    await withClipboardRestored('text-fragment-generation-005: clipboard untouched on error', copyRelativeLink);
    assertNoClipboardWriteLogged(logCapture.getLinesSince('before-thg-005'));
  });

  test('text-fragment-generation-006: more than one selection shows the multiple-selection error and writes nothing', async () => {
    const firstText = 'FIRST SELECTED BLOCK';
    const secondText = 'SECOND SELECTED BLOCK';
    const { uri } = ss.createContentFile('thg-006', 3, (i) => (i === 0 ? firstText : i === 2 ? secondText : 'filler line 2'));
    const editor = await ss.openEditor(uri);
    editor.selections = [
      new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, firstText.length)),
      new vscode.Selection(new vscode.Position(2, 0), new vscode.Position(2, secondText.length)),
    ];
    await ss.settle();

    ss.expectToastMessages([{ level: 'error', message: MULTIPLE_SELECTIONS_MESSAGE }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-thg-006');

    await withClipboardRestored('text-fragment-generation-006: clipboard untouched on error', copyRelativeLink);
    assertNoClipboardWriteLogged(logCapture.getLinesSince('before-thg-006'));
  });

  test('text-fragment-generation-007: a multi-line CRLF selection encodes line breaks as %0A and never %0D', async () => {
    const firstLine = 'MULTILINE START';
    const secondLine = 'MULTILINE END';
    const uri = ss.createWorkspaceFile('thg-007', `first line\r\n${firstLine}\r\n${secondLine}\r\nlast line\r\n`);
    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(2, secondLine.length));
    await ss.settle();

    const expectedLink = buildExpectedLink(buildRelativePath(uri), 'MULTILINE%20START%0AMULTILINE%20END');
    assert.strictEqual(expectedLink.includes('%0D'), false, `Expected no CR escape in ${expectedLink}`);

    ss.expectStatusBarMessages([COPY_STATUS_BAR]);

    const clipboard = await assertClipboardEquals('A CRLF multi-line selection should encode the line break as %0A', copyRelativeLink, expectedLink);

    assert.strictEqual(clipboard.includes('%0D'), false, `Expected no %0D in ${clipboard}`);
  });

  test('text-fragment-generation-008: reserved and non-ASCII characters in the selection encode per the codec', async () => {
    const selectionText = 'pick, tag#1 & 50% café; answer = 42; 🚀';
    const { uri } = ss.createContentFile('thg-008', 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLine(uri, 1, selectionText);

    const expectedLink = buildExpectedLink(buildRelativePath(uri), 'pick%2C%20tag%231%20%26%2050%25%20caf%C3%A9%3B%20answer%20%3D%2042%3B%20%F0%9F%9A%80');
    ss.expectStatusBarMessages([COPY_STATUS_BAR]);

    await assertClipboardEquals('Copy Text Fragment Link should percent-encode every reserved and non-ASCII character', copyRelativeLink, expectedLink);
  });

  test('text-fragment-generation-009: an edge hyphen in the selection encodes as %2D while an interior hyphen stays raw', async () => {
    const selectionText = '-left edge and in-between and right edge-';
    const { uri } = ss.createContentFile('thg-009', 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLine(uri, 1, selectionText);

    const expectedLink = buildExpectedLink(buildRelativePath(uri), '%2Dleft%20edge%20and%20in-between%20and%20right%20edge%2D');
    ss.expectStatusBarMessages([COPY_STATUS_BAR]);

    await assertClipboardEquals('Copy Text Fragment Link should escape edge hyphens and keep interior hyphens raw', copyRelativeLink, expectedLink);
  });

  test('text-fragment-generation-010: a path with a space produces a quoted link and an apostrophe in the text is POSIX-escaped', async () => {
    const selectionText = "it's unique here";
    const filePath = path.join(createTempDir('thg-010'), 'dir with space', 'file.txt');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${selectionText}\n`, 'utf8');
    const uri = vscode.Uri.file(filePath);
    await selectLine(uri, 0, selectionText);

    const expectedLink = `'${buildRelativePath(uri)}:~:text=it'\\''s%20unique%20here'`;
    ss.expectStatusBarMessages([COPY_STATUS_BAR]);

    await assertClipboardEquals('Copy Text Fragment Link should quote a path with a space and escape an apostrophe', copyRelativeLink, expectedLink);
  });

  test('text-fragment-generation-011: a selection that differs from another occurrence only by case is refused as not unique', async () => {
    const lowerText = 'sentinel';
    const upperText = 'SENTINEL';
    const { uri } = ss.createContentFile('thg-011', 3, (i) => (i === 0 ? lowerText : i === 2 ? upperText : 'filler line 2'));
    await selectLine(uri, 0, lowerText);

    ss.expectToastMessages([{ level: 'error', message: NOT_UNIQUE_MESSAGE }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-thg-011');

    await withClipboardRestored('text-fragment-generation-011: clipboard untouched on error', copyRelativeLink);
    assertNoClipboardWriteLogged(logCapture.getLinesSince('before-thg-011'));
  });

  test('text-fragment-generation-012: a selection that produces a link longer than the limit shows the generation-failed error and writes nothing', async () => {
    const longSelectionLength = 3100;
    const selectionText = 'z'.repeat(longSelectionLength);
    const { uri } = ss.createContentFile('thg-012', 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLine(uri, 1, selectionText);

    ss.expectToastMessages([{ level: 'error', message: GENERATION_FAILED_MESSAGE }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-thg-012');

    await withClipboardRestored('text-fragment-generation-012: clipboard untouched on error', copyRelativeLink);
    assertNoClipboardWriteLogged(logCapture.getLinesSince('before-thg-012'));
  });

  test('text-fragment-generation-013: Copy Text Fragment Link with no selection shows the no-text-selected error and writes nothing', async () => {
    const { uri } = ss.createContentFile('thg-013', 3, (i) => `filler line ${i + 1}`);
    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(1, 0));
    await ss.settle();

    ss.expectToastMessages([{ level: 'error', message: NO_TEXT_SELECTED_MESSAGE }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-thg-013');

    await withClipboardRestored('text-fragment-generation-013: clipboard untouched on error', copyRelativeLink);
    assertNoClipboardWriteLogged(logCapture.getLinesSince('before-thg-013'));
  });
});
