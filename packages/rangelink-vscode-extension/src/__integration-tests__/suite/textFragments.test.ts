import {
  CMD_COPY_TEXT_FRAGMENT_ABSOLUTE,
  CMD_COPY_TEXT_FRAGMENT_ONLY_ABSOLUTE,
  CMD_COPY_TEXT_FRAGMENT_ONLY_RELATIVE,
  CMD_COPY_TEXT_FRAGMENT_RELATIVE,
  CMD_HANDLE_DOCUMENT_LINK_CLICK,
} from '../../constants/commandIds';
import {
  assertClipboardEquals,
  assertClipboardWriteLogged,
  assertFnLogged,
  assertNoClipboardWriteLogged,
  assertTerminalBufferEquals,
  clearEditorSelection,
  echoToTerminal,
  getLogCapture,
  navigateViaHandleLinkClick,
  standardSuite,
  waitForHumanVerdict,
  withClipboardRestored,
  withClipboardSentinel,
} from '../helpers';

import assert from 'node:assert';
import * as path from 'node:path';
import { quoteLink } from 'rangelink-core-ts';
import { formatTextFragment, type ParsedTextFragment, parseTextFragment } from 'text-fragment-ts';
import * as vscode from 'vscode';

type ReferencePathFormat = 'relative' | 'absolute';

const COPY_ONLY_STATUS_BAR = '✓ RangeLink: Text fragment copied to clipboard';

const NOT_UNIQUE_MESSAGE = 'Cannot generate a text fragment link - the selected text is not unique in the file. Select a longer block of text and try again.';

const buildReferencePath = (uri: vscode.Uri, pathFormat: ReferencePathFormat): string =>
  pathFormat === 'absolute' ? uri.fsPath : vscode.workspace.asRelativePath(uri, false);

const buildExpectedTextFragmentLink = (uri: vscode.Uri, text: string, pathFormat: ReferencePathFormat): string => {
  const referencePath = buildReferencePath(uri, pathFormat);
  const result = formatTextFragment(referencePath, { start: text });
  assert.ok(result.success, `Expected formatTextFragment to succeed for ${referencePath}`);
  return quoteLink(result.value, referencePath);
};

const parseTextFragmentOrFail = (linkText: string): ParsedTextFragment => {
  const result = parseTextFragment(linkText);
  assert.ok(result.success, `Expected parseTextFragment to succeed for "${linkText}"`);
  return result.value;
};

const selectionShape = (sel: vscode.Selection): Record<string, number> => ({
  anchorLine: sel.anchor.line,
  anchorChar: sel.anchor.character,
  activeLine: sel.active.line,
  activeChar: sel.active.character,
});

