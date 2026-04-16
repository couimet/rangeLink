// @ts-check
const vscode = require('vscode');

/** @type {DummyAiViewProvider | undefined} */
let provider;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  provider = new DummyAiViewProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('dummyAi.chatView', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dummyAi.insertText', async (text) => {
      await provider?.ensureView();
      provider?.postMessage({ type: 'insertText', text: String(text) });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dummyAi.insertWithArgs', async (args) => {
      const text = args && typeof args === 'object' ? String(args.text) : String(args);
      await provider?.ensureView();
      provider?.postMessage({ type: 'insertText', text });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dummyAi.focusForPaste', async () => {
      await provider?.ensureView();
      if (provider?._view) {
        provider.reveal();
      }
      provider?.postMessage({ type: 'focusForPaste' });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dummyAi.focusPanel', async () => {
      if (!provider?._view) {
        await vscode.commands.executeCommand('dummyAi.chatView.focus');
      } else {
        provider.reveal();
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dummyAi.getText', () => {
      return provider?.requestText();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dummyAi.clearAll', () => {
      provider?.postMessage({ type: 'clearAll' });
    }),
  );
}

function deactivate() {
  provider = undefined;
}

class DummyAiViewProvider {
  /** @type {vscode.WebviewView | undefined} */
  _view;

  /** @type {((value: any) => void) | undefined} */
  _pendingTextResolve;

  /** @type {Promise<void> | undefined} */
  _readyPromise;

  /** @type {(() => void) | undefined} */
  _readyResolve;

  /**
   * @param {vscode.WebviewView} webviewView
   */
  resolveWebviewView(webviewView) {
    this._view = webviewView;

    this._readyPromise = new Promise((resolve) => {
      this._readyResolve = resolve;
    });

    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getWebviewHtml();

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'ready' && this._readyResolve) {
        this._readyResolve();
        this._readyResolve = undefined;
      }
      if (msg.type === 'textResponse' && this._pendingTextResolve) {
        this._pendingTextResolve(msg.data);
        this._pendingTextResolve = undefined;
      }
    });

    webviewView.onDidDispose(() => {
      this._view = undefined;
      this._readyPromise = undefined;
    });
  }

  /**
   * @param {any} message
   */
  postMessage(message) {
    this._view?.webview.postMessage(message);
  }

  reveal() {
    if (this._view) {
      this._view.show(true);
    }
  }

  async ensureView() {
    if (!this._view) {
      await vscode.commands.executeCommand('dummyAi.chatView.focus');
    }

    const POLL_INTERVAL_MS = 50;
    const MAX_WAIT_MS = 3000;
    let elapsed = 0;
    while (!this._readyPromise && elapsed < MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      elapsed += POLL_INTERVAL_MS;
    }

    if (this._readyPromise) {
      await this._readyPromise;
    }
  }

  /**
   * @returns {Promise<{tier1: string, tier2: string}>}
   */
  requestText() {
    return new Promise((resolve) => {
      this._pendingTextResolve = resolve;
      this.postMessage({ type: 'getText' });
      setTimeout(() => {
        if (this._pendingTextResolve) {
          this._pendingTextResolve({ tier1: '', tier2: '' });
          this._pendingTextResolve = undefined;
        }
      }, 2000);
    });
  }
}

function getWebviewHtml() {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      margin: 0;
      padding: 8px;
    }
    .tier { margin-bottom: 12px; }
    label {
      display: block;
      font-weight: bold;
      margin-bottom: 4px;
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.7;
    }
    textarea {
      width: 100%;
      min-height: 60px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 13px);
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      padding: 6px;
      border-radius: 3px;
      resize: vertical;
      box-sizing: border-box;
    }
    textarea:focus { border-color: var(--vscode-focusBorder); }
  </style>
</head>
<body>
  <div class="tier">
    <label>Tier 1 — insertText</label>
    <textarea id="tier1" readonly placeholder="Text from dummyAi.insertText lands here"></textarea>
  </div>
  <div class="tier">
    <label>Tier 2 — focusForPaste</label>
    <textarea id="tier2" placeholder="Paste here after dummyAi.focusForPaste"></textarea>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const tier1 = document.getElementById('tier1');
    const tier2 = document.getElementById('tier2');

    vscode.postMessage({ type: 'ready' });

    window.addEventListener('message', (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'insertText':
          tier1.value = (tier1.value ? tier1.value + '\\n' : '') + msg.text;
          break;

        case 'focusForPaste':
          tier2.focus();
          break;

        case 'getText':
          vscode.postMessage({
            type: 'textResponse',
            data: {
              tier1: tier1.value,
              tier2: tier2.value,
            },
          });
          break;

        case 'clearAll':
          tier1.value = '';
          tier2.value = '';
          break;
      }
    });
  </script>
</body>
</html>`;
}

module.exports = { activate, deactivate };
