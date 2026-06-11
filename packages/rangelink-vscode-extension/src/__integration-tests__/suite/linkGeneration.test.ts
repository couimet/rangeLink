import assert from 'node:assert';

import { NoOpLogger } from 'barebone-logger';
import { DEFAULT_DELIMITERS, findLinksInText } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import { CMD_COPY_LINK_ONLY_RELATIVE } from '../../constants/commandIds';
import { assertClipboardEqualsGeneratedLink, standardSuite, waitForHumanVerdict } from '../helpers';

const LOGGER = new NoOpLogger();

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

  test('wrapped-link-navigation-baseline: detects plain link (src/foo.ts#L5)', () => {
    const links = findLinksInText('src/foo.ts#L5\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.strictEqual(
      links[0].linkText,
      'src/foo.ts#L5',
      `Expected linkText 'src/foo.ts#L5' but got '${links[0].linkText}'`,
    );
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
    assert.strictEqual(
      links[0].parsed.start.line,
      5,
      `Expected start line 5 but got ${links[0].parsed.start.line}`,
    );
  });

  test('wrapped-link-navigation-001: detects backtick-wrapped link (`src/foo.ts#L5`)', () => {
    const links = findLinksInText('`src/foo.ts#L5`\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.strictEqual(
      links[0].linkText,
      'src/foo.ts#L5',
      `Expected linkText 'src/foo.ts#L5' but got '${links[0].linkText}'`,
    );
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  test("wrapped-link-navigation-002: detects single-quote-wrapped link ('src/foo.ts#L5')", () => {
    const links = findLinksInText("'src/foo.ts#L5'\n", DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.strictEqual(
      links[0].linkText,
      'src/foo.ts#L5',
      `Expected linkText 'src/foo.ts#L5' but got '${links[0].linkText}'`,
    );
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  test('wrapped-link-navigation-003: detects double-quote-wrapped link ("src/foo.ts#L5")', () => {
    const links = findLinksInText('"src/foo.ts#L5"\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.strictEqual(
      links[0].linkText,
      'src/foo.ts#L5',
      `Expected linkText 'src/foo.ts#L5' but got '${links[0].linkText}'`,
    );
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  test('wrapped-link-navigation-004: detects angle-bracket-wrapped link (<src/foo.ts#L5>)', () => {
    const links = findLinksInText('<src/foo.ts#L5>\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.strictEqual(
      links[0].linkText,
      'src/foo.ts#L5',
      `Expected linkText 'src/foo.ts#L5' but got '${links[0].linkText}'`,
    );
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  test('markdown-link-navigation-001: detects Markdown link syntax ([text](src/foo.ts#L5))', () => {
    const links = findLinksInText('[click here](src/foo.ts#L5)\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.strictEqual(
      links[0].linkText,
      'src/foo.ts#L5',
      `Expected linkText 'src/foo.ts#L5' but got '${links[0].linkText}'`,
    );
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  test('url-exclusion-001: HTTP URL is excluded — no RangeLink detected for https://example.com/path/file.ts#L10', () => {
    const links = findLinksInText(
      'https://example.com/path/file.ts#L10\n',
      DEFAULT_DELIMITERS,
      LOGGER,
    );

    assert.strictEqual(
      links.length,
      0,
      `Expected 0 RangeLinks for HTTP URL but got ${links.length}: ${links.map((l) => l.linkText).join(', ')}`,
    );
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
      'Verify RangeLink does NOT add its own hover/tooltip on a regular https:// URL',
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
      'Hover over the RangeLink — expect a clean human-readable tooltip (file path + line number)',
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