standardSuite('Text Fragment Link Generation', (ss) => {
  const selectLineText = async (uri: vscode.Uri, line: number, text: string): Promise<vscode.TextEditor> => {
    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(line, 0), new vscode.Position(line, text.length));
    await ss.settle();
    return editor;
  };

  const sendToBoundTerminal = async (descriptor: string, tcId: string, commandId: string, pathFormat: ReferencePathFormat): Promise<void> => {
    const terminalName = `${descriptor}-dest`;
    const selectionText = pathFormat === 'absolute' ? 'ABSOLUTE TERMINAL SEND TARGET' : 'TERMINAL SEND TARGET';

    const capturing = await ss.createAndBindCapturingTerminal(terminalName);
    ss.expectStatusBarMessages([`✓ RangeLink: Bound to Terminal ("${terminalName}")`, `✓ RangeLink: Text fragment sent to Terminal ("${terminalName}")`]);
    ss.expectContextKeys({
      'rangelink.isBound': true,
      'rangelink.isActiveTerminalBindable': true,
      'rangelink.isActiveTerminalPasteDestination': true,
    });

    const { uri } = ss.createContentFile(descriptor, 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLineText(uri, 1, selectionText);
    capturing.clearCaptured();

    const expectedLink = buildExpectedTextFragmentLink(uri, selectionText, pathFormat);
    const logCapture = getLogCapture();
    const marker = `${descriptor}-send`;
    logCapture.mark(marker);

    // A terminal send stages the link on the clipboard for the paste, then restores
    // whatever was there — the contract is "preserved", not "left holding the link".
    await withClipboardSentinel(marker, `${tcId} R-H send`, async () => {
      await vscode.commands.executeCommand(commandId);
      await ss.settle();
    });

    assertTerminalBufferEquals(capturing.getCapturedText(), ` ${expectedLink} `);
    assertFnLogged(logCapture.getLinesSince(marker), { fn: 'generateTextFragmentLink' });

    const parsed = parseTextFragmentOrFail(capturing.getCapturedText().trim());
    assert.deepStrictEqual({ path: parsed.path, start: parsed.directive.start }, { path: buildReferencePath(uri, pathFormat), start: selectionText });
  };

  test('text-fragment-generation-001: copying a unique selection writes a workspace-relative text fragment link to the clipboard', async () => {
    const selectionText = 'DISTINCT SENTINEL LINE';
    const { uri } = ss.createContentFile('thg-001', 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLineText(uri, 1, selectionText);

    const expectedLink = buildExpectedTextFragmentLink(uri, selectionText, 'relative');
    ss.expectStatusBarMessages([COPY_ONLY_STATUS_BAR]);

    const logCapture = getLogCapture();
    logCapture.mark('before-thg-001');

    const clipboard = await assertClipboardEquals(
      'R-Alt-C should copy a workspace-relative text fragment link to the clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_TEXT_FRAGMENT_ONLY_RELATIVE);
        await ss.settle();
      },
      expectedLink,
    );

    const lines = logCapture.getLinesSince('before-thg-001');
    assertClipboardWriteLogged(lines, { textLength: expectedLink.length });
    assertFnLogged(lines, { fn: 'generateTextFragmentLink' });

    const parsed = parseTextFragmentOrFail(clipboard);
    assert.deepStrictEqual({ path: parsed.path, start: parsed.directive.start }, { path: buildReferencePath(uri, 'relative'), start: selectionText });
    // Negative: a text fragment link carries no numeric anchor at all.
    assert.strictEqual(clipboard.includes('#L'), false, `Expected no numeric anchor in text fragment link: ${clipboard}`);
  });

  test('text-fragment-generation-002: copying with the absolute format writes the absolute path', async () => {
    const selectionText = 'ABSOLUTE TARGET LINE';
    const { uri } = ss.createContentFile('thg-002', 3, (i) => (i === 1 ? selectionText : `filler line ${i + 1}`));
    await selectLineText(uri, 1, selectionText);

    const absoluteLink = buildExpectedTextFragmentLink(uri, selectionText, 'absolute');
    const relativeLink = buildExpectedTextFragmentLink(uri, selectionText, 'relative');
    assert.notStrictEqual(absoluteLink, relativeLink, 'Absolute and workspace-relative links must differ so the format flag stays observable');

    ss.expectStatusBarMessages([COPY_ONLY_STATUS_BAR]);

    const clipboard = await assertClipboardEquals(
      'R-Alt-Shift-C should copy an absolute-path text fragment link to the clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_TEXT_FRAGMENT_ONLY_ABSOLUTE);
        await ss.settle();
      },
      absoluteLink,
    );

    const parsed = parseTextFragmentOrFail(clipboard);
    assert.deepStrictEqual({ path: parsed.path, start: parsed.directive.start }, { path: uri.fsPath, start: selectionText });
    // Negative: the workspace-relative form must not have been emitted instead.
    assert.notStrictEqual(clipboard, relativeLink, 'Expected the absolute path, not the workspace-relative path');
  });

  test('text-fragment-generation-003: sending to a bound terminal delivers the padded link and restores the clipboard', async () => {
    await sendToBoundTerminal('thg-003', 'text-fragment-generation-003', CMD_COPY_TEXT_FRAGMENT_RELATIVE, 'relative');
  });

  test('text-fragment-generation-004: sending the absolute format to a bound terminal delivers the padded absolute link', async () => {
    await sendToBoundTerminal('thg-004', 'text-fragment-generation-004', CMD_COPY_TEXT_FRAGMENT_ABSOLUTE, 'absolute');
  });

  test('text-fragment-generation-005: a non-unique selection shows the not-unique error and writes nothing to the clipboard', async () => {
    const duplicatedText = 'DUPLICATED SENTINEL LINE';
    const { uri } = ss.createContentFile('thg-005', 3, (i) => (i === 1 ? 'filler line 2' : duplicatedText));
    await selectLineText(uri, 0, duplicatedText);

    ss.expectToastMessages([{ level: 'error', message: NOT_UNIQUE_MESSAGE }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-thg-005');

    await withClipboardRestored('text-fragment-generation-005: clipboard untouched on error', async () => {
      await vscode.commands.executeCommand(CMD_COPY_TEXT_FRAGMENT_ONLY_RELATIVE);
      await ss.settle();
    });

    assertNoClipboardWriteLogged(logCapture.getLinesSince('before-thg-005'));
  });

  test('text-fragment-generation-006: a multi-line CRLF selection encodes LF as %0A and never %0D', async () => {
    const selectionText = 'MULTILINE START\nMULTILINE END';
    const uri = ss.createWorkspaceFile('thg-006', `first line\r\nMULTILINE START\r\nMULTILINE END\r\nlast line\r\n`);
    const editor = await ss.openEditor(uri);
    editor.selection = new vscode.Selection(new vscode.Position(1, 0), new vscode.Position(2, 'MULTILINE END'.length));
    await ss.settle();

    const expectedLink = buildExpectedTextFragmentLink(uri, selectionText, 'relative');
    assert.ok(expectedLink.includes('%0A'), `Expected the encoded LF escape in ${expectedLink}`);
    assert.ok(!expectedLink.includes('%0D'), `Expected no CR escape in ${expectedLink}`);

    ss.expectStatusBarMessages([COPY_ONLY_STATUS_BAR]);

    const clipboard = await assertClipboardEquals(
      'text-fragment-generation-006 should encode the multi-line selection with %0A',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_TEXT_FRAGMENT_ONLY_RELATIVE);
        await ss.settle();
      },
      expectedLink,
    );

    assert.deepStrictEqual(
      { start: parseTextFragmentOrFail(clipboard).directive.start, containsCr: clipboard.includes('%0D') },
      { start: selectionText, containsCr: false },
    );
  });
});

