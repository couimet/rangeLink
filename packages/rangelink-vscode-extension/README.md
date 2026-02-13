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
recipes/baking/chickenpie.ts#L3C14-L15C9
```

**Note:** `R` then `L` - the letters stand for **R**ange **L**ink.

## Features

### 🎯 Destinations

**The killer feature for AI-assisted workflows:** Auto-send generated links to your preferred destination.

**RangeLink's unified pattern:** All paste destinations share the same seamless workflow—links paste exactly at your insertion point, the destination auto-focuses, and you immediately continue typing. No copy/paste friction, no manual clicking, no context switching. This is what makes RangeLink competitive with integrated AI assistants like Cursor's `Cmd+L`, but works across any destination and any AI.

**Send more than links:**

- `Cmd+R Cmd+V` — Paste your selection as-is (perfect for quick code snippets)
- `Cmd+R Cmd+F` — Paste current file's path (`Shift` for absolute)

No destination bound? A quick pick menu appears so you can choose and bind in one action.

**Pro tip:** Power users rebind destinations on the fly. Working with Claude Code? Bind there. Switching to debug in terminal? Rebind with a right-click. Your workflow, your rules.

#### Terminal

Bind a terminal to RangeLink, and all generated links auto-paste directly there — even if you switch to other terminals for work.

**Perfect for terminal-based AI workflows (claude-code CLI):** Links paste **exactly at your insertion point** in the terminal (not appended at the end), **and the terminal auto-focuses** so you can immediately continue typing your prompt.

**How to use:**

1. Open integrated terminal
2. Bind using either:
   - **Command Palette** → "Bind to Terminal" → **pick from your open terminals**
   - **Right-click terminal tab** or **right-click inside terminal** → "RangeLink: Bind Here"
   - **RangeLink Menu** (`Cmd+R Cmd+M`) → select a terminal from the inline list
3. Select code → Generate link → Link pastes **at insertion point** + **terminal focuses automatically**

**Terminal Picker:** When binding via Command Palette or RangeLink Menu, a QuickPick shows your eligible terminals. The currently bound terminal is marked "bound" and sorted first, followed by the active terminal marked "active". When a terminal is both bound and active, it shows "bound · active". With many terminals, extras collapse into "More terminals..." (configurable via `rangelink.terminalPicker.maxInline`) — the bound terminal is always visible, never hidden behind the overflow.

#### Text Editor

**Build AI prompts in any text document before sending to your AI assistant?** Bind any text editor as your paste destination—works with untitled files, markdown, code files, notes, anything text-based.

**Perfect for complex prompts:** Links paste **exactly at your insertion point** in the bound editor, **and the editor auto-focuses** so you can immediately continue typing.

**How to use:**

1. Open a scratchpad file: untitled (`Cmd+N` / `Ctrl+N`) or any text file
2. Bind using either:
   - **Command Palette** → "Bind to Text Editor"
   - **Right-click inside editor** → "RangeLink: Bind Here"
3. Select code in another file → Generate links → They paste **at insertion point** + **editor focuses automatically**

**Workflow:**

- **Draft complex prompts** - Gather multiple code references in one place (any file type)
- **Review context** - See all links together, validate navigation (Cmd+Click to test)
- **Iterate on prompts** - Edit, rearrange, add notes around links before sending to AI

**Requirements:**

- **Writable text files only** - Binary files (images, PDFs) and read-only views (git diffs, output panels) are blocked
- **Different source and destination** - If you try to paste to the same file you're selecting from, RangeLink copies to clipboard and shows a message (use R-C for intentional clipboard-only links)

When you close the bound file, RangeLink auto-unbinds with a notification. If the bound file is hidden behind other tabs, RangeLink automatically brings it to the foreground during paste.

**Pro tip:** Split your editor into two panes (side-by-side or vertical) for the smoothest workflow — browse code on one side, build your prompt on the other. No tab switching needed.

#### AI Assistants (Claude Code, Cursor AI & GitHub Copilot)

**One keybinding to rule them all.** AI assistants have their own ways to share code — different shortcuts, different formats, and only work with _their_ AI. RangeLink unifies it all: **one keybinding** (`Cmd+R Cmd+L`), **character-level precision** (not just lines), and works with **any AI assistant**.

**The precision advantage:** Most AI code-sharing tools work at _line-level_ precision. RangeLink goes deeper with _character-level_ ranges (`#L3C14-L15C9`), letting you highlight exactly the function signature, the problematic condition, or that one sneaky semicolon — not the whole block.

