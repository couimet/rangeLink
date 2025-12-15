# RangeLink

<div align="center">
  <img src="./assets/icon.png" alt="RangeLink Logo" width="128" />
</div>

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/couimet.rangelink-vscode-extension?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
[![Open VSX Version](https://img.shields.io/open-vsx/v/couimet/rangelink-vscode-extension?label=Open%20VSX&color=blue)](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> **"Claude Code today. Cursor AI tomorrow. Different shortcuts, different muscle memory."**<br />
> **RangeLink ends it.** One keybinding. Any AI, any tool. Character-level precision. `recipes/baking/chickenpie.ts#L3C14-L314C16`

---

## Why RangeLink?

Every AI coding assistant has its own way to share code — different shortcuts, different formats, different muscle memory. If you use multiple AI tools, you're constantly context-switching.

**RangeLink unifies it:**

- **One keybinding** — `Cmd+R Cmd+L` works with Claude Code, Cursor AI, Copilot, terminal tools, text editors. Learn once, use everywhere.
- **Better precision** — Character-level ranges, not just lines. Share exactly what matters.
- **Universal format** — GitHub-style links work in PRs, Slack, docs. Not proprietary.
- **AI-agnostic** — Your workflow doesn't change when you switch AI assistants.

---

## Quick Install

**VS Code:**
[📦 Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)

**Cursor:**
[📦 Install from Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)

Or search for **"RangeLink"** in your editor's Extensions panel (`Cmd+Shift+X` / `Ctrl+Shift+X`)

---

## Try It (10 seconds)

1. **Select some code** in your editor
2. **Press `Cmd+R Cmd+L`** (Mac) or `Ctrl+R Ctrl+L` (Windows/Linux)
3. **Done!** Link is ready — in your clipboard or auto-pasted to your bound destination

**Example output:**

```text
recipes/baking/chickenpie.ts#L3C14-L314C16
```

---

## Features at a Glance

| Feature                   | Description                                                                       |
| ------------------------- | --------------------------------------------------------------------------------- |
| **Paste Destinations**    | Auto-send links to Claude Code, Cursor AI, Copilot Chat, Terminal, or Text Editor |
| **Link Navigation**       | Cmd+Click any RangeLink in terminal or editor to jump directly to code            |
| **Character Precision**   | `#L3C14-L314C16` — not just lines, exact character ranges                         |
| **Portable Links (BYOD)** | Links work regardless of recipient's delimiter configuration                      |
| **R-Keybinding Family**   | R-L (link), R-C (clipboard), R-V (paste text), R-J (jump to destination)          |

**📖 [Full Feature Guide →](./packages/rangelink-vscode-extension/#readme)**

---

## Perfect For

- 🤖 **AI Assistants** — Claude Code, Cursor AI, GitHub Copilot, terminal claude-code — with exact context
- 💬 **Code Reviews** — "The bug is in `api/routes.ts#L215C8-L223C45`" (click to view)
- 👥 **Team Collaboration** — Universal format everyone can use and navigate
- 📝 **Documentation** — Precise references in docs, Slack, PRs, anywhere

---

## Documentation

### For Users

- **[Extension README](./packages/rangelink-vscode-extension/#readme)** — Full feature guide, commands, configuration
- **[Link Formats](./docs/LINK-FORMATS.md)** — Complete notation reference
- **[BYOD Guide](./docs/BYOD.md)** — Portable links specification

### For Contributors

- **[Development Guide](./DEVELOPMENT.md)** — Setup, building, testing
- **[Contributing Guide](./CONTRIBUTING.md)** — How to contribute
- **[Architecture](./docs/ARCHITECTURE.md)** — Design principles and patterns
- **[Roadmap](./docs/ROADMAP.md)** — What's coming next

---

## Monorepo Structure

RangeLink is organized as a pnpm workspace with a platform-agnostic core library and editor-specific extensions. The core has zero dependencies and targets 100% test coverage.

**[📁 See packages/ for details →](./packages/#readme)**

---

## History

Even though I use Cursor daily, most of my AI work happens with `claude-code` running in a terminal _inside_ Cursor. The constant copy-pasting between terminal and editor was exhausting.

One day, frustrated after the hundredth copy-paste, I tried something: I sent claude-code a link like `auth.ts#L42C10-L58C25` pointing to a specific code snippet.

**It just worked.** No explanation needed. Claude understood immediately.

That was the lightbulb moment: **precise code references should be universal**. Not just for AI assistants, but for code reviews, documentation, team collaboration — anywhere developers share code.

I built the VS Code extension first, then extracted a platform-agnostic core library. The goal: make this work _everywhere_, for _everyone_.

Today, with **paste destinations**, RangeLink sends links directly where you need them — terminals, text editors, even Cursor AI chat. No more copy-paste friction. It helps developers share code with precision across claude-code, Cursor, VSCode, GitHub, Slack, and more. One format, zero friction.

**The best part?** Your teammates don't even need RangeLink installed to understand your links. The notation is GitHub-inspired — developers already know it.

<details>
<summary><b>🕰️ The Original POC (Memorabilia)</b></summary>

Before RangeLink became what it is today, it started as a rough-and-ready VS Code extension with just two files. Here's where it all began:

**package.json:**

```json
{
  "name": "copy-reference",
  "displayName": "Copy GitHub Reference",
  "description": "Copy GitHub-style file references with line and column numbers",
  "version": "0.1.0",
  "publisher": "local",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other"],
  "main": "./extension.js",
  "activationEvents": [],
  "contributes": {
    "commands": [
      {
        "command": "copyReference.copy",
        "title": "Copy GitHub-style Reference",
        "category": "Copy"
      }
    ],
    "keybindings": [
      {
        "command": "copyReference.copy",
        "key": "cmd+shift+l",
        "mac": "cmd+shift+l",
        "win": "ctrl+shift+l",
        "linux": "ctrl+shift+l",
        "when": "editorTextFocus"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "when": "editorTextFocus",
          "command": "copyReference.copy",
          "group": "9_cutcopypaste@4"
        }
      ]
    }
  }
}
```

**extension.js:**

```javascript
const vscode = require('vscode');

function activate(context) {
  let disposable = vscode.commands.registerCommand('copyReference.copy', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const document = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    // Get relative path from workspace root
    const relativePath = workspaceFolder
      ? document.uri.path.substring(workspaceFolder.uri.path.length + 1)
      : vscode.workspace.asRelativeUri(document.uri).path;

    const startLine = selection.start.line + 1;
    const startChar = selection.start.character + 1;
    const endLine = selection.end.line + 1;
    const endChar = selection.end.character + 1;

    // Format: path/to/file.rb#L1C1-L2C10
    let reference;
    if (selection.isEmpty) {
      // Just cursor position, no selection
      reference = `${relativePath}:${startLine}`;
    } else if (startLine === endLine && startChar === 1 && endChar > startChar) {
      // Full line selection - use simple format
      reference = `${relativePath}:${startLine}`;
    } else if (startLine === endLine) {
      // Single line selection with specific columns
      reference = `${relativePath}#L${startLine}C${startChar}-L${endLine}C${endChar}`;
    } else {
      // Multi-line selection
      reference = `${relativePath}#L${startLine}C${startChar}-L${endLine}C${endChar}`;
    }

    vscode.env.clipboard.writeText(reference);

    // Show a subtle notification
    vscode.window.setStatusBarMessage(`📋 Copied: ${reference}`, 3000);

    // Optional: Also show as information message (can be disabled if too intrusive)
    // vscode.window.showInformationMessage(`Copied: ${reference}`);
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
```

From this humble beginning, RangeLink evolved into a comprehensive monorepo with a platform-agnostic core library, comprehensive testing, structured error handling, portable BYOD links, and support for advanced features like rectangular selections.

</details>

---

## About the Logo

A **free-range** chicken — because your code should roam free across editors, tools, and teams. The chains represent links. And **3.1416** instead of 3.14? Because precision matters. 🐔

---

## Links

- 📦 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
- 📦 [Open VSX Registry](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)
- 💎 [Core Library](./packages/rangelink-core-ts)
- 🐛 [Report Issues](https://github.com/couimet/rangelink/issues)
- 📚 [Full Documentation](./docs/)

---

## License

MIT — see [LICENSE](./LICENSE) file for details.

---

Made with ❤️ for developers who love precision
