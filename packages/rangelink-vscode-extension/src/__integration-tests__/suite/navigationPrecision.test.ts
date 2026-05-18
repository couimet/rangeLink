import assert from 'node:assert';

import { DEFAULT_DELIMITERS, parseLink } from 'rangelink-core-ts';

import {
  assertToastLogged,
  clearEditorSelection,
  getLogCapture,
  navigateViaHandleLinkClick,
  standardSuite,
} from '../helpers';

standardSuite('Navigation Precision', (ss) => {
  const NAV_TEST_LINE_COUNT = 25;

  test('full-line-navigation-001: #L10 navigates to full line 10 — selection spans col 0 to end of line', async () => {
    const { filename: testFilename } = ss.createContentFile(
      'nav-001',
      NAV_TEST_LINE_COUNT,
      (i) => `line ${i + 1} content`,
    );

    const linkText = `${testFilename}#L10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-nav-001');

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const lineLength = doc.lineAt(9).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 9, anchorChar: 0, activeLine: 9, activeChar: lineLength },
    );

    const lines = logCapture.getLinesSince('before-nav-001');
    assertToastLogged(lines, {
      type: 'info',
      message: `Navigated to ${testFilename} @ 10`,
    });
  });

  test('full-line-navigation-002: #L10-L15 navigates to range — anchor (9,0), active at end of line 15', async () => {
    const { filename: testFilename } = ss.createContentFile(
      'nav-002',
      NAV_TEST_LINE_COUNT,
      (i) => `line ${i + 1} content`,
    );

    const linkText = `${testFilename}#L10-L15`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-nav-002');

    await clearEditorSelection();
    const { sel, doc } = await navigateViaHandleLinkClick(
      linkText,
      parseResult.value,
      testFilename,
    );

    const endLineLength = doc.lineAt(14).text.length;
    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 9, anchorChar: 0, activeLine: 14, activeChar: endLineLength },
    );

    const lines = logCapture.getLinesSince('before-nav-002');
    assertToastLogged(lines, {
      type: 'info',
      message: `Navigated to ${testFilename} @ 10-15`,
    });
  });

  test('char-navigation-001: #L10C5 navigates to cursor position (9,4)', async () => {
    const { filename: testFilename } = ss.createContentFile(
      'nav-003',
      NAV_TEST_LINE_COUNT,
      (i) => `line ${i + 1} content`,
    );

    const linkText = `${testFilename}#L10C5`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-char-001');

    await clearEditorSelection();
    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);

    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 9, anchorChar: 4, activeLine: 9, activeChar: 5 },
    );

    const lines = logCapture.getLinesSince('before-char-001');
    assertToastLogged(lines, {
      type: 'info',
      message: `Navigated to ${testFilename} @ 10:5`,
    });
  });

  test('char-navigation-002: #L10C5-L15C10 navigates to range (9,4)→(14,9)', async () => {
    const { filename: testFilename } = ss.createContentFile(
      'nav-004',
      NAV_TEST_LINE_COUNT,
      (i) => `line ${i + 1} content`,
    );

    const linkText = `${testFilename}#L10C5-L15C10`;
    const parseResult = parseLink(linkText, DEFAULT_DELIMITERS);
    assert.ok(parseResult.success, `Expected parseLink to succeed for: ${linkText}`);

    const logCapture = getLogCapture();
    logCapture.mark('before-char-002');

    await clearEditorSelection();
    const { sel } = await navigateViaHandleLinkClick(linkText, parseResult.value, testFilename);

    assert.deepStrictEqual(
      {
        anchorLine: sel.anchor.line,
        anchorChar: sel.anchor.character,
        activeLine: sel.active.line,
        activeChar: sel.active.character,
      },
      { anchorLine: 9, anchorChar: 4, activeLine: 14, activeChar: 9 },
    );

    const lines = logCapture.getLinesSince('before-char-002');
    assertToastLogged(lines, {
      type: 'info',
      message: `Navigated to ${testFilename} @ 10:5-15:10`,
    });
  });
});