**Supported AI assistants:**

- **[Claude Code Extension](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code)** — Anthropic's official extension (works in VSCode and Cursor)
- **Cursor AI** — Built into Cursor IDE
- **[GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)** — GitHub's AI coding assistant

**How it works:**

1. Bind your AI assistant: Command Palette → "Bind to..."
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

**Example:** AI suggests checking `recipes/baking/chickenpie.ts#L3C14-L15C9` → Click → VSCode opens file at exact selection.

#### Editor Navigation

RangeLinks in editor files (markdown, text, code, untitled) are also clickable:

- **Hover** to see navigation details
- **Cmd+Click** to jump to code
- **Perfect for scratchpads** - Validate links before sending to claude-code

#### Go to Link

**Have a RangeLink but no clickable context?** Paste or type it directly:

- **Press `Cmd+R Cmd+G`** (Mac) or **`Ctrl+R Ctrl+G`** (Windows/Linux)
- **Supports all link formats:** full paths, ranges, columns (e.g., `recipes/baking/chickenpie.ts#L3C14-L15C9`)
- **Jump instantly** to that exact code location

**Perfect for:** Links from Slack, email, documentation, or AI responses you can't click directly.

---

### ⚡ RangeLink Menu

Press `Cmd+R Cmd+M` (Mac) / `Ctrl+R Ctrl+M` (Win/Linux) or click the **RangeLink** item in the status bar to access quick actions:

- **Jump to Bound Destination** — Focus your currently bound paste destination
- **Bind to a destination** — When unbound, the menu shows available destinations inline (AI assistants, terminals, text editors) so you can bind directly from the menu
- **Go to Link** — Paste or type a RangeLink to go directly to that code location
- **Bookmarks** — Quick access to saved bookmarks, plus add/manage actions
- **Show Version Info** — Display extension version and build details

---

### 🔖 Bookmarks

**Save code locations for quick access later.** Bookmark commonly-referenced code (config files, error definitions, key functions) and paste them to your AI assistant whenever needed — no navigating back to those files.

#### Save Selection as Bookmark

Turn any code selection into a reusable bookmark:

1. **Select code** in the editor
2. **Press `Cmd+R Cmd+B Cmd+S`** (Mac) or `Ctrl+R Ctrl+B Ctrl+S` (Windows/Linux)
3. **Enter a label** when prompted (e.g., "Auth middleware", "API error codes")
4. Bookmark saved!

Also available via Command Palette → "Save Selection as Bookmark" or right-click context menu.

#### List Bookmarks

**Press `Cmd+R Cmd+B Cmd+L`** (Mac) or `Ctrl+R Ctrl+B Ctrl+L` (Windows/Linux) to list your bookmarks:

- **Select a bookmark** to paste its link to your bound destination (or clipboard if unbound)
- **Manage bookmarks** via the gear icon action in the bookmark list

---

### 🔗 Flexible Link Formats

- **Single line:** `recipes/baking/chickenpie.ts#L42`
- **Line ranges:** `recipes/baking/chickenpie.ts#L10-L25`
- **Column precision:** `recipes/baking/chickenpie.ts#L3C14-L15C9`
- **Rectangular selections:** `recipes/baking/chickenpie.ts##L10C5-L20C10` (double hash)

### 📦 Portable Links (BYOD)

Share code references with teammates who use different delimiter configurations. Portable links embed metadata so they work everywhere — no coordination needed.

```text
path#L10C5-L20C10~#~L~-~C~
```

The `~` separator marks embedded delimiters that override recipient's local settings. No coordination needed — links just work.

