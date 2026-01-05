# RangeLink - One Keybinding. Precise References. Any AI assistant or tool.

<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangelink/main/assets/icon.png" alt="RangeLink Logo" width="128" />
</div>

[![Version](https://img.shields.io/visual-studio-marketplace/v/couimet.rangelink-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
[![Open VSX Version](https://img.shields.io/open-vsx/v/couimet/rangelink-vscode-extension?label=Open%20VSX&color=blue)](https://open-vsx.org/extension/couimet/rangelink-vscode-extension)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/couimet/rangelink/blob/main/LICENSE)

> **"Claude Code today. Cursor AI tomorrow. Different shortcuts, different muscle memory."**<br />
> **RangeLink ends it.** One keybinding. Any AI, any tool. Character-level precision. `recipes/baking/chickenpie.ts#L3C14-L314C16`

## Why RangeLink?

Every AI coding assistant has its own way to share code — different shortcuts, different formats, different muscle memory. If you use multiple AI tools, you're constantly context-switching.

**RangeLink unifies it:**

- **One keybinding** — `Cmd+R Cmd+L` works with Claude, Copilot, Cursor, terminal tools, text editors. Learn once, use everywhere.
- **Better precision** — Character-level ranges, not just lines. Share exactly what matters.
- **Universal format** — GitHub-style links work in PRs, Slack, docs. Not proprietary.
- **AI-agnostic** — Your workflow doesn't change when you switch AI assistants.

### For AI-Assisted Development

**Using Claude Code Extension, terminal claude-code, ChatGPT, or Cursor for development?** RangeLink eliminates the context-sharing friction:

1. **Select code** → Generate link (`Cmd+R Cmd+L`)
2. **Paste Destination handles delivery** → Link appears where your AI can see it
3. **AI reads precise context** → No manual copy/paste, no lost focus
4. **AI responds with links** → **Click to jump directly to code** (Cmd+Click in terminal or editor)

**Compete with built-in AI features** by making external AI assistants feel integrated. You get:

- ⚡ **Zero-friction AI context** — Paste destinations auto-send links. No clipboard juggling.
- 🎯 **Choice of AI model** — Claude, GPT, Gemini, anything. Not locked into one vendor.
- 📐 **Full control over context** — Character-level precision (`#L42C10`), not just line-level.
- 🔗 **Cross-file context** — Generate links from multiple files, paste all in one prompt.
- 🌐 **Universal compatibility** — Works across editors (VSCode, Cursor) and in any text-based tool.

### Perfect For

- 🤖 **AI assistants** — Claude Code Extension, Cursor AI, terminal claude-code, Copilot with _exact_ context + clickable navigation
- 💬 **Code reviews** — "The bug is in `api/routes.ts#L215C8-L223C45`" (click to view)
- 👥 **Team collaboration** — Universal format everyone can use and navigate

## Quick Start

### Installation

1. Open VSCode or Cursor
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "RangeLink"
4. Click Install

### Basic Usage

1. **Select text** in the editor (non-empty selection required)
2. **Press `Cmd+R Cmd+L`** (Mac) or `Ctrl+R Ctrl+L` (Windows/Linux)
3. Link copied to clipboard!

**Example output:**

```
src/utils/parser.ts#L42C10-L58C25
```

**Note:** `R` then `L` - the letters stand for **R**ange **L**ink.

## Features

### 🎯 Paste Destinations

**The killer feature for AI-assisted workflows:** Auto-send generated links to your preferred destination.

**RangeLink's unified pattern:** All paste destinations share the same seamless workflow—links paste exactly at your insertion point, the destination auto-focuses, and you immediately continue typing. No copy/paste friction, no manual clicking, no context switching. This is what makes RangeLink competitive with integrated AI assistants like Cursor's `Cmd+L`, but works across any destination and any AI.

#### Terminal Paste Destination

Bind a terminal to RangeLink, and all generated links auto-paste directly there — even if you switch to other terminals for work.

**Perfect for terminal-based AI workflows (claude-code CLI):** Links paste **exactly at your insertion point** in the terminal (not appended at the end), **and the terminal auto-focuses** so you can immediately continue typing your prompt.

**How to use:**

1. Open integrated terminal
2. Command Palette → "Bind RangeLink to Terminal Destination"
3. Select code → Generate link → Link pastes **at insertion point** + **terminal focuses automatically**

#### Text Editor Destination

**Build AI prompts in any text document before sending to your AI assistant?** Bind any text editor as your paste destination—works with untitled files, markdown, code files, notes, anything text-based.

**Perfect for complex prompts:** Links paste **exactly at your insertion point** in the bound editor, **and the editor auto-focuses** so you can immediately continue typing.

**How to use:**

1. Split your editor (2+ tab groups) — side-by-side or vertical split
2. Open scratchpad file in one pane: untitled (`Cmd+N` / `Ctrl+N`) or any text file
3. Command Palette → "Bind RangeLink to Text Editor Destination"
4. Select code in other pane → Generate links → They paste **at insertion point** + **editor focuses automatically**

**Workflow:**

- **Draft complex prompts** - Gather multiple code references in one place (any file type)
- **Review context** - See all links together, validate navigation (Cmd+Click to test)
- **Iterate on prompts** - Edit, rearrange, add notes around links before sending to AI

**Requirements:**

- **Split editor (2+ tab groups)** - Ensures bound file stays accessible while you browse code
- **Writable text files only** - Binary files (images, PDFs) and read-only views (git diffs, output panels) are blocked

When you close the bound file, RangeLink auto-unbinds with a notification. If the bound file is hidden behind other tabs, RangeLink automatically brings it to the foreground during paste.

#### AI Chat Integrations (Claude Code, Cursor AI & GitHub Copilot)

**One keybinding to rule them all.** AI assistants have their own ways to share code — different shortcuts, different formats, and only work with _their_ AI. RangeLink unifies it all: **one keybinding** (`Cmd+R Cmd+L`), **character-level precision** (not just lines), and works with **any AI assistant**.

**The precision advantage:** Most AI code-sharing tools work at _line-level_ precision. RangeLink goes deeper with _character-level_ ranges (`#L42C10-L58C25`), letting you highlight exactly the function signature, the problematic condition, or that one sneaky semicolon — not the whole block.

**Supported AI assistants:**

- **[Claude Code Extension](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code)** — Anthropic's official extension (works in VSCode and Cursor)
- **Cursor AI** — Built into Cursor IDE
- **[GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)** — GitHub's AI coding assistant

**How it works:**

1. Bind your AI assistant: Command Palette → "Bind RangeLink to..."
2. Select code → `Cmd+R Cmd+L` → Link auto-pastes into chat
3. Review and send

**One destination at a time:** Bind to Claude Code, Cursor AI, terminal, OR text editor. **Quick switching:** Run a different "Bind to..." command to replace your current binding with confirmation—no need to unbind first.

---

### 🖱️ Link Navigation

**Click RangeLinks anywhere to jump directly to code** — the perfect complement to paste destinations.

#### Terminal Navigation

Any RangeLink in your terminal becomes clickable — whether from claude-code responses, your own links you're validating before sending, or references shared by teammates:

- **Cmd+Click** (Mac) or **Ctrl+Click** (Windows/Linux) to navigate
- **Instant file opening** with precise caret positioning
- **Works with all formats:** single-line, ranges, columns, rectangular selections
- **Smart path resolution:** workspace-relative and absolute paths supported

**Example:** AI suggests checking `src/auth.ts#L42C10-L58C25` → Click → VSCode opens file at exact selection.

#### Editor Navigation

RangeLinks in editor files (markdown, text, code, untitled) are also clickable:

- **Hover** to see navigation details
- **Cmd+Click** to jump to code
- **Perfect for scratchpads** - Validate links before sending to claude-code

---

### ⚡ Status Bar Menu

Click the **RangeLink** item in the status bar (bottom right) to access quick actions:

- **Jump to Bound Destination** — Focus your currently bound paste destination (shows quick pick of available destinations when unbound)
- **Show Version Info** — Display extension version and build details

The menu provides quick access without memorizing keyboard shortcuts. More actions coming in future releases.

---

### 🔗 Flexible Link Formats

- **Single line:** `src/file.ts#L42`
- **Line ranges:** `src/file.ts#L10-L25`
- **Column precision:** `src/file.ts#L42C6-L42C15`
- **Rectangular selections:** `src/file.ts##L10C5-L20C10` (double hash)

### 📦 Portable Links (BYOD)

Share code references with teammates who use different delimiter configurations. Portable links embed metadata so they work everywhere — no coordination needed.

```text
path#L10C5-L20C10~#~L~-~C~
```

The `~` separator marks embedded delimiters that override recipient's local settings. No coordination needed — links just work.

**Learn more:** [Monorepo docs → BYOD Guide](https://github.com/couimet/rangelink/blob/main/docs/BYOD.md)

## Commands

All commands are available via keyboard shortcuts, Command Palette, and right-click context menu:

| Command                                           | Shortcut (Mac)      | Shortcut (Win/Linux)  | Description                                              |
| ------------------------------------------------- | ------------------- | --------------------- | -------------------------------------------------------- |
| Copy Range Link                                   | `Cmd+R Cmd+L`       | `Ctrl+R Ctrl+L`       | Create relative path link                                |
| Copy Range Link (Absolute)                        | `Cmd+R Cmd+Shift+L` | `Ctrl+R Ctrl+Shift+L` | Create absolute path link                                |
| Copy Portable Link                                | `Cmd+R Cmd+P`       | `Ctrl+R Ctrl+P`       | Create BYOD portable link                                |
| Copy Portable Link (Absolute)                     | `Cmd+R Cmd+Shift+P` | `Ctrl+R Ctrl+Shift+P` | Create absolute BYOD link                                |
| Copy Range Link (Clipboard Only)                  | `Cmd+R Cmd+C`       | `Ctrl+R Ctrl+C`       | Copy link to clipboard only (skip bound destination)     |
| Copy Range Link (Clipboard Only, Absolute)        | `Cmd+R Cmd+Shift+C` | `Ctrl+R Ctrl+Shift+C` | Copy absolute path link to clipboard only                |
| Paste Selected Text to Bound Destination          | `Cmd+R Cmd+V`       | `Ctrl+R Ctrl+V`       | Send selected text directly to bound destination         |
| Jump to Bound Destination                         | `Cmd+R Cmd+J`       | `Ctrl+R Ctrl+J`       | Focus your currently bound paste destination             |
| Bind RangeLink to Claude Code Destination         | —                   | —                     | Auto-send links to Claude Code chat                      |
| Bind RangeLink to Cursor AI Destination           | —                   | —                     | Auto-send links to Cursor AI chat                        |
| Bind RangeLink to GitHub Copilot Chat Destination | —                   | —                     | Auto-send links to Copilot Chat                          |
| Bind RangeLink to Terminal Destination            | —                   | —                     | Auto-send links to integrated terminal for AI workflows  |
| Bind RangeLink to Text Editor Destination         | —                   | —                     | Auto-paste links at insertion point in bound text editor |
| Unbind Destination                                | —                   | —                     | Stop auto-sending links to bound destination             |
| Show Version Info                                 | —                   | —                     | Display version and build info                           |

**Customizing Shortcuts:** Press `Cmd+K Cmd+S` (Mac) or `Ctrl+K Ctrl+S` (Win/Linux) to open Keyboard Shortcuts, then search for "RangeLink".

## Configuration

Customize delimiters in VSCode settings (Preferences > Settings > search "rangelink"):

```json
{
  "rangelink.delimiterLine": "L",
  "rangelink.delimiterPosition": "C",
  "rangelink.delimiterHash": "#",
  "rangelink.delimiterRange": "-"
}
```

**Validation Rules:**

- Delimiters cannot contain digits
- Delimiters cannot be empty
- All delimiters must be unique
- Reserved characters (`~`, `|`, `/`, `\`, `:`, `,`, `@`) cannot be used

Invalid configurations will fall back to defaults with a warning in the output channel (`Cmd+Shift+U` / `Ctrl+Shift+U`, select "RangeLink"). See [DEVELOPMENT.md](./DEVELOPMENT.md#development-workflow) for details.

[Full configuration guide →](https://github.com/couimet/rangelink#configuration)

## What's Next

RangeLink is under active development. See the [full roadmap](https://github.com/couimet/rangelink/blob/main/docs/ROADMAP.md) for planned features and other editor integrations.

## Requirements

- VSCode or Cursor version 1.49.0 or higher

## Known Issues

If you find a bug, please [report it](https://github.com/couimet/rangelink/issues).

When filing a bug report, please include:

- **Extension version:** Command Palette → "RangeLink: Show Version Info"
- **IDE:** VSCode or Cursor (with version number)
- **Operating system:** e.g., macOS 14.0, Windows 11, Ubuntu 22.04
- **Extension logs:** Open Output panel (`Cmd+Shift+U` / `Ctrl+Shift+U`), select "RangeLink", copy relevant logs. [More details →](./DEVELOPMENT.md#development-workflow)

## Links

- 📦 [Extension Source](https://github.com/couimet/rangelink/tree/main/packages/rangelink-vscode-extension)
- 🐛 [Report Issues](https://github.com/couimet/rangelink/issues)
- 📚 [Monorepo Documentation](https://github.com/couimet/rangelink#readme)

## Featured In

The most recent posts are at the top.

- [RangeLink v1.0.0: Perfected AI Workflows + The R-Keybinding Family](https://dev.to/couimet/rangelink-v100-perfected-ai-workflows-the-r-keybinding-family-104b) - DEV Community
- [RangeLink v0.3.0: One Keybinding to Rule Them All](https://dev.to/couimet/rangelink-v030-one-keybinding-to-rule-them-all-2h01) - DEV Community
- [I Built a VS Code Extension to Stop the Copy-Paste Madness](https://dev.to/couimet/i-built-a-vs-code-extension-to-stop-the-copy-paste-madness-3d7l) - DEV Community

## About

RangeLink is a monorepo project with:

- **rangelink-vscode-extension** - This VSCode extension (you are here)
- **rangelink-core-ts** - Pure TypeScript core library (platform-agnostic)
- **More plugins coming** - Neovim, Sublime Text, and more

The extension is a thin wrapper around the core library, ensuring consistent behavior across all editor integrations.

## Want to Learn More?

Curious about how RangeLink came to be or want to contribute?

- 📖 **[Project Origin Story](https://github.com/couimet/rangelink#history)** - Why RangeLink exists (spoiler: claude-code changed everything)
- 🐔 **[About the Logo](https://github.com/couimet/rangelink#about-the-logo)** - Free-range chickens, precision, and Pi (yes, really)
- 🏗️ **[Architecture & Monorepo](https://github.com/couimet/rangelink#monorepo-structure)** - How it's built and organized
- 🤝 **[Contributing Guide](https://github.com/couimet/rangelink/blob/main/CONTRIBUTING.md)** - Help make RangeLink even better
- 🗺️ **[Roadmap](https://github.com/couimet/rangelink/blob/main/docs/ROADMAP.md)** - What's coming next (enhanced navigation, multi-range support, and more!)

## License

MIT - see [LICENSE](https://github.com/couimet/rangelink/blob/main/LICENSE) file for details.

---

Made with ❤️ for developers who love precision
