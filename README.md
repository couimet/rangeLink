# CodeAnchor

Create anchors (sharable links) to code ranges in your files. Perfect for documentation, AI prompts, and team collaboration.

![Version](https://img.shields.io/badge/version-0.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Tests](https://img.shields.io/badge/tests-100%25%20coverage-green)

## Features

- **Quick Anchor Creation**: Create anchors to code ranges with a simple keyboard shortcut
- **Smart Formatting**: Automatically adapts format based on your selection (line, column, or range)
- **Relative or Absolute Paths**: Choose between workspace-relative or absolute file paths
- **Status Bar Feedback**: Visual confirmation when an anchor is created
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Usage

### Create an Anchor

1. **Select text** in the editor (or just place your cursor on a line)
2. **Press `Ctrl+K Ctrl+A`** to create a relative anchor (or `Cmd+K Cmd+A` on Mac)
3. **Press `Ctrl+K Ctrl+Shift+A`** to create an absolute anchor (or `Cmd+K Cmd+Shift+A` on Mac)
4. The anchor is copied to your clipboard

### Anchor Formats

CodeAnchor generates anchors in the following formats:

- **Line number**: `path/to/file.ts:42`
- **Single line with columns**: `path/to/file.ts#L42C1-L42C10`
- **Multiple lines**: `path/to/file.ts#L10-L25`
- **Multi-line with columns**: `path/to/file.ts#L10C5-L25C20`

### Commands

You can also access the commands from the Command Palette:

- `CodeAnchor: Create Anchor` - Create an anchor with relative path
- `CodeAnchor: Create Absolute Anchor` - Create an anchor with absolute path

### Customizing Keyboard Shortcuts

Want to use different keyboard shortcuts? You can customize them:

1. Press `Ctrl+K Ctrl+S` (or `Cmd+K Cmd+S` on Mac) to open Keyboard Shortcuts
2. Search for "CodeAnchor"
3. Double-click any command to assign your preferred shortcut
4. Press your desired key combination

## Examples

### Example 1: Single Line Anchor

Select line 42 in `src/utils.ts`:

```
Output: src/utils.ts:42
```

### Example 2: Specific Columns

Select characters 5-15 on line 42:

```
Output: src/utils.ts#L42C5-L42C15
```

### Example 3: Multi-Line Range

Select lines 10-25:

```
Output: src/utils.ts#L10-L25
```

## Use Cases

- **Documentation**: Include precise code anchors in your docs
- **AI Prompts**: Give AI assistants exact locations in your codebase
- **Code Reviews**: Point team members to specific code sections
- **Bug Reports**: Include precise file and line anchors
- **Pair Programming**: Quickly share code locations

## Installation

### From Marketplace

1. Open VS Code or Cursor
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "CodeAnchor"
4. Click Install

### From Source

```bash
git clone https://github.com/couimet/codeanchor.git
cd codeanchor
npm install
npm run compile
code --install-extension *.vsix
```

## Development

### Building

```bash
npm install
npm run compile
```

### Testing

```bash
npm test              # Run tests with coverage
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate detailed coverage report
```

Tests aim for **100% branch coverage** to ensure reliability.

## Requirements

- VS Code or Cursor version 1.80.0 or higher

## Extension Settings

CodeAnchor provides the following settings:

### Keyboard Shortcuts

You can customize keyboard shortcuts for CodeAnchor commands:

1. **Open Keyboard Shortcuts**: Press `Ctrl+K Ctrl+S` (or `Cmd+K Cmd+S` on Mac)
2. **Search for "CodeAnchor"** to find all available commands
3. **Customize** any keyboard shortcut by double-clicking it and entering your preferred key combination

#### Available Commands

- **CodeAnchor: Create Anchor** - Default: `Ctrl+K Ctrl+A` (or `Cmd+K Cmd+A` on Mac)
- **CodeAnchor: Create Absolute Anchor** - Default: `Ctrl+K Ctrl+Shift+A` (or `Cmd+K Cmd+Shift+A` on Mac)

#### Keyboard Shortcuts

Keyboard shortcuts are managed through VSCode's built-in Keyboard Shortcuts UI. No additional extension settings required!

### Extension Settings

CodeAnchor follows VSCode's standard approach:

- **Keyboard shortcuts**: Configure via VSCode's Keyboard Shortcuts UI (File > Preferences > Keyboard Shortcuts)
- **Future settings**: May include anchor format customization, path style preferences, etc.

## Known Issues

None at the moment. If you find a bug, please [report it](https://github.com/couimet/codeanchor/issues).

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Built with ❤️ for developers who love precision
