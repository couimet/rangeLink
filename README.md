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

**📖 [Full Feature Guide →](./packages/rangelink-vscode-extension/README.md)**

---

## Perfect For

- 🤖 **AI Assistants** — Claude Code, Cursor AI, GitHub Copilot, terminal claude-code — with exact context
- 💬 **Code Reviews** — "The bug is in `api/routes.ts#L215C8-L223C45`" (click to view)
- 👥 **Team Collaboration** — Universal format everyone can use and navigate
- 📝 **Documentation** — Precise references in docs, Slack, PRs, anywhere

---

## Documentation

### For Users

- **[Extension README](./packages/rangelink-vscode-extension/README.md)** — Full feature guide, commands, configuration
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

**[📁 See packages/ for details →](./packages/README.md)**

---

## History

Built out of frustration with copy-paste workflows between terminal AI tools and editors — and the fact that most tools only offer line-level precision, not character-level. One day, I sent claude-code a link like `auth.ts#L42C10-L58C25` — and it just worked. No explanation needed.

That was the lightbulb: **precise code references should be universal**. Not just for AI, but for code reviews, docs, team collaboration — anywhere developers share code.

**[📖 Read the full origin story →](./packages/rangelink-vscode-extension/README.md#about)**

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
