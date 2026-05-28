import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { CMD_GO_TO_RANGELINK } from '../../constants/commandIds';
import {
  assertInputBoxLogged,
  getLogCapture,
  openAndAccept,
  openAndDismiss,
  pasteIntoQuickInput,
  standardSuite,
  waitForHuman,
} from '../helpers';

const TEST_FILE_LINE_COUNT = 25;
const LINE_CONTENT = 'line content for go-to-link assisted tests — column-safe filler text';

const INPUT_BOX_OPTS = {
  prompt: 'Enter RangeLink to navigate',
  placeHolder: 'recipes/baking/chickenpie.ts#L3C14-L15C9',
};
const buildFileContent = (lineCount: number): string =>
  Array.from({ length: lineCount }, (_, i) => `${i + 1}: ${LINE_CONTENT}`).join('\n') + '\n';

const submitLink = (text: string): Promise<void> =>
  openAndAccept(CMD_GO_TO_RANGELINK, async () => {
    await vscode.env.clipboard.writeText(text);
    await pasteIntoQuickInput();
  });

standardSuite('R-G Go to Link', (ss) => {
  test('go-to-link-001: Cmd+R Cmd+G opens the Go to Link input box', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-001');

    await openAndDismiss(CMD_GO_TO_RANGELINK);

    const lines = logCapture.getLinesSince('before-gtl-001');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);

    ss.log('✓ Input box opened with correct prompt/placeholder; cancellation logged');
  });

  test('[assisted] go-to-link-003: valid link navigates to file and selects the range', async () => {
    const uri = await ss.createAndOpenFile('gtl-003', buildFileContent(TEST_FILE_LINE_COUNT));
    const fn = path.basename(uri.fsPath);
    const linkText = `${fn}#L3-L7`;

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${fn} @ 3-7` }]);

    await vscode.env.clipboard.writeText(linkText);

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-003');

    await waitForHuman('go-to-link-003', `Press Cmd+R Cmd+G, Cmd+V, press Enter`, [
      '1. Press Cmd+R Cmd+G to open the Go to Link input box',
      '2. Press Cmd+V to paste the link (primed on clipboard)',
      '3. Press Enter',
    ]);

    const lines = logCapture.getLinesSince('before-gtl-003');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Expected an active text editor after navigation');
    assert.strictEqual(
      editor!.document.uri.fsPath,
      uri.fsPath,
      'Navigation opened a different document than expected',
    );

    const sel = editor!.selection;
    const endLineLength = editor!.document.lineAt(6).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 2, anchorChar: 0, activeLine: 6, activeChar: endLineLength },
    );

    ss.log('✓ Navigation toast logged; editor selection spans lines 3-7 of the target file');
  });

  test('[assisted] go-to-link-004: character-level precision link selects the exact column range', async () => {
    const uri = await ss.createAndOpenFile('gtl-004', buildFileContent(TEST_FILE_LINE_COUNT));
    const fn = path.basename(uri.fsPath);
    const linkText = `${fn}#L3C5-L3C20`;

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${fn} @ 3:5-3:20` }]);

    await vscode.env.clipboard.writeText(linkText);

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-004');

    await waitForHuman('go-to-link-004', `Press Cmd+R Cmd+G, Cmd+V, press Enter`, [
      '1. Press Cmd+R Cmd+G to open the Go to Link input box',
      '2. Press Cmd+V to paste the link (primed on clipboard)',
      '3. Press Enter',
    ]);

    const lines = logCapture.getLinesSince('before-gtl-004');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Expected an active text editor after navigation');
    assert.strictEqual(
      editor!.document.uri.fsPath,
      uri.fsPath,
      'Navigation opened a different document than expected',
    );

    const sel = editor!.selection;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 2, anchorChar: 4, activeLine: 2, activeChar: 19 },
    );

    ss.log('✓ Character-precision navigation logged; selection spans col 5 to col 20 on line 3');
  });

  test('go-to-link-005: invalid link format shows error toast', async () => {
    const invalidInput = 'not-a-valid-link-format';
    const uriBefore = vscode.window.activeTextEditor?.document.uri.toString();

    ss.expectToastMessages([{ level: 'error', message: `Invalid link format: '${invalidInput}'` }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-005');

    await submitLink(invalidInput);

    const lines = logCapture.getLinesSince('before-gtl-005');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);

    assert.strictEqual(
      vscode.window.activeTextEditor?.document.uri.toString(),
      uriBefore,
      'Expected active editor URI to be unchanged (no navigation occurred)',
    );

    ss.log('✓ Invalid input produced error toast with exact message; no navigation occurred');
  });

  test('go-to-link-006: empty input shows error toast', async () => {
    const uriBefore = vscode.window.activeTextEditor?.document.uri.toString();

    ss.expectToastMessages([{ level: 'error', message: 'Please enter a link to navigate' }]);

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-006');

    await openAndAccept(CMD_GO_TO_RANGELINK);

    const lines = logCapture.getLinesSince('before-gtl-006');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);

    assert.strictEqual(
      vscode.window.activeTextEditor?.document.uri.toString(),
      uriBefore,
      'Expected active editor URI to be unchanged (no navigation occurred)',
    );

    ss.log('✓ Empty input produced the empty-input error toast; no parse attempted');
  });

  test('[assisted] go-to-link-007: nonexistent file path shows warning toast', async () => {
    const missingPath = 'src/nonexistent/file.ts';
    const linkText = `${missingPath}#L1`;
    const uriBefore = vscode.window.activeTextEditor?.document.uri.toString();

    ss.expectToastMessages([{ level: 'warning', message: `Cannot find file: ${missingPath}` }]);

    await vscode.env.clipboard.writeText(linkText);

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-007');

    await waitForHuman('go-to-link-007', `Press Cmd+R Cmd+G, Cmd+V, press Enter`, [
      '1. Press Cmd+R Cmd+G to open the Go to Link input box',
      '2. Press Cmd+V to paste the link (primed on clipboard)',
      '3. Press Enter',
    ]);

    const lines = logCapture.getLinesSince('before-gtl-007');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);

    assert.strictEqual(
      vscode.window.activeTextEditor?.document.uri.toString(),
      uriBefore,
      'Expected active editor URI to be unchanged (no navigation occurred)',
    );

    ss.log('✓ Nonexistent file produced the file-not-found warning toast with exact path');
  });

  test('go-to-link-008: Go to Link command opens the input box with correct prompt and placeholder', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-008');

    await openAndDismiss(CMD_GO_TO_RANGELINK);

    const lines = logCapture.getLinesSince('before-gtl-008');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);

    ss.log('✓ Go to Link command opened the input box with correct prompt/placeholder');
  });

  test('go-to-link-009: Go to Link command opens the input box with correct prompt and placeholder', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-009');

    await openAndDismiss(CMD_GO_TO_RANGELINK);

    const lines = logCapture.getLinesSince('before-gtl-009');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);

    ss.log('✓ Go to Link command opened the input box with correct prompt/placeholder');
  });
});
