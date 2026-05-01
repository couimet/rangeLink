import assert from 'node:assert';

import { NoOpLogger } from 'barebone-logger';
import { DEFAULT_DELIMITERS, findLinksInText } from 'rangelink-core-ts';
import * as vscode from 'vscode';

import {
  activateExtension,
  cleanupFiles,
  closeAllEditors,
  createAndOpenFile,
  createLogger,
  createWorkspaceFile,
  openEditor,
  printAssistedBanner,
  settle,
  waitForHumanVerdict,
} from '../helpers';

const LOGGER = new NoOpLogger();

suite('Link Generation', () => {
  const tmpFileUris: vscode.Uri[] = [];

  suiteSetup(async () => {
    await activateExtension();
  });

  suiteTeardown(async () => {
    await closeAllEditors();
    cleanupFiles(tmpFileUris);
  });

  test('full-line-link-generation-001: selecting line + trailing newline generates #L20 not #L20-L21', async () => {
    const lines = Array.from({ length: 25 }, (_, i) => `line ${i + 1} content`);
    const uri = createWorkspaceFile('tc132', lines.join('\n') + '\n');
    tmpFileUris.push(uri);

    const editor = await openEditor(uri);

    editor.selection = new vscode.Selection(new vscode.Position(19, 0), new vscode.Position(20, 0));

    await vscode.commands.executeCommand('rangelink.copyLinkOnlyWithRelativePath');
    const clipboard = await vscode.env.clipboard.readText();

    assert.ok(
      clipboard.includes('#L20'),
      `Expected clipboard to contain #L20 but got: ${clipboard}`,
    );
    assert.ok(
      !clipboard.includes('#L20-L21'),
      `Expected no #L20-L21 in clipboard but got: ${clipboard}`,
    );
    assert.ok(!clipboard.includes('#L21'), `Expected no #L21 in clipboard but got: ${clipboard}`);
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

suite('Link Generation — Clickable Links (Assisted)', () => {
  const log = createLogger('linkGenerationAssisted');
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

  test('[assisted] url-exclusion-002: https:// URL in document does not receive a RangeLink document link', async () => {
    const uri = await createAndOpenFile(
      '__rl-test-url-exclusion',
      'Some text\nhttps://example.com/path/file.ts#L10\nMore text\n',
    );
    tmpFileUris.push(uri);
    await settle();

    const verdict = await waitForHumanVerdict(
      'url-exclusion-002',
      'Hover over https://example.com/path/file.ts#L10 in the editor',
      [
        '1. Look at the line: https://example.com/path/file.ts#L10',
        '2. Hover your cursor over any part of that URL',
        '3. PASS if: no RangeLink tooltip or clickable underline appears',
        '4. A browser-style VS Code link tooltip is OK — only RangeLink must NOT add its own',
        '5. FAIL if: a RangeLink tooltip or clickable underline appears',
      ],
    );

    assert.strictEqual(
      verdict,
      'pass',
      'Human reported FAIL: RangeLink document link appeared on https:// URL',
    );
    log('✓ url-exclusion-002 — no RangeLink document link on https:// URL (human verified)');
  });

  test('[assisted] document-link-tooltip-001: hovering a clickable RangeLink shows clean tooltip', async () => {
    const uri = await createAndOpenFile(
      '__rl-test-doc-link-tooltip',
      'See code at src/utils/helper.ts#L5 for details\n',
    );
    tmpFileUris.push(uri);
    await settle();

    const verdict = await waitForHumanVerdict(
      'document-link-tooltip-001',
      'Hover over src/utils/helper.ts#L5 in the editor',
      [
        '1. Look at the line: See code at src/utils/helper.ts#L5 for details',
        '2. Hover your cursor over the link text (it should be underlined/clickable)',
        '3. PASS if: the tooltip shows clean human-readable text (file path and line number)',
        '4. FAIL if: the tooltip shows raw JSON, a command: URI, or internal parameters',
      ],
    );

    assert.strictEqual(verdict, 'pass', 'Human reported FAIL: document link tooltip was not clean');
    log('✓ document-link-tooltip-001 — clean tooltip on RangeLink document link (human verified)');
  });
});
