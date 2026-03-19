import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

const SETTLE_MS = 500;
const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS = 5000;
const LOG_PREFIX = '[RL-integ:smartPadding]';
const SETTINGS_PROFILES_DIR = 'qa/fixtures/settings';

const log = (msg: string): void => {
  console.log(`${LOG_PREFIX} ${msg}`); // eslint-disable-line no-undef
};

const waitForActiveEditor = async (expectedUri: string): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const activeUri = vscode.window.activeTextEditor?.document.uri.toString();
    if (activeUri === expectedUri) {
      log(`waitForActiveEditor: matched after ${Date.now() - start}ms`);
      return true;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  const actualUri = vscode.window.activeTextEditor?.document.uri.toString() ?? '(none)';
  log(`waitForActiveEditor: TIMEOUT — expected=${expectedUri}, actual=${actualUri}`);
  return false;
};

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
};

const loadSettingsProfile = async (profileName: string): Promise<void> => {
  const profilePath = path.join(getWorkspaceRoot(), SETTINGS_PROFILES_DIR, `${profileName}.json`);
  log(`loadSettingsProfile: loading ${profileName} from ${profilePath}`);

  const profileContent = fs.readFileSync(profilePath, 'utf8');
  const settings = JSON.parse(profileContent) as Record<string, unknown>;
  const config = vscode.workspace.getConfiguration();

  for (const [key, value] of Object.entries(settings)) {
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }
  log(`loadSettingsProfile: applied ${Object.keys(settings).length} settings from ${profileName}`);
};

const resetRangelinkSettings = async (): Promise<void> => {
  const defaultProfilePath = path.join(getWorkspaceRoot(), SETTINGS_PROFILES_DIR, 'default.json');
  const defaultContent = fs.readFileSync(defaultProfilePath, 'utf8');
  const defaultSettings = JSON.parse(defaultContent) as Record<string, unknown>;
  const config = vscode.workspace.getConfiguration();

  for (const key of Object.keys(defaultSettings)) {
    await config.update(key, undefined, vscode.ConfigurationTarget.Global);
  }
  log('resetRangelinkSettings: cleared all rangelink settings to defaults');
};

