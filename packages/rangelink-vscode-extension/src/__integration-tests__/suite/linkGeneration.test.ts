import assert from 'node:assert';

import * as vscode from 'vscode';

import { CMD_COPY_LINK_ONLY_RELATIVE } from '../../constants/commandIds';
import {
  assertClipboardEqualsGeneratedLink,
  echoToTerminal,
  standardSuite,
  waitForHumanVerdict,
} from '../helpers';

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

  const WRAPPER_CASES = [
    {
      tcId: 'baseline',
      label: 'plain',
      wrapperDesc: 'a plain RangeLink with no wrapping characters',
      open: '',
      close: '',
      suffix: '',
    },
    {
      tcId: '001',
      label: 'backtick-wrapped',
      wrapperDesc: 'the RangeLink wrapped in backticks',
      open: '`',
      close: '`',
      suffix: '',
    },
    {
      tcId: '002',
      label: 'single-quote-wrapped',
      wrapperDesc: 'the RangeLink wrapped in single quotes',
      open: "'",
      close: "'",
      suffix: '',
    },
    {
      tcId: '003',
      label: 'double-quote-wrapped',
      wrapperDesc: 'the RangeLink wrapped in double quotes',
      open: '"',
      close: '"',
      suffix: '',
    },
    {
      tcId: '004',
      label: 'angle-bracket-wrapped',
      wrapperDesc: 'the RangeLink wrapped in angle brackets',
      open: '<',
      close: '>',
      suffix: '',
    },
    {
      tcId: '005',
      label: 'paren-wrapped',
      wrapperDesc: 'the RangeLink enclosed in parentheses',
      open: '(',
      close: ')',
      suffix: '',
    },
    {
      tcId: '006',
      label: 'paren-then-colon-wrapped',
      wrapperDesc: 'the RangeLink wrapped in parens with trailing colon',
      open: '(',
      close: ')',
      suffix: ':',
    },
  ];

  for (const { tcId, label, wrapperDesc, open, close, suffix } of WRAPPER_CASES) {
    test(`[assisted] wrapped-link-navigation-${tcId}: ${label} RangeLink in terminal is clickable and navigates correctly`, async () => {
      const targetUri = ss.createWorkspaceFile(
        `wln-${tcId}-target`,
        'line 1\nline 2\nline 3\nline 4\nTARGET LINE 5\nline 6\n',
      );
      const relativePath = vscode.workspace.asRelativePath(targetUri, false);
      const displayLink = `${open}${relativePath}#L5${close}${suffix}`;

      ss.expectToastMessages([{ level: 'info', message: `Navigated to ${relativePath} @ 5` }]);
      ss.expectContextKeys({ 'rangelink.isActiveTerminalBindable': true });

      const terminal = await ss.createTerminal(`wln-${tcId}`);
      echoToTerminal(terminal, displayLink);
      await ss.settle();

      const verdict = await waitForHumanVerdict(
        `wrapped-link-navigation-${tcId}`,
        `Cmd+click the RangeLink ${displayLink} in terminal "wln-${tcId}". Did VS Code open the target file showing "TARGET LINE 5"?`,
        [
          `1. Find terminal "wln-${tcId}" in the terminal panel`,
          `2. Cmd+click on ${displayLink} — ${wrapperDesc}`,
          '3. Verify the target file opens showing "TARGET LINE 5"',
          'Verdict:',
        ],
      );

      assert.strictEqual(
        verdict,
        'pass',
        `Human reported FAIL: ${label} RangeLink did not navigate correctly`,
      );
      ss.log(`✓ wrapped-link-navigation-${tcId} — ${label} RangeLink navigated (human verified)`);
    });
  }

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

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported FAIL: Markdown link did not navigate correctly',
    );
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

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported FAIL: HTTPS URL was incorrectly intercepted as a RangeLink',
    );
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
