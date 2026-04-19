import assert from 'node:assert';
import * as path from 'node:path';

import * as vscode from 'vscode';

import {
  activateExtension,
  assertInputBoxLogged,
  assertToastLogged,
  cleanupFiles,
  closeAllEditors,
  createAndOpenFile,
  createLogger,
  extractQuickPickItemsLogged,
  getLogCapture,
  printAssistedBanner,
  settle,
  waitForHuman,
} from '../helpers';

const TEST_FILE_LINE_COUNT = 25;
const LINE_CONTENT = 'line content for go-to-link assisted tests — column-safe filler text';

const INPUT_BOX_OPTS = {
  prompt: 'Enter RangeLink to navigate',
  placeHolder: 'recipes/baking/chickenpie.ts#L3C14-L15C9',
};
const GO_TO_LINK_MENU_LABEL = '$(link-external) Go to Link';

const buildFileContent = (lineCount: number): string =>
  Array.from({ length: lineCount }, (_, i) => `${i + 1}: ${LINE_CONTENT}`).join('\n') + '\n';

const assertUserCancelledInputLogged = (lines: string[]): void => {
  const found = lines.some(
    (line) =>
      line.includes('GoToRangeLinkCommand.execute') && line.includes('User cancelled input'),
  );
  assert.ok(found, 'Expected GoToRangeLinkCommand.execute "User cancelled input" debug log');
};