suite('Smart Padding — Editor-to-Editor R-V', () => {
  let sourceFileUri: vscode.Uri;
  let destFileUri: vscode.Uri;

  suiteSetup(async () => {
    log('suiteSetup: activating extension');
    const ext = vscode.extensions.getExtension('couimet.rangelink-vscode-extension');

    assert.ok(ext, 'Extension couimet.rangelink-vscode-extension not found');
    await ext.activate();
    log('suiteSetup: extension activated');
  });

  setup(async () => {
    log('setup: unbinding any stale destination');
    await vscode.commands.executeCommand('rangelink.unbindDestination');

    const ts = Date.now();
    const sourcePath = path.join(getWorkspaceRoot(), `__rl-test-sp-source-${ts}.txt`);
    const destPath = path.join(getWorkspaceRoot(), `__rl-test-sp-dest-${ts}.txt`);

    fs.writeFileSync(sourcePath, '', 'utf8');
    fs.writeFileSync(destPath, '', 'utf8');

    sourceFileUri = vscode.Uri.file(sourcePath);
    destFileUri = vscode.Uri.file(destPath);
    log('setup: created source and dest files');
  });

  teardown(async () => {
    log('teardown: unbinding + closing editors + resetting settings');
    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await resetRangelinkSettings();

    for (const uri of [sourceFileUri, destFileUri]) {
      try {
        fs.unlinkSync(uri.fsPath);
      } catch {
        // best-effort cleanup
      }
    }
    log('teardown: complete');
  });

  const setupEditorPair = async (
    sourceContent: string,
  ): Promise<{ sourceEditor: vscode.TextEditor; destEditor: vscode.TextEditor }> => {
    fs.writeFileSync(sourceFileUri.fsPath, sourceContent, 'utf8');

    log('setupEditorPair: opening source in ViewColumn.One');
    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri);
    await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.One);

    log('setupEditorPair: opening dest in ViewColumn.Two');
    const destDoc = await vscode.workspace.openTextDocument(destFileUri);
    const destEditor = await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);

    log('setupEditorPair: binding dest via bindToTextEditorHere (with URI to bypass picker)');
    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere', destFileUri);
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    log('setupEditorPair: re-focusing source in ViewColumn.One');
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.One);
    const focused = await waitForActiveEditor(sourceFileUri.toString());
    log(`setupEditorPair: source active=${focused}, viewColumn=${sourceEditor.viewColumn}`);
    assert.ok(
      focused,
      'Source editor must be active before R-V — if this fails, external focus steal likely occurred',
    );

    return { sourceEditor, destEditor };
  };

  const setupUntitledEditorPair = async (
    sourceContent: string,
  ): Promise<{ sourceEditor: vscode.TextEditor; destDoc: vscode.TextDocument }> => {
    fs.writeFileSync(sourceFileUri.fsPath, sourceContent, 'utf8');

    log('setupUntitledEditorPair: opening source in ViewColumn.One');
    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri);
    await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.One);

    log('setupUntitledEditorPair: creating untitled dest in ViewColumn.Two');
    const destDoc = await vscode.workspace.openTextDocument({ content: '', language: 'plaintext' });
    await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    log(
      `setupUntitledEditorPair: dest scheme=${destDoc.uri.scheme}, uri=${destDoc.uri.toString()}`,
    );

    log('setupUntitledEditorPair: binding untitled dest (with URI to bypass picker)');
    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere', destDoc.uri);
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    log('setupUntitledEditorPair: re-focusing source in ViewColumn.One');
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.One);
    const focused = await waitForActiveEditor(sourceFileUri.toString());
    log(`setupUntitledEditorPair: source active=${focused}`);
    assert.ok(
      focused,
      'Source editor must be active before R-V — if this fails, external focus steal likely occurred',
    );

    return { sourceEditor, destDoc };
  };

  test('smart-padding-001: whitespace-only text preserved when sent to editor destination', async () => {
    const whitespaceContent = '   \t   ';
    log(
      'smart-padding-001: starting — whitespace-only content, default profile (pasteContent=none)',
    );
    await loadSettingsProfile('default');

    const { sourceEditor, destEditor } = await setupEditorPair(whitespaceContent);

    const lastLine = sourceEditor.document.lineCount - 1;
    const lastChar = sourceEditor.document.lineAt(lastLine).text.length;
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(lastLine, lastChar),
    );
    log(`smart-padding-001: selected ${lastChar} chars`);

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destEditor.document.getText();
    log(
      `smart-padding-001: destContent=${JSON.stringify(destContent)} (length=${destContent.length})`,
    );

    assert.ok(
      destContent.length > 0,
      'Expected destination to have content after R-V, but it was empty — whitespace was likely rejected by eligibility check',
    );
    assert.ok(
      destContent.includes('\t'),
      `Expected destination to contain tab from source, but got: ${JSON.stringify(destContent)}`,
    );
    log('smart-padding-001: PASSED');
  });

  test('smart-padding-002: simple text with pasteContent=both adds leading and trailing space', async () => {
    const sourceContent = 'hello world';
    log('smart-padding-002: starting — loading default profile then overriding pasteContent=both');
    await loadSettingsProfile('default');
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteContent', 'both', vscode.ConfigurationTarget.Global);

    const { sourceEditor, destEditor } = await setupEditorPair(sourceContent);

    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );
    log(`smart-padding-002: selected ${sourceContent.length} chars`);

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destEditor.document.getText();
    log(
      `smart-padding-002: destContent=${JSON.stringify(destContent)} (length=${destContent.length})`,
    );

    assert.strictEqual(
      destContent,
      ' hello world ',
      `Expected ' hello world ' (padding=both), but got: ${JSON.stringify(destContent)}`,
    );
    log('smart-padding-002: PASSED');
  });

  test('smart-padding-001-untitled: whitespace-only text sent to untitled editor destination', async () => {
    const whitespaceContent = '   \t   ';
    log('smart-padding-001-untitled: starting — default profile');
    await loadSettingsProfile('default');

    const { sourceEditor, destDoc } = await setupUntitledEditorPair(whitespaceContent);

    const lastLine = sourceEditor.document.lineCount - 1;
    const lastChar = sourceEditor.document.lineAt(lastLine).text.length;
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(lastLine, lastChar),
    );

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destDoc.getText();
    log(
      `smart-padding-001-untitled: destContent=${JSON.stringify(destContent)} (length=${destContent.length})`,
    );

    assert.ok(
      destContent.length > 0,
      `Expected untitled dest to have content, but it was empty. isClosed=${destDoc.isClosed}`,
    );
    log('smart-padding-001-untitled: PASSED');
  });

  test('smart-padding-003: multiline selection sent to editor destination', async () => {
    const sourceContent = 'line 1\nline 2\nline 3';
    log('smart-padding-003: starting — multiline, default profile (pasteContent=none)');
    await loadSettingsProfile('default');

    const { sourceEditor, destEditor } = await setupEditorPair(sourceContent);

    const lastLine = sourceEditor.document.lineCount - 1;
    const lastChar = sourceEditor.document.lineAt(lastLine).text.length;
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(lastLine, lastChar),
    );
    log(`smart-padding-003: selected lines 0-${lastLine}`);

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destEditor.document.getText();
    log(
      `smart-padding-003: destContent=${JSON.stringify(destContent)} (length=${destContent.length})`,
    );

    assert.strictEqual(
      destContent,
      'line 1\nline 2\nline 3',
      `Expected exact multiline content (pasteContent=none), but got: ${JSON.stringify(destContent)}`,
    );
    log('smart-padding-003: PASSED');
  });

  test('smart-padding-004: pasteContent=none sends exact text without padding', async () => {
    const sourceContent = 'hello';
    log('smart-padding-004: starting — default profile (pasteContent=none)');
    await loadSettingsProfile('default');

    const { sourceEditor, destEditor } = await setupEditorPair(sourceContent);

    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destEditor.document.getText();
    log(`smart-padding-004: destContent=${JSON.stringify(destContent)}`);

    assert.strictEqual(
      destContent,
      'hello',
      `Expected exact 'hello' (no padding), but got: ${JSON.stringify(destContent)}`,
    );
    log('smart-padding-004: PASSED');
  });

  test('smart-padding-005: pasteContent=before adds leading space only', async () => {
    const sourceContent = 'hello';
    log('smart-padding-005: starting — pasteContent=before');
    await loadSettingsProfile('default');
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteContent', 'before', vscode.ConfigurationTarget.Global);

    const { sourceEditor, destEditor } = await setupEditorPair(sourceContent);

    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destEditor.document.getText();
    log(`smart-padding-005: destContent=${JSON.stringify(destContent)}`);

    assert.strictEqual(
      destContent,
      ' hello',
      `Expected ' hello' (leading space only), but got: ${JSON.stringify(destContent)}`,
    );
    log('smart-padding-005: PASSED');
  });

  test('smart-padding-006: pasteContent=after adds trailing space only', async () => {
    const sourceContent = 'hello';
    log('smart-padding-006: starting — pasteContent=after');
    await loadSettingsProfile('default');
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteContent', 'after', vscode.ConfigurationTarget.Global);

    const { sourceEditor, destEditor } = await setupEditorPair(sourceContent);

    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destEditor.document.getText();
    log(`smart-padding-006: destContent=${JSON.stringify(destContent)}`);

    assert.strictEqual(
      destContent,
      'hello ',
      `Expected 'hello ' (trailing space only), but got: ${JSON.stringify(destContent)}`,
    );
    log('smart-padding-006: PASSED');
  });

  test('smart-padding-001-untitled-langswitch: binding survives language mode change on untitled file', async () => {
    const sourceContent = 'hello world';
    log('langswitch: starting');

    fs.writeFileSync(sourceFileUri.fsPath, sourceContent, 'utf8');

    const destDoc = await vscode.workspace.openTextDocument({ content: '', language: 'plaintext' });
    await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    const originalUri = destDoc.uri.toString();
    const originalLanguage = destDoc.languageId;
    log(`langswitch: dest uri=${originalUri}, language=${originalLanguage}`);

    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere', destDoc.uri);
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    log('langswitch: changing language to markdown');
    const updatedDestDoc = await vscode.languages.setTextDocumentLanguage(destDoc, 'markdown');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
    log(
      `langswitch: language now=${updatedDestDoc.languageId}, uriChanged=${originalUri !== updatedDestDoc.uri.toString()}, sameRef=${destDoc === updatedDestDoc}`,
    );

    const visibleEditors = vscode.window.visibleTextEditors;
    const destVisible = visibleEditors.filter((e) => e.document.uri.toString() === originalUri);
    log(
      `langswitch: visibleEditors=${visibleEditors.length}, destVisible=${destVisible.length}, destViewColumns=${destVisible.map((e) => e.viewColumn)}`,
    );

    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri);
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false,
    });
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    const sourceFocused = await waitForActiveEditor(sourceFileUri.toString());
    log(`langswitch: source active=${sourceFocused}, viewColumn=${sourceEditor.viewColumn}`);
    assert.ok(sourceFocused, 'Source editor must be active before R-V');

    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = updatedDestDoc.getText();
    log(`langswitch: destContent=${JSON.stringify(destContent)} (length=${destContent.length})`);

    assert.ok(
      destContent.length > 0,
      `POSSIBLE BUG: dest empty after language change. language=${originalLanguage}→${updatedDestDoc.languageId}, isClosed=${updatedDestDoc.isClosed}`,
    );
    log('langswitch: PASSED');
  });

  test('smart-padding-001-untitled-content-triggers-lang: binding survives content-triggered language detection', async () => {
    const sourceContent = 'hello world';
    log('content-lang: starting');

    fs.writeFileSync(sourceFileUri.fsPath, sourceContent, 'utf8');

    const destDoc = await vscode.workspace.openTextDocument({ content: '', language: 'plaintext' });
    const destEditor = await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    log(`content-lang: dest uri=${destDoc.uri.toString()}, language=${destDoc.languageId}`);

    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere', destDoc.uri);
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const mdContent = '```typescript\nconst x = 1;\n```\n';
    await destEditor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), mdContent);
    });
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    let currentDestDoc = destDoc;
    if (destDoc.languageId === 'plaintext') {
      currentDestDoc = await vscode.languages.setTextDocumentLanguage(destDoc, 'markdown');
      await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
    }
    log(
      `content-lang: language now=${currentDestDoc.languageId}, sameRef=${destDoc === currentDestDoc}`,
    );

    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri);
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false,
    });
    await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    const sourceFocused = await waitForActiveEditor(sourceFileUri.toString());
    log(`content-lang: source active=${sourceFocused}, viewColumn=${sourceEditor.viewColumn}`);
    assert.ok(sourceFocused, 'Source editor must be active before R-V');

    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = currentDestDoc.getText();
    log(`content-lang: destContent=${JSON.stringify(destContent)}`);

    assert.ok(
      destContent.includes(sourceContent),
      `POSSIBLE BUG: dest doesn't contain source text after language change. language=${currentDestDoc.languageId}, isClosed=${currentDestDoc.isClosed}`,
    );
    log('content-lang: PASSED');
  });
});
