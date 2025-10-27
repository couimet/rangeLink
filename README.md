# RangeLink

Create sharable links to code ranges in your files. Perfect for documentation, AI prompts, and team collaboration.

By default, the link format uses GitHub-inspired notation (`#L10-L25` for lines or `#L10C5-L25C20` for lines with columns) for ranges, but generates local file paths suitable for your workspace, documentation, interactions with AI assistants, etc.

![Version](https://img.shields.io/badge/version-0.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Tests](https://img.shields.io/badge/tests-100%25%20coverage-green)

## Features

- **GitHub-Inspired Notation**: Uses GitHub-style range notation (`#L10-L25` for lines or `#L10C5-L25C20` for lines with columns) for line and column references
- **Quick Link Creation**: Create links to code ranges with a simple keyboard shortcut
- **Smart Formatting**: Automatically adapts based on selection (cursor, full lines, or partial selections with column precision)
- **Relative or Absolute Paths**: Choose between workspace-relative or absolute file paths
- **Status Bar Feedback**: Visual confirmation when a link is created
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Usage

### Create a Link

1. **Select text** in the editor (or just place your cursor on a line)
2. **Press `Ctrl+K Ctrl+L`** to create a relative link (or `Cmd+K Cmd+L` on Mac)
3. **Press `Ctrl+K Ctrl+Shift+L`** to create an absolute link (or `Cmd+K Cmd+Shift+L` on Mac)
4. The link is copied to your clipboard

### Link Formats

RangeLink generates local file paths with GitHub-inspired range notation:

- **Cursor or full line**: `path/to/file.ts:42` - References a single line
- **Single line with columns**: `path/to/file.ts#L42C6-L42C15` - When selecting partial content on one line
- **Multiple full lines**: `path/to/file.ts#L10-L25` - When selecting complete lines
- **Multi-line with column precision**: `path/to/file.ts#L10C5-L25C20` - When start/end columns are specified across multiple lines

### Commands

You can also access the commands from the Command Palette:

- `RangeLink: Create Link` - Create a link with relative path
- `RangeLink: Create Absolute Link` - Create a link with absolute path

### Customizing Keyboard Shortcuts

Want to use different keyboard shortcuts? You can customize them:

1. Press `Ctrl+K Ctrl+S` (or `Cmd+R Cmd+S` on Mac) to open Keyboard Shortcuts
2. Search for "RangeLink"
3. Double-click any command to assign your preferred shortcut
4. Press your desired key combination

## Use Cases

- **Documentation**: Include precise code links in your docs
- **AI Prompts**: Give AI assistants exact locations in your codebase
- **Code Reviews**: Point team members to specific code sections
- **Bug Reports**: Include precise file and line links
- **Pair Programming**: Quickly share code locations

## Installation

### From Marketplace

1. Open VS Code or Cursor
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "RangeLink"
4. Click Install

### From Source

See [DEVELOPMENT.md](DEVELOPMENT.md) for instructions on building from source.

## Requirements

- VS Code or Cursor version 1.80.0 or higher

## Extension Settings

RangeLink follows VSCode's standard approach:

- **Keyboard shortcuts**: Configure via VSCode's Keyboard Shortcuts UI (File > Preferences > Keyboard Shortcuts)
- **Future settings**: May include link format customization, path style preferences, etc.

## Known Issues

None at the moment. If you find a bug, please [report it](https://github.com/couimet/rangelink/issues).

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Built with ❤️ for developers who love precision