standardSuite('Text Fragment Link Navigation', (ss) => {
  const navigateToTextFragment = async (uri: vscode.Uri, selectionText: string): Promise<{ sel: vscode.Selection; doc: vscode.TextDocument }> => {
    const linkText = buildExpectedTextFragmentLink(uri, selectionText, 'relative');
    const parsed = parseTextFragmentOrFail(linkText);

    await clearEditorSelection();
    const result = await navigateViaHandleLinkClick(linkText, parsed, path.basename(uri.fsPath));
    await ss.settle();
    return result;
  };

  test('text-fragment-navigation-001: a single match selects exactly the target text', async () => {
    const selectionText = 'TARGET HERE';
    const uri = ss.createWorkspaceFile('thn-001', `first line\n${selectionText}\nlast line\n`);
    await ss.openEditor(uri);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath}` }]);

    const { sel, doc } = await navigateToTextFragment(uri, selectionText);

    assert.deepStrictEqual(selectionShape(sel), { anchorLine: 1, anchorChar: 0, activeLine: 1, activeChar: selectionText.length });
    assert.strictEqual(doc.getText(sel), selectionText);
    // Negative: navigation must not select the surrounding lines.
    assert.notStrictEqual(doc.getText(sel), doc.getText());
  });

  test('text-fragment-navigation-002: a CRLF document with a %0A link selects the exact multi-line text', async () => {
    const selectionText = 'TARGET START\nTARGET END';
    const uri = ss.createWorkspaceFile('thn-002', `first line\r\nTARGET START\r\nTARGET END\r\nlast line\r\n`);
    await ss.openEditor(uri);
    await ss.settle();

    const linkText = buildExpectedTextFragmentLink(uri, selectionText, 'relative');
    assert.ok(linkText.includes('%0A'), `Expected the encoded LF escape in ${linkText}`);
    assert.ok(!linkText.includes('%0D'), `Expected no CR escape in ${linkText}`);

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath}` }]);

    const { sel, doc } = await navigateToTextFragment(uri, selectionText);
    const selectedText = doc.getText(sel).replace(/\r\n/g, '\n');

    assert.deepStrictEqual(selectionShape(sel), { anchorLine: 1, anchorChar: 0, activeLine: 2, activeChar: 'TARGET END'.length });
    assert.strictEqual(selectedText, selectionText);
  });

  test('text-fragment-navigation-003: text missing from the document warns and leaves the selection untouched', async () => {
    const missingText = 'TEXT THAT IS NOT IN THE DOCUMENT';
    const uri = ss.createWorkspaceFile('thn-003', 'first line\nsecond line\n');
    await ss.openEditor(uri);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    ss.expectToastMessages([{ level: 'warning', message: `Text "${missingText}" not found in ${relativePath}` }]);

    await clearEditorSelection();
    const linkText = buildExpectedTextFragmentLink(uri, missingText, 'relative');

    // Fire-and-forget: showWarningMessage blocks awaiting dismissal, and the
    // log entry is written before the blocking await.
    vscode.commands.executeCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, { linkText, parsed: parseTextFragmentOrFail(linkText) });
    await ss.settle();

    assert.deepStrictEqual(selectionShape(vscode.window.activeTextEditor!.selection), { anchorLine: 0, anchorChar: 0, activeLine: 0, activeChar: 0 });
  });

  test('text-fragment-navigation-004: ambiguous text warns with the occurrence count and leaves the selection untouched', async () => {
    const ambiguousText = 'DUPLICATED SENTINEL LINE';
    const uri = ss.createWorkspaceFile('thn-004', `${ambiguousText}\nalpha\n${ambiguousText}\n`);
    await ss.openEditor(uri);
    await ss.settle();

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    ss.expectToastMessages([{ level: 'warning', message: `Text "${ambiguousText}" appears 2 times in ${relativePath}` }]);

    await clearEditorSelection();
    const linkText = buildExpectedTextFragmentLink(uri, ambiguousText, 'relative');

    vscode.commands.executeCommand(CMD_HANDLE_DOCUMENT_LINK_CLICK, { linkText, parsed: parseTextFragmentOrFail(linkText) });
    await ss.settle();

    assert.deepStrictEqual(selectionShape(vscode.window.activeTextEditor!.selection), { anchorLine: 0, anchorChar: 0, activeLine: 0, activeChar: 0 });
  });
});

