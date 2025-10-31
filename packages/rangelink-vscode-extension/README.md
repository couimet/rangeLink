# RangeLink - Share Code Across Editors & Tools

[![Version](https://img.shields.io/visual-studio-marketplace/v/rangelink.rangelink)](https://marketplace.visualstudio.com/items?itemName=rangelink.rangelink)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/couimet/rangelink/blob/main/LICENSE)

> Create shareable links to code ranges. Perfect for AI assistants, cross-editor teams, documentation, and code reviews.

## Why RangeLink?

Share precise code locations with anyone—regardless of their editor or configuration.

- **Works everywhere:** VSCode, Cursor, Sublime Text, Claude Code, and more
- **GitHub-style notation:** Familiar `#L10-L25` format everyone recognizes
- **Portable links:** Your links work even if recipients use different settings

## Features

🔗 **Universal Sharing** - Links work across editors and tools

🎯 **GitHub-Style Notation** - `#L10C5-L25C20` format developers know

📦 **BYOD (Bring Your Own Delimiters)** - Portable links adapt to any configuration

🎨 **Rectangular Selection** - Share column selections too

⚙️ **Customizable** - Configure delimiters to match your workflow

## Use Cases

### AI Assistants
Share code with Claude Code, GitHub Copilot, or any AI tool using precise links.

```
"Check out the bug in auth/login.ts#L42C10-L58C25"
```

### Cross-Editor Teams
Your team uses VSCode, Cursor, and Sublime? No problem. RangeLink works everywhere.

```
src/utils/parser.ts#L120-L145
→ Works in any editor, any tool
```

### Documentation
Add precise code references to docs, READMEs, and technical writing.

```markdown
See the implementation in [parser.ts#L89-L102](src/parser.ts#L89-L102)
```

### Code Reviews
Point teammates to specific code sections in Slack, Teams, or PR comments.

```
"The issue is here: api/routes.ts#L215C8-L223C45"
```

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

## Commands

All commands are available via keyboard shortcuts, Command Palette, and right-click context menu:

| Command | Shortcut (Mac) | Shortcut (Win/Linux) | Description |
|---------|----------------|----------------------|-------------|
| Copy Range Link | `Cmd+R Cmd+L` | `Ctrl+R Ctrl+L` | Create relative path link |
| Copy Range Link (Absolute) | `Cmd+R Cmd+Shift+L` | `Ctrl+R Ctrl+Shift+L` | Create absolute path link |
| Copy Portable Link | `Cmd+R Cmd+P` | `Ctrl+R Ctrl+P` | Create BYOD portable link |
| Copy Portable Link (Absolute) | `Cmd+R Cmd+Shift+P` | `Ctrl+R Ctrl+Shift+P` | Create absolute BYOD link |

**Customizing Shortcuts:** Press `Cmd+K Cmd+S` (Mac) or `Ctrl+K Ctrl+S` (Win/Linux) to open Keyboard Shortcuts, then search for "RangeLink".

## Link Formats

RangeLink generates local file paths with GitHub-inspired range notation:

| Selection Type | Format | Example |
|----------------|--------|---------|
| Single line | `path#L<line>` | `src/file.ts#L42` |
| Multiple lines | `path#L<start>-L<end>` | `src/file.ts#L10-L25` |
| With column precision | `path#L<line>C<col>-L<line>C<col>` | `src/file.ts#L42C6-L42C15` |
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

The `~` separator marks embedded delimiters that override recipient's local settings. No coordination needed—links just work.

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

Invalid configurations will fall back to defaults with a warning in the output channel.

[Full configuration guide →](https://github.com/couimet/rangelink#configuration)

## What's Next

RangeLink is under active development. Coming soon:

- **Link Navigation** - Click RangeLinks to jump directly to code
- **Multi-Range Support** - Reference multiple code sections in one link
- **Enhanced BYOD** - More delimiter options and validation improvements

[View Full Roadmap →](https://github.com/couimet/rangelink/blob/main/docs/ROADMAP.md)

## Requirements

- VSCode or Cursor version 1.80.0 or higher

## Known Issues

None at the moment. If you find a bug, please [report it](https://github.com/couimet/rangelink/issues).

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

## License

MIT - see [LICENSE](https://github.com/couimet/rangelink/blob/main/LICENSE) file for details.

---

Made with ❤️ for developers who love precision