**Learn more:** [Monorepo docs → BYOD Guide](https://github.com/couimet/rangelink/blob/main/docs/BYOD.md)

## Commands

### Command Palette

Access via `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux), then type "RangeLink".

| Command                                    | Shortcut (Mac)      | Shortcut (Win/Linux)   | Description                                              |
| ------------------------------------------ | ------------------- | ---------------------- | -------------------------------------------------------- |
| Copy Range Link                            | `Cmd+R Cmd+L`       | `Ctrl+R Ctrl+L`        | Create relative path link                                |
| Copy Range Link (Absolute)                 | `Cmd+R Cmd+Shift+L` | `Ctrl+R Ctrl+Shift+L`  | Create absolute path link                                |
| Copy Portable Link                         | `Cmd+R Cmd+P`       | `Ctrl+R Ctrl+P`        | Create BYOD portable link (relative path)                |
| Copy Portable Link (Absolute)              | `Cmd+R Cmd+Shift+P` | `Ctrl+R Ctrl+Shift+P`  | Create BYOD portable link (absolute path)                |
| Copy Range Link (Clipboard Only)           | `Cmd+R Cmd+C`       | `Ctrl+R Ctrl+C`        | Copy link to clipboard only (skip bound destination)     |
| Copy Range Link (Clipboard Only, Absolute) | `Cmd+R Cmd+Shift+C` | `Ctrl+R Ctrl+Shift+C`  | Copy absolute path link to clipboard only                |
| Paste Selected Text to Destination         | `Cmd+R Cmd+V`       | `Ctrl+R Ctrl+V`        | Send selected text directly to bound destination         |
| Paste Current File Path                    | `Cmd+R Cmd+F`       | `Ctrl+R Ctrl+F`        | Send active editor's path to bound destination           |
| Paste Current File Path (Absolute)         | `Cmd+R Cmd+Shift+F` | `Ctrl+R Ctrl+Shift+F`  | Send active editor's absolute path to bound destination  |
| Jump to Bound Destination                  | `Cmd+R Cmd+J`       | `Ctrl+R Ctrl+J`        | Focus your currently bound paste destination             |
| Save Selection as Bookmark                 | `Cmd+R Cmd+B Cmd+S` | `Ctrl+R Ctrl+B Ctrl+S` | Save current selection as a reusable bookmark            |
| List Bookmarks                             | `Cmd+R Cmd+B Cmd+L` | `Ctrl+R Ctrl+B Ctrl+L` | Show bookmarks, paste to destination, or manage          |
| Go to Link                                 | `Cmd+R Cmd+G`       | `Ctrl+R Ctrl+G`        | Paste/type a RangeLink to go to that code location       |
| Open Menu                                  | `Cmd+R Cmd+M`       | `Ctrl+R Ctrl+M`        | Open the RangeLink menu                                  |
| Bind to Claude Code                        | —                   | —                      | Auto-send links to Claude Code chat                      |
| Bind to Cursor AI                          | —                   | —                      | Auto-send links to Cursor AI chat                        |
| Bind to GitHub Copilot Chat                | —                   | —                      | Auto-send links to Copilot Chat                          |
| Bind to Terminal                           | —                   | —                      | Auto-send links to integrated terminal for AI workflows  |
| Bind to Text Editor                        | —                   | —                      | Auto-paste links at insertion point in bound text editor |
| Unbind                                     | —                   | —                      | Stop auto-sending links to bound destination             |
| Show Version Info                          | —                   | —                      | Display version and build info                           |

**Customizing Shortcuts:** Press `Cmd+K Cmd+S` (Mac) or `Ctrl+K Ctrl+S` (Win/Linux) to open Keyboard Shortcuts, then search for "RangeLink".

### Context Menus

RangeLink integrates directly into VSCode's right-click menus for fast, keyboard-free workflows. Items are positioned near related VSCode commands for discoverability.

#### Explorer (right-click on files)

Positioned after VSCode's "Copy Path" / "Copy Relative Path":

| Menu Item                           | Action                                  |
| ----------------------------------- | --------------------------------------- |
| RangeLink: Paste File Path          | Send absolute path to bound destination |
| RangeLink: Paste Relative File Path | Send relative path to bound destination |

#### Editor Tab (right-click on tabs)

| Menu Item                           | Visibility       | Action                                  |
| ----------------------------------- | ---------------- | --------------------------------------- |
| RangeLink: Paste File Path          | Always           | Send absolute path to bound destination |
| RangeLink: Paste Relative File Path | Always           | Send relative path to bound destination |
| RangeLink: Bind Here                | File or untitled | Bind this editor as paste destination   |
| RangeLink: Unbind                   | When bound       | Unbind current paste destination        |

#### Editor Content (right-click inside editor)

| Menu Item                                  | Visibility       | Action                                  |
| ------------------------------------------ | ---------------- | --------------------------------------- |
| RangeLink: Copy Range Link                 | Has selection    | Create relative path link               |
| RangeLink: Copy Range Link (Absolute)      | Has selection    | Create absolute path link               |
| RangeLink: Copy Portable Link              | Has selection    | Create BYOD portable link               |
| RangeLink: Copy Portable Link (Absolute)   | Has selection    | Create BYOD portable link (absolute)    |
| RangeLink: Paste Selected Text             | Has selection    | Send selected text to bound destination |
| RangeLink: Save Selection as Bookmark      | Has selection    | Save selection for quick access later   |
| ─── _separator_ ───                        |                  |                                         |
| RangeLink: Paste This File's Path          | Always           | Send absolute path to bound destination |
| RangeLink: Paste This File's Relative Path | Always           | Send relative path to bound destination |
| RangeLink: Bind Here                       | File or untitled | Bind this editor as paste destination   |
| RangeLink: Unbind                          | When bound       | Unbind current paste destination        |

#### Terminal (right-click on tab or inside terminal)

| Menu Item            | Visibility | Action                                  |
| -------------------- | ---------- | --------------------------------------- |
| RangeLink: Bind Here | Always     | Bind this terminal as paste destination |
| RangeLink: Unbind    | When bound | Unbind current paste destination        |

## Configuration

Customize settings in VSCode (Preferences > Settings > search "rangelink").

### Delimiter Settings

| Setting                       | Default | Description                         |
| ----------------------------- | ------- | ----------------------------------- |
| `rangelink.delimiterLine`     | `"L"`   | Line number prefix                  |
| `rangelink.delimiterPosition` | `"C"`   | Column/character position prefix    |
| `rangelink.delimiterHash`     | `"#"`   | Separator between path and location |
| `rangelink.delimiterRange`    | `"-"`   | Range separator (start-end)         |

**Validation Rules:**

- Delimiters cannot contain digits
- Delimiters cannot be empty
- All delimiters must be unique
- Reserved characters (`~`, `|`, `/`, `\`, `:`, `,`, `@`) cannot be used

Invalid configurations will fall back to defaults with a warning in the output channel (`Cmd+Shift+U` / `Ctrl+Shift+U`, select "RangeLink"). See [DEVELOPMENT.md](./DEVELOPMENT.md#development-workflow) for details.

### Warning Settings

| Setting                       | Default | Description                                                          |
| ----------------------------- | ------- | -------------------------------------------------------------------- |
| `rangelink.warnOnDirtyBuffer` | `true`  | Show warning when generating a link from a file with unsaved changes |

When enabled, a dialog appears with options: "Save & Generate", "Generate Anyway", or dismiss to abort. This helps avoid creating links that may point to incorrect positions after the file is saved.

### Terminal Picker Settings

| Setting                              | Default | Description                                                              |
| ------------------------------------ | ------- | ------------------------------------------------------------------------ |
| `rangelink.terminalPicker.maxInline` | `5`     | Maximum terminals shown inline in picker (extras in "More terminals...") |

When you have more terminals than this threshold, the destination picker shows a "More terminals..." option instead of listing all terminals individually.

## What's Next

RangeLink is under active development. See [open issues](https://github.com/couimet/rangeLink/issues) for planned features and enhancement requests.

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

## License

MIT - see [LICENSE](https://github.com/couimet/rangelink/blob/main/LICENSE) file for details.

---

Made with ❤️ for developers who love precision
