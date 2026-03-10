import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { NoOpLogger } from 'barebone-logger';
import { findLinksInText, DEFAULT_DELIMITERS } from 'rangelink-core-ts';
import * as vscode from 'vscode';

const LOGGER = new NoOpLogger();

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

const createTmpWorkspaceFile = (name: string, content: string): vscode.Uri => {
  const filePath = path.join(getWorkspaceRoot(), name);
  fs.writeFileSync(filePath, content, 'utf8');
  return vscode.Uri.file(filePath);
};

suite('Link Generation', () => {
  const tmpFiles: string[] = [];

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('couimet.rangelink');
    await ext?.activate();
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    for (const filePath of tmpFiles) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // best-effort cleanup
      }
    }
  });

  const trackFile = (uri: vscode.Uri): vscode.Uri => {
    tmpFiles.push(uri.fsPath);
    return uri;
  };

  // TC-132: Trailing-newline normalization
  test('TC-132: selecting line + trailing newline generates #L20 not #L20-L21', async () => {
    const lines = Array.from({ length: 25 }, (_, i) => `line ${i + 1} content`);
    const uri = trackFile(
      createTmpWorkspaceFile(`__rl-test-tc132-${Date.now()}.ts`, lines.join('\n') + '\n'),
    );
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);

    // Line 20 is index 19. Select from col 0 of line 19 to col 0 of line 20 — includes the trailing newline.
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

  // TC-133: Plain link
  test('TC-133: detects plain link (src/foo.ts#L5)', () => {
    const links = findLinksInText('src/foo.ts#L5\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
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

  // TC-134: Backtick-wrapped
  test('TC-134: detects backtick-wrapped link (`src/foo.ts#L5`)', () => {
    const links = findLinksInText('`src/foo.ts#L5`\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  // TC-135: Single-quote-wrapped
  test("TC-135: detects single-quote-wrapped link ('src/foo.ts#L5')", () => {
    const links = findLinksInText("'src/foo.ts#L5'\n", DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  // TC-136: Double-quote-wrapped
  test('TC-136: detects double-quote-wrapped link ("src/foo.ts#L5")', () => {
    const links = findLinksInText('"src/foo.ts#L5"\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  // TC-137: Angle-bracket-wrapped
  test('TC-137: detects angle-bracket-wrapped link (<src/foo.ts#L5>)', () => {
    const links = findLinksInText('<src/foo.ts#L5>\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  // TC-138: Markdown link syntax
  test('TC-138: detects Markdown link syntax ([text](src/foo.ts#L5))', () => {
    const links = findLinksInText('[click here](src/foo.ts#L5)\n', DEFAULT_DELIMITERS, LOGGER);

    assert.strictEqual(links.length, 1, `Expected 1 RangeLink but got ${links.length}`);
    assert.ok(
      links[0].parsed.path.includes('foo.ts'),
      `Expected path to include foo.ts: ${links[0].parsed.path}`,
    );
  });

  // TC-139: HTTP URL exclusion
  test('TC-139: HTTP URL is excluded — no RangeLink detected for https://example.com/path/file.ts#L10', () => {
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
