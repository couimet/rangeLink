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

**Using claude-code, ChatGPT, or Cursor for development?** RangeLink eliminates the context-sharing friction:

1. **Select code** → Generate link (`Cmd+R Cmd+L`)
2. **Paste Destination handles delivery** → Link appears where your AI can see it
3. **AI reads precise context** → No manual copy/paste, no lost focus
4. **AI responds with links** → **Click to jump directly to code** (Cmd+Click in terminal)

**Compete with Cursor's built-in AI** by making external AI assistants feel integrated. You get:

- ⚡ **Zero-friction AI context** — Paste destinations auto-send links. No clipboard juggling.
- 🎯 **Choice of AI model** — Claude, GPT, Gemini, anything. Not locked into Cursor's AI.
- 📐 **Full control over context** — Precise line ranges and column selections, not full files.
- 🔗 **Cross-file context** — Generate links from multiple files, paste all in one prompt. Built-in claude-code: single selection, current file only.
- 🌐 **Universal compatibility** — Works across editors (VSCode, Cursor) and in any text-based tool.

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

### 🎯 Paste Destinations

**The killer feature for AI-assisted workflows:** Auto-send generated links to your preferred destination.

#### Terminal Paste Destination

Bind a terminal to RangeLink, and all generated links auto-paste directly there — even if you switch to other terminals for work.

**Perfect for claude-code workflows:** Your links appear exactly where your AI assistant can see them. Zero copy/paste friction.

**How to use:**

1. Open integrated terminal
2. Command Palette → "Bind RangeLink to Terminal Destination"
3. Select code → Generate link → Appears instantly in terminal

**Bonus:** Terminal auto-focuses after paste, so you can immediately continue typing your prompt. Just like Cursor's `Cmd+L`.

#### Text Editor Destination

**Build AI prompts in a scratchpad before sending to claude-code?** Bind a text editor as your paste destination.

**Perfect for complex prompts:**

1. Split your editor (2+ tab groups) — side-by-side or vertical split
2. Open scratchpad file in one pane: untitled (`Cmd+N` / `Ctrl+N`) or any text file
3. Command Palette → "Bind RangeLink to Text Editor Destination"
4. Keep scratchpad visible (active tab in its pane)
5. Select code in other pane → Generate links → They paste at cursor automatically

**Workflow:**

- **Draft complex prompts** - Gather multiple code references in scratchpad
- **Review context** - See all links together, validate navigation (Cmd+Click to test)
- **Iterate on prompts** - Edit, rearrange, add notes around links before sending to terminal

**Requirements:**

- **Split editor (2+ tab groups)** - Ensures bound file stays visible while you browse code
- **Bound file must be topmost tab** - Auto-paste only works when it's the active tab in its pane
- **Text-like files only** - Binary files (images, PDFs, archives) are blocked

Links auto-paste at cursor position with smart spacing. If bound file is hidden behind other tabs, link copies to clipboard with a reminder to make it active. When you close the bound file, RangeLink auto-unbinds with a notification.

#### Cursor AI Integration

**Streamlined workflow for Cursor users.** When you generate a link, RangeLink copies it to your clipboard and opens the Cursor chat panel — one `Cmd+V` / `Ctrl+V` away from sending context to AI.

**How to use:**

1. Command Palette → "Bind RangeLink to Cursor AI Destination"
2. Select code → Generate link
3. RangeLink copies link + opens chat
4. Paste (`Cmd+V` / `Ctrl+V`) to send

**Why this approach?** Cursor's extension API doesn't yet support programmatic text insertion (as of Nov 2025). RangeLink handles clipboard management and focus changes, cutting your workflow from 5 manual steps to 1.

**One destination at a time:** You can bind to terminal, text editor, OR Cursor AI. Use "Unbind Destination" to switch.

---

### 🖱️ Link Navigation

**Click RangeLinks anywhere to jump directly to code** — the perfect complement to paste destinations.

#### Terminal Navigation

Any RangeLink in your terminal becomes clickable — whether from claude-code responses, your own links you're validating before sending, or references shared by teammates:

- **Cmd+Click** (Mac) or **Ctrl+Click** (Windows/Linux) to navigate
- **Instant file opening** with precise cursor positioning
- **Works with all formats:** single-line, ranges, columns, rectangular selections
- **Smart path resolution:** workspace-relative and absolute paths supported

**Example:** AI suggests checking `src/auth.ts#L42C10-L58C25` → Click → VSCode opens file at exact selection.

#### Editor Navigation

RangeLinks in editor files (markdown, text, code, untitled) are also clickable:

- **Hover** to see navigation details
- **Cmd+Click** to jump to code
- **Perfect for scratchpads** - Validate links before sending to claude-code

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

| Command                                   | Shortcut (Mac)      | Shortcut (Win/Linux)  | Description                                             |
| ----------------------------------------- | ------------------- | --------------------- | ------------------------------------------------------- |
| Copy Range Link                           | `Cmd+R Cmd+L`       | `Ctrl+R Ctrl+L`       | Create relative path link                               |
| Copy Range Link (Absolute)                | `Cmd+R Cmd+Shift+L` | `Ctrl+R Ctrl+Shift+L` | Create absolute path link                               |
| Copy Portable Link                        | `Cmd+R Cmd+P`       | `Ctrl+R Ctrl+P`       | Create BYOD portable link                               |
| Copy Portable Link (Absolute)             | `Cmd+R Cmd+Shift+P` | `Ctrl+R Ctrl+Shift+P` | Create absolute BYOD link                               |
| Bind RangeLink to Terminal Destination    | —                   | —                     | Auto-send links to integrated terminal for AI workflows |
| Bind RangeLink to Text Editor Destination | —                   | —                     | Auto-send links at cursor in active bound text editor   |
| Bind RangeLink to Cursor AI Destination   | —                   | —                     | Copy link + open Cursor chat (clipboard workflow)       |
| Unbind Destination                        | —                   | —                     | Stop auto-sending links to bound destination            |
| Show Version Info                         | —                   | —                     | Display version and build info                          |

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
- 🤝 [Contributing Guide](https://github.com/couimet/rangelink/blob/main/CONTRIBUTING.md)

## Featured In

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
- 🤝 **[Contributing Guide](https://github.com/couimet/rangelink#contributing)** - Help make RangeLink even better
- 🗺️ **[Roadmap](https://github.com/couimet/rangelink/blob/main/docs/ROADMAP.md)** - What's coming next (enhanced navigation, multi-range support, and more!)

## License

MIT - see [LICENSE](https://github.com/couimet/rangelink/blob/main/LICENSE) file for details.

---

Made with ❤️ for developers who love precision
