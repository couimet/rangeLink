import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseLink, DEFAULT_DELIMITERS } from 'rangelink-core-ts';

import {
  activateExtension,
  assertToastLogged,
  clearEditorSelection,
  closeAllEditors,
  getLogCapture,
  getWorkspaceRoot,
  navigateViaHandleLinkClick,
} from '../helpers';

suite('Filename-Only Navigation Fallback', () => {
  let uniqueFilename: string;
  let uniqueFilePath: string;
  let relativeFilePath: string;

  suiteSetup(async () => {
    await activateExtension();

    const lines = Array.from({ length: 25 }, (_, i) => `line ${i + 1} content`);

    uniqueFilename = `__rl-test-fallback-${Date.now()}.ts`;
    const subDir = path.join(getWorkspaceRoot(), 'src', 'nested');
    fs.mkdirSync(subDir, { recursive: true });
    uniqueFilePath = path.join(subDir, uniqueFilename);
    fs.writeFileSync(uniqueFilePath, lines.join('\n') + '\n', 'utf8');

    relativeFilePath = path.relative(getWorkspaceRoot(), uniqueFilePath);
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    try {
      fs.unlinkSync(uniqueFilePath);
    } catch {
      // best-effort — subdirectory file, not managed by cleanupFiles
    }
  });

  test('filename-fallback-navigation-001: bare filename with unique match navigates to correct line', async () => {
    const linkText = `${uniqueFilename}#L5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-fallback-001');

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      uniqueFilename,
    );

    const lineLength = doc.lineAt(4).text.length;
    assert.deepStrictEqual(
      { anchorLine: sel.anchor.line, anchorChar: sel.anchor.character, activeLine: sel.active.line, activeChar: sel.active.character },
      { anchorLine: 4, anchorChar: 0, activeLine: 4, activeChar: lineLength },
    );

    const lines = logCapture.getLinesSince('before-fallback-001');
    assertToastLogged(lines, { type: 'info', message: `RangeLink: Navigated to ${uniqueFilename} @ 5` });
  });

  test('filename-fallback-navigation-004: path with directory separators uses standard resolution', async () => {
    const linkText = `${relativeFilePath}#L10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-fallback-004');

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      uniqueFilename,
    );

    const lineLength = doc.lineAt(9).text.length;
    assert.deepStrictEqual(
      { anchorLine: sel.anchor.line, anchorChar: sel.anchor.character, activeLine: sel.active.line, activeChar: sel.active.character },
      { anchorLine: 9, anchorChar: 0, activeLine: 9, activeChar: lineLength },
    );

    const lines = logCapture.getLinesSince('before-fallback-004');
    assertToastLogged(lines, { type: 'info', message: `RangeLink: Navigated to ${relativeFilePath} @ 10` });
  });
});
