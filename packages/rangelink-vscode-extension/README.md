# RangeLink - Share Code Across Editors & Tools

<div align="center">
  <img src="https://raw.githubusercontent.com/couimet/rangelink/main/assets/icon.png" alt="RangeLink Logo" width="128" />
</div>

[![Version](https://img.shields.io/visual-studio-marketplace/v/couimet.rangelink-vscode-extension)](https://marketplace.visualstudio.com/items?itemName=couimet.rangelink-vscode-extension)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/couimet/rangelink/blob/main/LICENSE)

> **"Hey, check out lines 42 to 58... or was it 48 to 62?"** 🤔
> **Never again.** RangeLink gives you `src/auth.ts#L42C10-L58C25` — precise, portable, and **just works** across editors, tools, and teams.

## Why RangeLink?

### For AI-Assisted Development

**Using claude-code or ChatGPT for development?** RangeLink eliminates the context-sharing friction:

1. **Select code** → Generate link (`Cmd+R Cmd+L`)
2. **Bind to integrated terminal** → Link appears in claude-code instantly (within VSCode/Cursor)
3. **AI reads precise context** → No manual copy/paste, no lost focus
4. **AI responds with links** → **Click to jump directly to code** (Cmd+Click in terminal)

**Compete with Cursor's built-in AI** by making external AI assistants feel integrated. You get:

- ⚡ **Zero-friction AI context** — Bind to your integrated terminal (within VSCode/Cursor). Links appear instantly, no copy/paste.
- 🎯 **Choice of AI model** — Claude, GPT, Gemini, anything. Not locked into Cursor's AI.
- 📐 **Full control over context** — Precise line ranges and column selections, not full files.
- 🔗 **Cross-file context** — Generate links from multiple files, paste all in one prompt. Built-in claude-code: single selection, current file only.
- 🌐 **Universal compatibility** — Works across editors (VSCode, Cursor, Sublime) and in any text-based tool.

### Perfect For

- 🤖 **AI assistants** — claude-code, Copilot with _exact_ context + clickable navigation
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

### 🖱️ Terminal Link Navigation

**Click RangeLinks in your terminal to jump directly to code** — the killer feature for AI-assisted workflows.

Any RangeLink in the terminal becomes clickable — whether from claude-code responses, your own links you're validating before sending, or references shared by teammates:

- **Cmd+Click** (Mac) or **Ctrl+Click** (Windows/Linux) to navigate
- **Instant file opening** with precise cursor positioning
- **Works with all formats:** single-line, ranges, columns, rectangular selections
- **Smart path resolution:** workspace-relative and absolute paths supported

**Example:** AI suggests checking `src/auth.ts#L42C10-L58C25` → Click → VSCode opens file at exact selection.

### 🔗 Flexible Link Formats

- **Single line:** `src/file.ts#L42`
- **Line ranges:** `src/file.ts#L10-L25`
- **Column precision:** `src/file.ts#L42C6-L42C15`
- **Rectangular selections:** `src/file.ts##L10C5-L20C10` (double hash)

### 🔀 Terminal Binding

Bind a terminal to RangeLink (Command Palette → "Bind Terminal"), and all generated links auto-paste to that terminal — even if you switch to other terminals for work. Perfect for claude-code workflows: your links appear exactly where your AI assistant can see them. Zero copy/paste friction.

### ⚙️ Custom Delimiters

Personalize delimiters to match your workflow or organizational standards. Full validation ensures configurations always work.

### 📦 Portable Links (BYOD)

Share code references with teammates who use different delimiter configurations. Portable links embed metadata so they work everywhere — no coordination needed.

## Commands

All commands are available via keyboard shortcuts, Command Palette, and right-click context menu:

| Command                       | Shortcut (Mac)      | Shortcut (Win/Linux)  | Description                                             |
| ----------------------------- | ------------------- | --------------------- | ------------------------------------------------------- |
| Copy Range Link               | `Cmd+R Cmd+L`       | `Ctrl+R Ctrl+L`       | Create relative path link                               |
| Copy Range Link (Absolute)    | `Cmd+R Cmd+Shift+L` | `Ctrl+R Ctrl+Shift+L` | Create absolute path link                               |
| Copy Portable Link            | `Cmd+R Cmd+P`       | `Ctrl+R Ctrl+P`       | Create BYOD portable link                               |
| Copy Portable Link (Absolute) | `Cmd+R Cmd+Shift+P` | `Ctrl+R Ctrl+Shift+P` | Create absolute BYOD link                               |
| Bind to Terminal              | —                   | —                     | Auto-send links to integrated terminal for AI workflows |
| Unbind Terminal               | —                   | —                     | Stop auto-sending links to terminal                     |
| Show Version Info             | —                   | —                     | Display version and build info                          |

**Customizing Shortcuts:** Press `Cmd+K Cmd+S` (Mac) or `Ctrl+K Ctrl+S` (Win/Linux) to open Keyboard Shortcuts, then search for "RangeLink".

## Link Formats

RangeLink generates local file paths with GitHub-inspired range notation.

**💡 Pro Tip:** All these formats are clickable in the terminal! Cmd+Click any RangeLink to navigate — whether it's from claude-code responses, your own references you're validating, or links shared by teammates.

| Selection Type        | Format                              | Example                     |
| --------------------- | ----------------------------------- | --------------------------- |
| Single line           | `path#L<line>`                      | `src/file.ts#L42`           |
| Multiple lines        | `path#L<start>-L<end>`              | `src/file.ts#L10-L25`       |
| With column precision | `path#L<line>C<col>-L<line>C<col>`  | `src/file.ts#L42C6-L42C15`  |
| Rectangular selection | `path##L<start>C<col>-L<end>C<col>` | `src/file.ts##L10C5-L20C10` |

### Rectangular Selection

When you use VSCode's column selection (Alt+drag or Shift+Alt+Arrow keys), RangeLink detects this and uses a double hash (`##`) to indicate rectangular mode:

- **Normal multi-line**: `path#L10C5-L20C10` (traditional selection)
- **Rectangular mode**: `path##L10C5-L20C10` (rectangular selection)

### Portable Links (BYOD)

**Share links with anyone, regardless of their delimiter settings.**

Portable RangeLinks embed delimiter metadata so they work everywhere:

```
path#L10C5-L20C10~#~L~-~C~
```

The `~` separator marks embedded delimiters that override recipient's local settings. No coordination needed — links just work.

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
- 🤝 [Contributing Guide](https://github.com/couimet/rangelink/blob/main/CONTRIBUTING.md)

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
- 🤝 **[Contributing Guide](https://github.com/couimet/rangelink#contributing)** - Help make RangeLink even better
- 🗺️ **[Roadmap](https://github.com/couimet/rangelink/blob/main/docs/ROADMAP.md)** - What's coming next (link navigation, multi-range support, and more!)

## License

MIT - see [LICENSE](https://github.com/couimet/rangelink/blob/main/LICENSE) file for details.

---

Made with ❤️ for developers who love precision