standardSuite('Text Fragment Link Detection', (ss) => {
  const linkShape = (link: vscode.DocumentLink): Record<string, unknown> => ({
    startLine: link.range.start.line,
    startChar: link.range.start.character,
    endLine: link.range.end.line,
    endChar: link.range.end.character,
    tooltip: typeof link.tooltip === 'string' ? link.tooltip : undefined,
  });

  const detectDocumentLinks = async (uri: vscode.Uri): Promise<vscode.DocumentLink[]> => {
    const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', uri);
    assert.ok(links, 'Expected vscode.executeLinkProvider to return a link array');
    return links;
  };

  test('text-fragment-detection-001: a text fragment link in a document is detected with its exact range and tooltip', async () => {
    const uri = ss.createWorkspaceFile('thd-001', 'See src/alpha.ts:~:text=SOME%20TEXT for details\n');
    await ss.openEditor(uri);
    await ss.settle();

    const links = await detectDocumentLinks(uri);

    assert.deepStrictEqual(links.map(linkShape), [
      {
        startLine: 0,
        startChar: 4,
        endLine: 0,
        endChar: 35,
        tooltip: 'Fragment "SOME TEXT" in src/alpha.ts • RangeLink',
      },
    ]);
  });

  test('text-fragment-detection-002: a text fragment link and a numeric RangeLink are both detected, text fragment first', async () => {
    const uri = ss.createWorkspaceFile('thd-002', 'src/alpha.ts:~:text=FIRST%20HERE\nsrc/beta.ts#L5\n');
    await ss.openEditor(uri);
    await ss.settle();

    const links = await detectDocumentLinks(uri);

    assert.deepStrictEqual(links.map(linkShape), [
      {
        startLine: 0,
        startChar: 0,
        endLine: 0,
        endChar: 32,
        tooltip: 'Fragment "FIRST HERE" in src/alpha.ts • RangeLink',
      },
      {
        startLine: 1,
        startChar: 0,
        endLine: 1,
        endChar: 14,
        tooltip: 'Open src/beta.ts:5 • RangeLink',
      },
    ]);
  });

  test('[assisted] text-fragment-detection-003: a text fragment link echoed to a terminal is clickable and navigates', async () => {
    const targetUri = ss.createWorkspaceFile('thd-003-target', 'first line\nCLICKABLE TERMINAL TARGET\nlast line\n');
    const relativePath = vscode.workspace.asRelativePath(targetUri, false);
    const linkText = buildExpectedTextFragmentLink(targetUri, 'CLICKABLE TERMINAL TARGET', 'relative');

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath}` }]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const terminal = await ss.createTerminal('thd-003');
    echoToTerminal(terminal, linkText);
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'text-fragment-detection-003',
      `Cmd+click the text fragment link in terminal "thd-003". Did VS Code open ${relativePath} with "CLICKABLE TERMINAL TARGET" selected?`,
      [
        '1. Find terminal "thd-003" in the terminal panel',
        `2. Cmd+click on ${linkText}`,
        '3. Verify the target file opens with the target text selected',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: text fragment link in terminal did not navigate');
    ss.log('✓ text-fragment-detection-003 — terminal text fragment link navigated (human verified)');
  });
});
