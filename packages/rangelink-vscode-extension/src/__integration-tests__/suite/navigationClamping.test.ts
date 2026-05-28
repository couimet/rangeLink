import assert from 'node:assert';

import { DEFAULT_DELIMITERS, parseLink } from 'rangelink-core-ts';

import { clearEditorSelection, navigateViaHandleLinkClick, standardSuite } from '../helpers';

const LINE_COUNT = 10;
const LINE_CONTENT = 'abcdefghijklmnopqrst';

standardSuite('Navigation Clamping', (ss) => {
  test('navigation-clamping-001: #L50 on 10-line file — selection clamped to last line', async () => {
    const { filename: testFilename } = ss.createContentFile(
      'clamp-001',
      LINE_COUNT,
      () => LINE_CONTENT,
    );

    const linkText = `${testFilename}#L50`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([
      {
        level: 'warning',
        message: `Navigated to ${testFilename} @ 50 (clamped: line exceeded file length)`,
      },
    ]);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lastLine = doc.lineCount - 1;
    const lastLineLength = doc.lineAt(lastLine).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: lastLine, anchorChar: 0, activeLine: lastLine, activeChar: lastLineLength },
    );
  });

  test('navigation-clamping-002: #L1C200 on 20-char line — character clamped to line length', async () => {
    const { filename: testFilename } = ss.createContentFile(
      'clamp-002',
      LINE_COUNT,
      () => LINE_CONTENT,
    );

    const linkText = `${testFilename}#L1C200`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([
      {
        level: 'warning',
        message: `Navigated to ${testFilename} @ 1:200 (clamped: column exceeded line length)`,
      },
    ]);

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lineLength = doc.lineAt(0).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 0, anchorChar: lineLength, activeLine: 0, activeChar: lineLength },
    );
  });

  test('navigation-clamping-003: #L5C10 within bounds — selection at exact position', async () => {
    const { filename: testFilename } = ss.createContentFile(
      'clamp-003',
      LINE_COUNT,
      () => LINE_CONTENT,
    );

    const linkText = `${testFilename}#L5C10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${testFilename} @ 5:10` }]);
    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);

    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 4, anchorChar: 9, activeLine: 4, activeChar: 10 },
    );
  });

  test('navigation-clamping-004: #L50C200 — both line and column clamped', async () => {
    const { filename: testFilename } = ss.createContentFile(
      'clamp-004',
      LINE_COUNT,
      () => LINE_CONTENT,
    );

    const linkText = `${testFilename}#L50C200`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    ss.expectToastMessages([
      {
        level: 'warning',
        message: `Navigated to ${testFilename} @ 50:200 (clamped: line and column exceeded bounds)`,
      },
    ]);
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lastLine = doc.lineCount - 1;
    const lastLineLength = doc.lineAt(lastLine).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      {
        anchorLine: lastLine,
        anchorChar: lastLineLength,
        activeLine: lastLine,
        activeChar: lastLineLength,
      },
    );
  });
});
