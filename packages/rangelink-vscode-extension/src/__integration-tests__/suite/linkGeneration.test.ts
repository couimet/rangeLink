import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_COPY_LINK_ONLY_RELATIVE } from '../../constants/commandIds';
import { assertClipboardEqualsGeneratedLink, echoToTerminal, standardSuite, waitForHumanVerdict } from '../helpers';

standardSuite('Link Generation', (ss) => {
  test('full-line-link-generation-001: selecting line + trailing newline generates #L20 not #L20-L21', async () => {
    const { uri } = ss.createContentFile('tc132', 25, (i) => `line ${i + 1} content`);

    const editor = await ss.openEditor(uri);

    editor.selection = new vscode.Selection(new vscode.Position(19, 0), new vscode.Position(20, 0));

    ss.expectStatusBarMessages(['✓ RangeLink: RangeLink copied to clipboard']);
    const { generatedLink } = await assertClipboardEqualsGeneratedLink(
      'R-C should copy full-line link to clipboard',
      async () => {
        await vscode.commands.executeCommand(CMD_COPY_LINK_ONLY_RELATIVE);
        await ss.settle();
      },
      'before-full-line-001',
    );

    assert.ok(
      generatedLink.includes('#L20'),
      `Expected link to contain #L20, got: ${generatedLink}`,
    );
    assert.ok(
      !generatedLink.includes('#L20-L21'),
      `Expected no #L20-L21 in link but got: ${generatedLink}`,
    );
    assert.ok(
      !generatedLink.includes('#L21'),
      `Expected no #L21 in link but got: ${generatedLink}`,
    );
  });

  test('[assisted] wrapped-link-navigation-baseline: plain RangeLink in terminal is clickable and navigates correctly', async () => {
    const targetUri = ss.createWorkspaceFile(
      'wln-baseline-target',
      'line 1\nline 2\nline 3\nline 4\nTARGET LINE 5\nline 6\n',
    );
    const relativePath = vscode.workspace.asRelativePath(targetUri, false);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 5` }]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const terminal = await ss.createTerminal('wln-baseline');
    echoToTerminal(terminal, `${relativePath}#L5`);
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'wrapped-link-navigation-baseline',
      `Cmd+click the RangeLink ${relativePath}#L5 in terminal "wln-baseline". Did VS Code open the target file showing "TARGET LINE 5"?`,
      [
        '1. Find terminal "wln-baseline" in the terminal panel',
        `2. Cmd+click on ${relativePath}#L5 — a plain RangeLink with no wrapping characters`,
        '3. Verify the target file opens showing "TARGET LINE 5"',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: plain RangeLink did not navigate correctly');
    ss.log('✓ wrapped-link-navigation-baseline — plain RangeLink navigated (human verified)');
  });

  test('[assisted] wrapped-link-navigation-001: backtick-wrapped RangeLink in terminal is clickable and navigates correctly', async () => {
    const targetUri = ss.createWorkspaceFile(
      'wln-001-target',
      'line 1\nline 2\nline 3\nline 4\nTARGET LINE 5\nline 6\n',
    );
    const relativePath = vscode.workspace.asRelativePath(targetUri, false);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 5` }]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const terminal = await ss.createTerminal('wln-001');
    echoToTerminal(terminal, `\`${relativePath}#L5\``);
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'wrapped-link-navigation-001',
      `Cmd+click the RangeLink \`${relativePath}#L5\` in terminal "wln-001". Did VS Code open the target file showing "TARGET LINE 5"?`,
      [
        '1. Find terminal "wln-001" in the terminal panel',
        `2. Cmd+click on \`${relativePath}#L5\` — the RangeLink wrapped in backticks`,
        '3. Verify the target file opens showing "TARGET LINE 5"',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: backtick-wrapped RangeLink did not navigate correctly');
    ss.log('✓ wrapped-link-navigation-001 — backtick-wrapped RangeLink navigated (human verified)');
  });

  test('[assisted] wrapped-link-navigation-002: single-quote-wrapped RangeLink in terminal is clickable and navigates correctly', async () => {
    const targetUri = ss.createWorkspaceFile(
      'wln-002-target',
      'line 1\nline 2\nline 3\nline 4\nTARGET LINE 5\nline 6\n',
    );
    const relativePath = vscode.workspace.asRelativePath(targetUri, false);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 5` }]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const terminal = await ss.createTerminal('wln-002');
    echoToTerminal(terminal, `'${relativePath}#L5'`);
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'wrapped-link-navigation-002',
      `Cmd+click the RangeLink '${relativePath}#L5' in terminal "wln-002". Did VS Code open the target file showing "TARGET LINE 5"?`,
      [
        '1. Find terminal "wln-002" in the terminal panel',
        `2. Cmd+click on '${relativePath}#L5' — the RangeLink wrapped in single quotes`,
        '3. Verify the target file opens showing "TARGET LINE 5"',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: single-quote-wrapped RangeLink did not navigate correctly');
    ss.log('✓ wrapped-link-navigation-002 — single-quote-wrapped RangeLink navigated (human verified)');
  });

  test('[assisted] wrapped-link-navigation-003: double-quote-wrapped RangeLink in terminal is clickable and navigates correctly', async () => {
    const targetUri = ss.createWorkspaceFile(
      'wln-003-target',
      'line 1\nline 2\nline 3\nline 4\nTARGET LINE 5\nline 6\n',
    );
    const relativePath = vscode.workspace.asRelativePath(targetUri, false);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 5` }]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const terminal = await ss.createTerminal('wln-003');
    echoToTerminal(terminal, `"${relativePath}#L5"`);
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'wrapped-link-navigation-003',
      `Cmd+click the RangeLink "${relativePath}#L5" in terminal "wln-003". Did VS Code open the target file showing "TARGET LINE 5"?`,
      [
        '1. Find terminal "wln-003" in the terminal panel',
        `2. Cmd+click on "${relativePath}#L5" — the RangeLink wrapped in double quotes`,
        '3. Verify the target file opens showing "TARGET LINE 5"',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: double-quote-wrapped RangeLink did not navigate correctly');
    ss.log('✓ wrapped-link-navigation-003 — double-quote-wrapped RangeLink navigated (human verified)');
  });

  test('[assisted] wrapped-link-navigation-004: angle-bracket-wrapped RangeLink in terminal is clickable and navigates correctly', async () => {
    const targetUri = ss.createWorkspaceFile(
      'wln-004-target',
      'line 1\nline 2\nline 3\nline 4\nTARGET LINE 5\nline 6\n',
    );
    const relativePath = vscode.workspace.asRelativePath(targetUri, false);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 5` }]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const terminal = await ss.createTerminal('wln-004');
    echoToTerminal(terminal, `<${relativePath}#L5>`);
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'wrapped-link-navigation-004',
      `Cmd+click the RangeLink <${relativePath}#L5> in terminal "wln-004". Did VS Code open the target file showing "TARGET LINE 5"?`,
      [
        '1. Find terminal "wln-004" in the terminal panel',
        `2. Cmd+click on <${relativePath}#L5> — the RangeLink wrapped in angle brackets`,
        '3. Verify the target file opens showing "TARGET LINE 5"',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: angle-bracket-wrapped RangeLink did not navigate correctly');
    ss.log('✓ wrapped-link-navigation-004 — angle-bracket-wrapped RangeLink navigated (human verified)');
  });

  test('[assisted] wrapped-link-navigation-005: paren-wrapped RangeLink in terminal is clickable and navigates to the correct file', async () => {
    const targetUri = ss.createWorkspaceFile(
      'wln-005-target',
      'line 1\nline 2\nline 3\nline 4\nTARGET LINE 5\nline 6\n',
    );
    const relativePath = vscode.workspace.asRelativePath(targetUri, false);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 5` }]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const terminal = await ss.createTerminal('wln-005');
    echoToTerminal(terminal, `(${relativePath}#L5)`);
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'wrapped-link-navigation-005',
      `Cmd+click the RangeLink (${relativePath}#L5) in terminal "wln-005". Did VS Code open the target file showing "TARGET LINE 5"?`,
      [
        '1. Find terminal "wln-005" in the terminal panel',
        `2. Cmd+click on (${relativePath}#L5) — the RangeLink enclosed in parentheses`,
        '3. Verify the target file opens showing "TARGET LINE 5"',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: paren-wrapped RangeLink did not navigate correctly');
    ss.log('✓ wrapped-link-navigation-005 — paren-wrapped RangeLink navigated (human verified)');
  });

  test('[assisted] wrapped-link-navigation-006: paren-then-colon-wrapped RangeLink in terminal is clickable and navigates correctly', async () => {
    const targetUri = ss.createWorkspaceFile(
      'wln-006-target',
      'line 1\nline 2\nline 3\nline 4\nTARGET LINE 5\nline 6\n',
    );
    const relativePath = vscode.workspace.asRelativePath(targetUri, false);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 5` }]);
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const terminal = await ss.createTerminal('wln-006');
    echoToTerminal(terminal, `(${relativePath}#L5):`);
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'wrapped-link-navigation-006',
      `Cmd+click the RangeLink (${relativePath}#L5): in terminal "wln-006". Did VS Code open the target file showing "TARGET LINE 5"?`,
      [
        '1. Find terminal "wln-006" in the terminal panel',
        `2. Cmd+click on (${relativePath}#L5): — the RangeLink wrapped in parens with trailing colon`,
        '3. Verify the target file opens showing "TARGET LINE 5"',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: paren-then-colon-wrapped RangeLink did not navigate correctly');
    ss.log('✓ wrapped-link-navigation-006 — paren-then-colon-wrapped RangeLink navigated (human verified)');
  });

  test('[assisted] markdown-link-navigation-001: Markdown link [label](path#L5) in a document is clickable and navigates correctly', async () => {
    const targetUri = ss.createWorkspaceFile(
      'mln-001-target',
      'line 1\nline 2\nline 3\nline 4\nTARGET LINE 5\nline 6\n',
    );
    const relativePath = vscode.workspace.asRelativePath(targetUri, false);

    ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 5` }]);

    await ss.createAndOpenFile(
      '__rl-test-markdown-link',
      `Click [here](${relativePath}#L5) for details\n`,
    );
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'markdown-link-navigation-001',
      `Cmd+click the Markdown link [here](${relativePath}#L5) in the editor. Did VS Code open the target file showing "TARGET LINE 5"?`,
      [
        '1. Find the document with "Click here for details"',
        `2. Cmd+click on the Markdown link [here](${relativePath}#L5)`,
        '3. Verify the target file opens showing "TARGET LINE 5"',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: Markdown link did not navigate correctly');
    ss.log('✓ markdown-link-navigation-001 — Markdown link navigated (human verified)');
  });

  test('[assisted] url-exclusion-001: HTTPS URL in terminal is not intercepted as a RangeLink', async () => {
    ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

    const terminal = await ss.createTerminal('url-excl-001');
    echoToTerminal(terminal, 'https://example.com/path/file.ts#L10');
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'url-exclusion-001',
      'Cmd+click on the https:// URL in terminal "url-excl-001". Verify that RangeLink does NOT navigate to any file.',
      [
        '1. Find terminal "url-excl-001" in the terminal panel',
        '2. Cmd+click on https://example.com/path/file.ts#L10',
        '3. Verify no file opens — RangeLink correctly ignores HTTPS URLs',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: HTTPS URL was incorrectly intercepted as a RangeLink');
    ss.log('✓ url-exclusion-001 — HTTPS URL not intercepted (human verified)');
  });
});

standardSuite('Link Generation — Clickable Links (Assisted)', (ss) => {
  test('[assisted] url-exclusion-002: https:// URL in document does not receive a RangeLink document link', async () => {
    await ss.createAndOpenFile(
      '__rl-test-url-exclusion',
      'Some text\nhttps://example.com/path/file.ts#L10\nMore text\n',
    );
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'url-exclusion-002',
      "Is RangeLink's hover/tooltip ABSENT from the https:// URL?",
      [
        '1. Hover your cursor over https://example.com/path/file.ts#L10 in the editor',
        '2. The URL will show a regular VS Code browser-style link hover — that is expected and fine',
        'Verdict:',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported FAIL: RangeLink document link appeared on https:// URL',
    );
    ss.log('✓ url-exclusion-002 — no RangeLink document link on https:// URL (human verified)');
  });

  test('[assisted] document-link-tooltip-001: hovering a clickable RangeLink shows clean tooltip', async () => {
    await ss.createAndOpenFile(
      '__rl-test-doc-link-tooltip',
      'See code at src/utils/helper.ts#L5 for details\n',
    );
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'document-link-tooltip-001',
      'Is the RangeLink tooltip clean and human-readable (showing file path + line number)?',
      [
        '1. Look at the line: See code at src/utils/helper.ts#L5 for details',
        '2. Hover your cursor over the RangeLink (it should be underlined/clickable)',
        'Verdict:',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: document link tooltip was not clean');
    ss.log(
      '✓ document-link-tooltip-001 — clean tooltip on RangeLink document link (human verified)',
    );
  });
});
