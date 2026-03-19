import assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as vscode from 'vscode';

const SETTLE_MS = 500;
const LOG_PREFIX = '[RL-integ:smartPadding]';

const log = (msg: string): void => {
  console.log(`${LOG_PREFIX} ${msg}`);
};

const getWorkspaceRoot = (): string => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Expected a workspace folder to be open');
  return folder.uri.fsPath;
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
    log(`setup: created source=${sourcePath}, dest=${destPath}`);
  });

  teardown(async () => {
    log('teardown: unbinding + closing editors');
    await vscode.commands.executeCommand('rangelink.unbindDestination');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await vscode.workspace
      .getConfiguration('rangelink')
      .update('smartPadding.pasteContent', undefined, vscode.ConfigurationTarget.Global);

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

    log(`setupEditorPair: opening dest in ViewColumn.Two (${destFileUri.fsPath})`);
    const destDoc = await vscode.workspace.openTextDocument(destFileUri);
    const destEditor = await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    log(`setupEditorPair: dest editor active=${vscode.window.activeTextEditor === destEditor}, viewColumn=${destEditor.viewColumn}`);

    log('setupEditorPair: binding dest editor via bindToTextEditorHere');
    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
    log('setupEditorPair: bind command returned, settling');

    log(`setupEditorPair: opening source in ViewColumn.One (${sourceFileUri.fsPath})`);
    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri);
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.One);
    log(`setupEditorPair: source editor active=${vscode.window.activeTextEditor === sourceEditor}, viewColumn=${sourceEditor.viewColumn}`);

    return { sourceEditor, destEditor };
  };

  const setupUntitledEditorPair = async (
    sourceContent: string,
  ): Promise<{ sourceEditor: vscode.TextEditor; destEditor: vscode.TextEditor; destDoc: vscode.TextDocument }> => {
    fs.writeFileSync(sourceFileUri.fsPath, sourceContent, 'utf8');

    log('setupUntitledEditorPair: creating untitled dest document');
    const destDoc = await vscode.workspace.openTextDocument({ content: '', language: 'plaintext' });
    const destEditor = await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    log(`setupUntitledEditorPair: dest scheme=${destDoc.uri.scheme}, uri=${destDoc.uri.toString()}, viewColumn=${destEditor.viewColumn}`);

    log('setupUntitledEditorPair: binding untitled dest via bindToTextEditorHere');
    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
    log('setupUntitledEditorPair: bind returned');

    log(`setupUntitledEditorPair: opening source in ViewColumn.One (${sourceFileUri.fsPath})`);
    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri);
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.One);
    log(`setupUntitledEditorPair: source active=${vscode.window.activeTextEditor === sourceEditor}`);

    log('setupUntitledEditorPair: verifying dest is still visible after focus switch');
    const visibleUris = vscode.window.visibleTextEditors.map((e) => e.document.uri.toString());
    log(`setupUntitledEditorPair: visibleEditors=[${visibleUris.join(', ')}]`);
    const destStillVisible = visibleUris.includes(destDoc.uri.toString());
    log(`setupUntitledEditorPair: destStillVisible=${destStillVisible}`);

    return { sourceEditor, destEditor, destDoc };
  };

  test('smart-padding-001: whitespace-only text preserved when sent to editor destination', async () => {
    const whitespaceContent = '   \t   ';
    log('smart-padding-001: starting — whitespace-only content');
    const { sourceEditor, destEditor } = await setupEditorPair(whitespaceContent);

    const lastLine = sourceEditor.document.lineCount - 1;
    const lastChar = sourceEditor.document.lineAt(lastLine).text.length;
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(lastLine, lastChar),
    );
    log(`smart-padding-001: selected ${lastChar} chars on line 0`);

    log('smart-padding-001: executing pasteSelectedTextToDestination');
    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destEditor.document.getText();
    log(`smart-padding-001: destContent=${JSON.stringify(destContent)} (length=${destContent.length})`);

    assert.ok(
      destContent.length > 0,
      'Expected destination file to have content after R-V, but it was empty — whitespace was likely rejected by eligibility check',
    );

    assert.ok(
      destContent.includes('\t'),
      `Expected destination to contain the tab character from source, but got: ${JSON.stringify(destContent)}`,
    );
    log('smart-padding-001: PASSED');
  });

  test('smart-padding-001-untitled: whitespace-only text sent to untitled editor destination (bug repro)', async () => {
    const whitespaceContent = '   \t   ';
    log('smart-padding-001-untitled: starting — untitled dest, whitespace-only content');
    const { sourceEditor, destEditor, destDoc } = await setupUntitledEditorPair(whitespaceContent);

    const lastLine = sourceEditor.document.lineCount - 1;
    const lastChar = sourceEditor.document.lineAt(lastLine).text.length;
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(lastLine, lastChar),
    );
    log(`smart-padding-001-untitled: selected ${lastChar} chars on line 0`);

    log('smart-padding-001-untitled: executing pasteSelectedTextToDestination');
    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destDoc.getText();
    log(`smart-padding-001-untitled: destContent=${JSON.stringify(destContent)} (length=${destContent.length})`);

    const destStillVisible = vscode.window.visibleTextEditors.some(
      (e) => e.document.uri.toString() === destDoc.uri.toString(),
    );
    log(`smart-padding-001-untitled: destStillVisible=${destStillVisible}, destDoc.isClosed=${destDoc.isClosed}`);

    assert.ok(
      destContent.length > 0,
      `Expected untitled destination to have content after R-V, but it was empty. destVisible=${destStillVisible}, destClosed=${destDoc.isClosed} — possible untitled unbind bug`,
    );

    assert.ok(
      destContent.includes('\t'),
      `Expected untitled destination to contain tab from source, but got: ${JSON.stringify(destContent)}`,
    );
    log('smart-padding-001-untitled: PASSED');
  });

  test('smart-padding-001-untitled-langswitch: binding survives language mode change on untitled file', async () => {
    const sourceContent = 'hello world';
    log('langswitch: starting — untitled dest with language mode change');

    fs.writeFileSync(sourceFileUri.fsPath, sourceContent, 'utf8');

    log('langswitch: creating untitled dest as plaintext');
    const destDoc = await vscode.workspace.openTextDocument({ content: '', language: 'plaintext' });
    const destEditor = await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    const originalUri = destDoc.uri.toString();
    const originalLanguage = destDoc.languageId;
    log(`langswitch: dest uri=${originalUri}, language=${originalLanguage}, scheme=${destDoc.uri.scheme}`);

    log('langswitch: binding untitled dest');
    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
    log('langswitch: bound');

    log('langswitch: changing language mode to markdown');
    await vscode.languages.setTextDocumentLanguage(destDoc, 'markdown');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
    const newLanguage = destDoc.languageId;
    const newUri = destDoc.uri.toString();
    log(`langswitch: after language change — uri=${newUri}, language=${newLanguage}, uriChanged=${originalUri !== newUri}`);

    const destStillVisible = vscode.window.visibleTextEditors.some(
      (e) => e.document.uri.toString() === destDoc.uri.toString(),
    );
    log(`langswitch: destStillVisible=${destStillVisible}, destDoc.isClosed=${destDoc.isClosed}`);

    log('langswitch: switching to source editor and selecting');
    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri);
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.One);
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );
    log(`langswitch: selected ${sourceContent.length} chars`);

    log('langswitch: executing pasteSelectedTextToDestination');
    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destDoc.getText();
    log(`langswitch: destContent=${JSON.stringify(destContent)} (length=${destContent.length})`);

    assert.ok(
      destContent.length > 0,
      `Expected destination to have content after R-V following language change, but it was empty. ` +
        `uriChanged=${originalUri !== newUri}, language=${originalLanguage}→${newLanguage}, ` +
        `destVisible=${destStillVisible}, destClosed=${destDoc.isClosed} — ` +
        `POSSIBLE BUG: language mode change may have triggered onDidCloseTextDocument → auto-unbind`,
    );
    log('langswitch: PASSED');
  });

  test('smart-padding-001-untitled-content-triggers-lang: binding survives when typed content triggers language detection', async () => {
    const sourceContent = 'hello world';
    log('content-lang: starting — untitled dest with content that triggers lang detection');

    fs.writeFileSync(sourceFileUri.fsPath, sourceContent, 'utf8');

    log('content-lang: creating untitled dest as plaintext');
    const destDoc = await vscode.workspace.openTextDocument({ content: '', language: 'plaintext' });
    const destEditor = await vscode.window.showTextDocument(destDoc, vscode.ViewColumn.Two);
    const originalUri = destDoc.uri.toString();
    log(`content-lang: dest uri=${originalUri}, language=${destDoc.languageId}`);

    log('content-lang: binding untitled dest');
    await vscode.commands.executeCommand('rangelink.bindToTextEditorHere');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    log('content-lang: inserting markdown-triggering content (triple backtick block) into dest');
    const mdContent = '```typescript\nconst x = 1;\n```\n';
    const insertSuccess = await destEditor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(0, 0), mdContent);
    });
    log(`content-lang: insert success=${insertSuccess}`);
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const langAfterInsert = destDoc.languageId;
    const uriAfterInsert = destDoc.uri.toString();
    log(`content-lang: after insert — uri=${uriAfterInsert}, language=${langAfterInsert}, uriChanged=${originalUri !== uriAfterInsert}`);

    log('content-lang: now changing language explicitly to markdown to simulate IDE auto-detection');
    if (langAfterInsert === 'plaintext') {
      await vscode.languages.setTextDocumentLanguage(destDoc, 'markdown');
      await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));
      log(`content-lang: forced language change to markdown, now language=${destDoc.languageId}`);
    } else {
      log(`content-lang: language already changed to ${langAfterInsert} — IDE auto-detected`);
    }

    const destStillVisible = vscode.window.visibleTextEditors.some(
      (e) => e.document.uri.toString() === destDoc.uri.toString(),
    );
    log(`content-lang: destStillVisible=${destStillVisible}, destClosed=${destDoc.isClosed}`);

    log('content-lang: switching to source and sending via R-V');
    const sourceDoc = await vscode.workspace.openTextDocument(sourceFileUri);
    const sourceEditor = await vscode.window.showTextDocument(sourceDoc, vscode.ViewColumn.One);
    sourceEditor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, sourceContent.length),
    );

    await vscode.commands.executeCommand('rangelink.pasteSelectedTextToDestination');
    await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

    const destContent = destDoc.getText();
    log(`content-lang: destContent=${JSON.stringify(destContent)} (length=${destContent.length})`);

    const hasSourceContent = destContent.includes(sourceContent);
    log(`content-lang: hasSourceContent=${hasSourceContent}`);

    assert.ok(
      hasSourceContent,
      `Expected destination to contain "${sourceContent}" after R-V following content-triggered language change, ` +
        `but got: ${JSON.stringify(destContent)}. ` +
        `language=${destDoc.languageId}, destVisible=${destStillVisible}, destClosed=${destDoc.isClosed} — ` +
        `POSSIBLE BUG: content-triggered language change may have broken the binding`,
    );
    log('content-lang: PASSED');
  });
});
