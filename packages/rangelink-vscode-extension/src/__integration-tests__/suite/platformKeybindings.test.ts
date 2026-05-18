import assert from 'node:assert';

import * as vscode from 'vscode';

import { standardSuite, waitForHumanVerdict } from '../helpers';

standardSuite('Platform Keybindings', (ss) => {
  test('[assisted] ubuntu-ctrl-keybindings-001: Ctrl+R chords work on Ubuntu/Linux', async () => {
    const testFileUri = ss.createWorkspaceFile(
      'ubuntu-ctrl-test',
      'line 1\nline 2\nline 3\nline 4\nline 5\n',
    );
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    await ss.settle();

    const verdict = await waitForHumanVerdict(
      'ubuntu-ctrl-keybindings-001',
      'Verify Ctrl+R chords work on Ubuntu/Linux',
      [
        '1. Press Ctrl+R Ctrl+M — verify the RangeLink menu opens, then Escape',
        '2. Press Ctrl+R Ctrl+D — verify the destination picker opens, then Escape',
        '3. Select lines 2-4, press Ctrl+R Ctrl+L — verify RangeLink is sent',
        '4. Press Ctrl+R Ctrl+G — verify Go to Link input box opens, then Escape',
        '5. Bind a destination, press Ctrl+R Ctrl+U — verify destination unbound',
      ],
    );

    assert.ok(verdict, 'Human confirmed Ubuntu Ctrl+R keybindings work correctly');
  });
});