suite('R-G Go to Link', () => {
  const log = createLogger('goToRangeLink');
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
    printAssistedBanner();
  });

  teardown(async () => {
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
    tmpFileUris.length = 0;
    await settle();
  });

  // ---------------------------------------------------------------------------
  // TC go-to-link-001
  // ---------------------------------------------------------------------------

  test('[assisted] go-to-link-001: Cmd+R Cmd+G opens the Go to Link input box', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-001');

    await waitForHuman('go-to-link-001', 'Press Cmd+R Cmd+G, then Escape the input box');

    const lines = logCapture.getLinesSince('before-gtl-001');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);
    assertUserCancelledInputLogged(lines);

    log('✓ Input box opened with correct prompt/placeholder; cancellation logged');
  });

  // ---------------------------------------------------------------------------
  // TC go-to-link-003
  // ---------------------------------------------------------------------------

  test('[assisted] go-to-link-003: valid link navigates to file and selects the range', async () => {
    const uri = await createAndOpenFile(
      'gtl-003',
      buildFileContent(TEST_FILE_LINE_COUNT),
      undefined,
      tmpFileUris,
    );
    const fn = path.basename(uri.fsPath);
    const linkText = `${fn}#L3-L7`;

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-003');

    await waitForHuman('go-to-link-003', `Press Cmd+R Cmd+G, type "${linkText}", press Enter`, [
      '1. Press Cmd+R Cmd+G to open the Go to Link input box',
      `2. Type (or paste): ${linkText}`,
      '3. Press Enter',
    ]);

    const lines = logCapture.getLinesSince('before-gtl-003');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${fn} @ 3-7`,
    });

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

    log('✓ Navigation toast logged; editor selection spans lines 3-7 of the target file');
  });

  // ---------------------------------------------------------------------------
  // TC go-to-link-004
  // ---------------------------------------------------------------------------

  test('[assisted] go-to-link-004: character-level precision link selects the exact column range', async () => {
    const uri = await createAndOpenFile(
      'gtl-004',
      buildFileContent(TEST_FILE_LINE_COUNT),
      undefined,
      tmpFileUris,
    );
    const fn = path.basename(uri.fsPath);
    const linkText = `${fn}#L3C5-L3C20`;

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-004');

    await waitForHuman('go-to-link-004', `Press Cmd+R Cmd+G, type "${linkText}", press Enter`, [
      '1. Press Cmd+R Cmd+G to open the Go to Link input box',
      `2. Type (or paste): ${linkText}`,
      '3. Press Enter',
    ]);

    const lines = logCapture.getLinesSince('before-gtl-004');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);
    assertToastLogged(lines, {
      type: 'info',
      message: `RangeLink: Navigated to ${fn} @ 3:5-3:20`,
    });

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

    log('✓ Character-precision navigation logged; selection spans col 5 to col 20 on line 3');
  });

  // ---------------------------------------------------------------------------
  // TC go-to-link-005
  // ---------------------------------------------------------------------------

  test('[assisted] go-to-link-005: invalid link format shows error toast', async () => {
    const invalidInput = 'not-a-valid-link-format';
    const uriBefore = vscode.window.activeTextEditor?.document.uri.toString();

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-005');

    await waitForHuman('go-to-link-005', `Press Cmd+R Cmd+G, type "${invalidInput}", press Enter`, [
      '1. Press Cmd+R Cmd+G to open the Go to Link input box',
      `2. Type (or paste): ${invalidInput}`,
      '3. Press Enter',
    ]);

    const lines = logCapture.getLinesSince('before-gtl-005');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);
    assertToastLogged(lines, {
      type: 'error',
      message: `RangeLink: Invalid link format: '${invalidInput}'`,
    });

    const invalidFormatLogged = lines.some(
      (line) =>
        line.includes('GoToRangeLinkCommand.execute') && line.includes('Invalid link format'),
    );
    assert.ok(
      invalidFormatLogged,
      'Expected GoToRangeLinkCommand.execute "Invalid link format" debug log',
    );

    assert.strictEqual(
      vscode.window.activeTextEditor?.document.uri.toString(),
      uriBefore,
      'Expected active editor URI to be unchanged (no navigation occurred)',
    );

    log('✓ Invalid input produced error toast with exact message; no navigation occurred');
  });

  // ---------------------------------------------------------------------------
  // TC go-to-link-006
  // ---------------------------------------------------------------------------

  test('[assisted] go-to-link-006: empty input shows error toast', async () => {
    const uriBefore = vscode.window.activeTextEditor?.document.uri.toString();

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-006');

    await waitForHuman('go-to-link-006', 'Press Cmd+R Cmd+G, leave input empty, press Enter', [
      '1. Press Cmd+R Cmd+G to open the Go to Link input box',
      '2. Do not type anything — leave the input box empty',
      '3. Press Enter',
    ]);

    const lines = logCapture.getLinesSince('before-gtl-006');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);
    assertToastLogged(lines, {
      type: 'error',
      message: 'RangeLink: Please enter a link to navigate',
    });

    const emptyInputLogged = lines.some(
      (line) =>
        line.includes('GoToRangeLinkCommand.execute') && line.includes('Empty input provided'),
    );
    assert.ok(
      emptyInputLogged,
      'Expected GoToRangeLinkCommand.execute "Empty input provided" debug log',
    );

    assert.strictEqual(
      vscode.window.activeTextEditor?.document.uri.toString(),
      uriBefore,
      'Expected active editor URI to be unchanged (no navigation occurred)',
    );

    log('✓ Empty input produced the empty-input error toast; no parse attempted');
  });

  // ---------------------------------------------------------------------------
  // TC go-to-link-007
  // ---------------------------------------------------------------------------

  test('[assisted] go-to-link-007: nonexistent file path shows warning toast', async () => {
    const missingPath = 'src/nonexistent/file.ts';
    const linkText = `${missingPath}#L1`;
    const uriBefore = vscode.window.activeTextEditor?.document.uri.toString();

    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-007');

    await waitForHuman('go-to-link-007', `Press Cmd+R Cmd+G, type "${linkText}", press Enter`, [
      '1. Press Cmd+R Cmd+G to open the Go to Link input box',
      `2. Type (or paste): ${linkText}`,
      '3. Press Enter',
    ]);

    const lines = logCapture.getLinesSince('before-gtl-007');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);
    assertToastLogged(lines, {
      type: 'warning',
      message: `RangeLink: Cannot find file: ${missingPath}`,
    });

    assert.strictEqual(
      vscode.window.activeTextEditor?.document.uri.toString(),
      uriBefore,
      'Expected active editor URI to be unchanged (no navigation occurred)',
    );

    log('✓ Nonexistent file produced the file-not-found warning toast with exact path');
  });

  // ---------------------------------------------------------------------------
  // TC go-to-link-008
  // ---------------------------------------------------------------------------

  test('[assisted] go-to-link-008: Command Palette "RangeLink: Go to Link" opens the same input box', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-008');

    await waitForHuman(
      'go-to-link-008',
      'Command Palette → "RangeLink: Go to Link" → Escape the input box',
      [
        '1. Open the Command Palette (Cmd+Shift+P / Ctrl+Shift+P)',
        '2. Type: Go to Link',
        '3. Select "RangeLink: Go to Link"',
        '4. Escape the input box that appears',
      ],
    );

    const lines = logCapture.getLinesSince('before-gtl-008');

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);
    assertUserCancelledInputLogged(lines);

    log('✓ Command Palette entry opened the same Go to Link input box');
  });

  // ---------------------------------------------------------------------------
  // TC go-to-link-009
  // ---------------------------------------------------------------------------

  test('[assisted] go-to-link-009: R-M menu "Go to Link" item opens the same input box', async () => {
    const logCapture = getLogCapture();
    logCapture.mark('before-gtl-009');

    await waitForHuman(
      'go-to-link-009',
      'Cmd+R Cmd+M → select "Go to Link" → Escape the input box',
      [
        '1. Press Cmd+R Cmd+M (or click the 🔗 RangeLink status bar item) to open the R-M menu',
        '2. Select the "Go to Link" item',
        '3. Escape the Go to Link input box that appears',
      ],
    );

    const lines = logCapture.getLinesSince('before-gtl-009');

    const menuItems = extractQuickPickItemsLogged(lines);
    assert.ok(menuItems, 'Expected R-M menu quick pick log entry with items payload');
    assert.ok(
      menuItems!.some((item) => item.label === GO_TO_LINK_MENU_LABEL),
      `Expected R-M menu item with label "${GO_TO_LINK_MENU_LABEL}"`,
    );

    assertInputBoxLogged(lines, INPUT_BOX_OPTS);
    assertUserCancelledInputLogged(lines);

    log('✓ R-M menu item routed to the Go to Link input box (same prompt/placeholder as R-G)');
  });
});
