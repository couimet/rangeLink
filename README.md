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
2. **Press `Ctrl+R Ctrl+L`** to create a relative link (or `Cmd+R Cmd+L` on Mac)
3. **Press `Ctrl+R Ctrl+Shift+L`** to create an absolute link (or `Cmd+R Cmd+Shift+L` on Mac)
4. The link is copied to your clipboard

Note: R then L — the letters stand for the extension's name: **R**ange **L**ink.

### Link Formats

RangeLink generates local file paths with GitHub-inspired range notation:

- **Cursor or full line**: `path/to/file.ts:42` - References a single line
- **Single line with columns**: `path/to/file.ts#L42C6-L42C15` - When selecting partial content on one line
- **Multiple full lines**: `path/to/file.ts#L10-L25` - When selecting complete lines
- **Multi-line with column precision**: `path/to/file.ts#L10C5-L25C20` - When start/end columns are specified across multiple lines
- **Column-mode selection**: `path/to/file.ts##L10C5-L20C10` - When selecting a vertical column across multiple lines (notice the double `##` hash)

#### Column-Mode Selections

When you use VSCode's column/box selection (Alt+drag or Shift+Alt+Arrow keys), RangeLink detects this and uses a double hash (`##`) to indicate column mode. This ensures the selection can be properly reconstructed when shared:

- **Normal multi-line**: `path#L10C5-L20C10` (creates a traditional multi-line selection)
- **Column-mode**: `path##L10C5-L20C10` (creates a column selection across lines 10-20, columns 5-10)

The double hash allows the extension to distinguish between these two selection types for proper reconstruction.

#### Portable RangeLinks (BYOD - Bring Your Own Delimiters)

For maximum portability across different delimiter configurations, RangeLink supports portable links that embed delimiter metadata. These links include the actual delimiter values used when creating the link, allowing recipients to parse them correctly regardless of their own delimiter settings.

**Format for line-only selections:**

```
path#L10-L20~#~L~-~
```

Where after the `~` separator, the metadata specifies:

- `#` = hash delimiter used
- `L` = line delimiter used
- `-` = range delimiter used

**Format for column selections:**

```
path#L10C5-L20C10~#~L~-~C~
```

Where the metadata includes:

- `#` = hash delimiter
- `L` = line delimiter
- `-` = range delimiter
- `C` = column delimiter

**Examples with custom delimiters:**

If the creator uses custom delimiters:

- `delimiterHash: "##"`
- `delimiterLine: "LINE"`
- `delimiterRange: "TO"`
- `delimiterColumn: "COL"`

The portable link would be:

```
path##LINE10COL5-COL10LINE20~##~LINE~TO~COL~
```

When parsing a portable rangelink, the extension uses the embedded delimiters instead of the recipient's current settings, ensuring the link works correctly regardless of their configuration.

**Note:** For column-mode selections, use double hash in the range part: `path##L10C5-L20C10~#~L~-~C~`

#### Reserved Characters

The following characters are **reserved** and cannot be used in delimiter configurations:

- `~` - Used for metadata separation in portable links (BYOD format)
- `|` - Reserved for future expansion
- `/` - Conflicts with file path separators (forward slash)
- `\` - Conflicts with file path separators and shell special characters (backslash)
- `:` - Used for single-line reference format (`path:42`)
- Whitespace (spaces, tabs, newlines) - Would break link parsing

When configuring custom delimiters, any attempt to use these reserved characters will be rejected, and the extension will log a warning and use default delimiters. This ensures that all RangeLinks can be reliably parsed regardless of delimiter configuration.

#### Link Format Summary

| Selection Type              | Format                               | Example                              |
| --------------------------- | ------------------------------------ | ------------------------------------ |
| Single line                 | `path:lineNum`                       | `src/file.ts:42`                     |
| Single line with columns    | `path#LlineCcol-LlineCcol`           | `src/file.ts#L42C6-L42C15`           |
| Multi-line (full lines)     | `path#Lstart-Lend`                   | `src/file.ts#L10-L25`                |
| Multi-line with columns     | `path#LstartCstartCol-LendCendCol`   | `src/file.ts#L10C5-L25C20`           |
| Column-mode (any format)    | `path##...` (double hash)            | `src/file.ts##L10C5-L20C10`          |
| Portable link (full lines)  | `path#Lstart-Lend~#~L~-~`            | `src/file.ts#L10-L20~#~L~-~`         |
| Portable link (columns)     | `path#LstartCcol-LendCcol~#~L~-~C~`  | `src/file.ts#L10C5-L20C10~#~L~-~C~`  |
| Portable link (column-mode) | `path##LstartCcol-LendCcol~#~L~-~C~` | `src/file.ts##L10C5-L20C10~#~L~-~C~` |

**Note:** The hash convention:

- `#` = regular selection (single hash) - creates a standard selection
- `##` = column-mode selection (double hash) - creates a column/box selection
- `###` or more = error, falls back to treating as single `#` and logs a warning in the extension console

#### Parsing Rules and Edge Cases

When parsing RangeLinks, the extension handles the following scenarios:

1. **Single hash detection**: `#` triggers regular mode parsing
2. **Double hash detection**: `##` triggers column-mode and regular parsing of the range part
3. **Triple+ hash detection**: `###` or more treated as error, logged, and parsed as single `#`
4. **Portable link detection**: Presence of `~` after the range indicates BYOD format
   - Expects 4 metadata fields for line-only ranges: `<hash>~<line>~<range>~`
   - Expects 5 metadata fields for column ranges: `<hash>~<line>~<range>~<column>~`
   - If metadata format is invalid, logs error and falls back to regular parsing
5. **Line-only vs column selection**: Parsed from the presence of column notation (e.g., `C5`)
6. **Single vs multi-line**: Determined by comparing start and end line numbers
7. **Error recovery**: Any parsing error logs a warning to the extension output channel but continues gracefully

**Comprehensive parsing tests cover:**

- All link formats (single line, multi-line, column, column-mode, portable)
- Custom delimiter configurations
- Invalid delimiter values
- Malformed links (triple hash, missing metadata, invalid numbers)
- Edge cases (line 1, column 1, very large line/column numbers)
- Unicode and special characters in paths

### Commands

You can also access the commands from the Command Palette:

- `RangeLink: Create Link` - Create a link with relative path
- `RangeLink: Create Absolute Link` - Create a link with absolute path

#### Future: Navigate to RangeLink (Coming Soon)

A planned feature will allow you to navigate to a RangeLink directly:

- `RangeLink: Go to Range from Clipboard` - Opens the file and selects the range from a RangeLink in your clipboard
- `RangeLink: Go to Range from Input` - Prompts for a RangeLink and navigates to it
- **Link detection**: When you paste or select a RangeLink in the terminal/chat, VSCode will offer a "Go to Range" action (similar to how file paths work)

This will enable seamless sharing of code locations with your team via Slack, Teams, or any messaging platform.

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

### Delimiter Configuration

RangeLink allows you to customize the delimiters used in range links via VSCode settings:

```json
{
  "rangelink.delimiterLine": "L", // Prefix for line numbers (default: "L")
  "rangelink.delimiterColumn": "C", // Prefix for column numbers (default: "C")
  "rangelink.delimiterHash": "#", // Prefix before range (default: "#")
  "rangelink.delimiterRange": "-" // Separator between start and end (default: "-")
}
```

**Rules:**

- Delimiters cannot contain numbers (e.g., `"L1"`, `"A2"` are invalid)
- Delimiters cannot be empty
- All delimiters must be unique
- Reserved characters (`~`, `|`, `/`, `\`) cannot be used
- Any violation will log an error and use default delimiters

### Keyboard Shortcuts

RangeLink follows VSCode's standard approach:

- **Customize shortcuts**: Configure via VSCode's Keyboard Shortcuts UI (File > Preferences > Keyboard Shortcuts)
- **Search for**: "RangeLink" to find all available commands

## Known Issues

None at the moment. If you find a bug, please [report it](https://github.com/couimet/rangelink/issues).

## Roadmap and Future Features

### Phase 1: Core Enhancements (In Progress)

- [x] Column-mode selection detection
- [x] Portable RangeLinks (BYOD) format specification
- [ ] Refactor column-mode formatting to use `##` instead of `CL` prefix
- [ ] Add delimiter validation for reserved characters (`~`, `|`, `/`, `\`, `:`, whitespace)
- [ ] Implement portable link generation
- [ ] Comprehensive parsing tests (100% branch coverage)
- [ ] Parse all link formats with error handling

### Phase 2: Core Architecture and Monorepo

We will modularize the project and adopt a monorepo to enable fast, iterative development with world-class code quality.

Objectives:

- Extract core logic into `rangelink-core-ts` (pure TypeScript, npm package):
  - Build/parse links (regular, column-mode, portable/BYOD)
  - Validate configuration (including reserved characters)
  - Provide utilities for selections and ranges (line/column math)
  - 100% branch coverage at the package level
- Keep IDE extensions as thin wrappers:
  - **VSCode extension**: Read editor/terminal selections via VSCode API, invoke core APIs, handle UI
  - **Neovim plugin**: Extract selections via Neovim Lua API, call core via FFI or HTTP bridge, expose as Vim commands
  - Each extension handles platform-specific UI/selection extraction only
- Prepare for future consumers by keeping the core free of IDE dependencies

Proposed monorepo structure:

```
rangeLink/
  packages/
    rangelink-core-ts/            # TypeScript core library (npm package)
      src/
      tests/
      package.json
      README.md
      CHANGELOG.md
    rangelink-vscode-extension/   # VSCode extension (publishes to Marketplace)
      src/
      tests/
      package.json
      README.md
      CHANGELOG.md
    rangelink-neovim-plugin/      # Neovim plugin (Lua-based)
      lua/rangelink/               # Neovim Lua plugin structure
        init.lua                   # Plugin entry point
        commands.lua                # Vim commands (:RangeLinkCopy, :RangeLinkGo)
        selection.lua               # Selection extraction (Neovim API)
        parser.lua                   # Uses rangelink-core-ts via FFI or HTTP
      plugin/                      # Vim plugin files
        rangelink.vim              # Plugin initialization
      tests/                       # Lua unit tests (busted, plenary.nvim)
      README.md
      CHANGELOG.md
  package.json                    # workspaces config
  pnpm-workspace.yaml             # or npm/yarn workspaces
  tsconfig.base.json              # shared tsconfig
  .github/workflows/              # per-package CI, shared jobs
```

Implementation examples:

**VSCode Extension (`rangelink-vscode-extension`):**

- Thin `extension.ts` that extracts selections from VSCode editor API
- Calls `rangelink-core-ts` to build/parse links
- Handles VSCode-specific UI (status bar, commands, context menus)
- Publishes to VSCode Marketplace

**Neovim Plugin (`rangelink-neovim-plugin`):**

- Lua plugin following Neovim plugin structure (`lua/rangelink/`)
- Extracts selections via Neovim Lua API (`vim.api.nvim_buf_get_mark`, etc.)
- Calls `rangelink-core-ts` via:
  - **Option A**: LuaJIT FFI binding (direct C library call if we build a C wrapper)
  - **Option B**: HTTP bridge (rangelink-core-ts runs as a local server)
  - **Option C**: Subprocess call (spawns Node.js process with core library)
- Exposes Vim commands: `:RangeLinkCopy`, `:RangeLinkCopyPortable`, `:RangeLinkGo`
- Uses Neovim's selection API for column-mode (visual block mode)
- Publishes to LuaRocks or Neovim plugin managers (packer.nvim, lazy.nvim)
- See `docs/neovim-integration.md` for detailed integration options and a recommended starting point

Best practices (pragmatic):

- Keep extension/plugin code as thin glue; no business logic
- Public, documented APIs in `rangelink-core-ts` with stable types
- Unit tests in each package; integration tests in extensions
- Separate READMEs and CHANGELOGs per package
- Independent versioning and publishing (core vs each extension)
- Linting and formatting shared via root configs
- CI runs tests and linting for changed packages; release per package

Rationale:

- Enables rapid iteration and solid testability
- Encourages encapsulation and clean interfaces
- Future-proofs for other editors/tools consuming the core

### Phase 3: Navigation Features

- [ ] **Consume RangeLinks from clipboard** (`RangeLink: Go to Range from Clipboard`)
  - Parse clipboard content for valid RangeLink
  - Validate file path exists in workspace
  - Open file and navigate to range
  - Support column-mode reconstruction

- [ ] **Consume RangeLinks from input** (`RangeLink: Go to Range from Input`)
  - Quick pick input dialog
  - Validate link format before attempting navigation
  - Error feedback for invalid links

- [ ] **Right-click context menu actions**
  - "Go to Range from Selection" - if text looks like a RangeLink
  - Integrate with terminal link providers

- [ ] **Terminal link integration** (similar to file path detection)
  - Detect RangeLinks in terminal output
  - Show hover with "Open in Editor (Cmd+Click)"
  - Click to navigate

- [ ] **Parser for all link types**
  - Single line: `path:42`
  - Multi-line: `path#L10-L20`
  - With columns: `path#L10C5-L20C10`
  - Column-mode: `path##L10C5-L20C10`
  - Portable links: parse BYOD metadata
  - Graceful error handling and recovery

- [ ] **BYOD (Bring Your Own Delimiters) link consumption**
  - Detect portable links (contain `~`)
  - Extract delimiter metadata
  - Parse using embedded delimiters instead of user settings
  - Support custom delimiters in creator's configuration

- [ ] **Column-mode range reconstruction**
  - Detect `##` in link
  - Parse range coordinates
  - Create multiple cursors/selections
  - Apply column selection across specified lines

### Phase 4: Advanced Generation

- [ ] **Multi-range selection support**
  - Support multiple non-contiguous ranges in a single link
  - Format: `path#L10-L20,L30-L40,L50C5-L60C10` (comma-separated ranges)
  - All `rangelink-core-*` implementations must support this
  - VSCode extension exposes multi-range UI
  - Other IDEs expose based on platform capabilities

- [ ] **Generate column-mode links from selection**
  - Detect when user has column selection
  - Auto-format as `##...` instead of `#...`

- [ ] **Generate BYOD links** (`RangeLink: Create Portable Link`)
  - Generate link with delimiter metadata
  - Support all selection types (line, column, column-mode)
  - Add `~` separator and metadata fields

- [ ] **Contextual menu integration**
  - Add "Copy RangeLink" to editor context menu
  - Add "Copy Portable RangeLink" option
  - Show quick actions based on current selection
  - Enable/disable via settings

- [ ] **Quick pick for link generation**
  - Show all available link formats
  - Preview link before copying
  - Support multiple format selection

### Phase 5: Workspace & Collaboration

- [ ] **Multi-workspace support**
  - Detect which workspace file belongs to
  - Generate workspace-relative paths
  - Resolve paths across workspace boundaries

- [ ] **Path validation**
  - Check if target file exists before generating link
  - Suggest workspace-relative vs absolute paths
  - Handle files outside workspace gracefully

- [ ] **Git integration**
  - Support git links in addition to workspace links
  - Resolve paths relative to git root
  - Option to include commit hash in link

- [ ] **Markdown link format**
  - "Copy as Markdown Link" option
  - Format as `[description](path#L10-L20)`
  - Customizable description templates

### Phase 6: Productivity Features

- [ ] **Link history**
  - Store recently generated links
  - Quick access via command palette
  - Search in history
  - Export history as markdown/csv

- [ ] **Undo/redo support**
  - Track navigation history
  - Navigate back to previous location after following RangeLink

- [ ] **Batch operations**
  - Generate links for multiple selections
  - Generate links for a function/method definition and all its usages
  - Multi-file link generation

- [ ] **Documentation generation**
  - Generate links for all public API methods
  - Create index of code references
  - Export as markdown documentation

### Phase 7: User Experience

- [ ] **Settings and preferences**
  - Opt-in/opt-out for portable link generation
  - Toggle column-mode auto-detection
  - Preferred link format (relative vs absolute)
  - Keyboard shortcut customization for all commands
  - Exclude certain file patterns from link generation

- [ ] **Visual feedback**
  - Show generated link in notification instead of just status bar
  - Preview selection before generating link
  - Highlight target range when navigating to link
  - Animated transition to target location

- [ ] **Accessibility**
  - Screen reader support for link generation
  - Keyboard navigation for all features
  - High contrast mode support

### Phase 8: Integration & Extensions

- [ ] **VSCode API integration**
  - Register RangeLink as link provider for editors
  - Integration with built-in link providers
  - Respect VSCode's link detection settings

- [ ] **Terminal integration**
  - Detect and parse RangeLinks in terminal output
  - Support for external terminal integration
  - Context menu in terminal for detected links

- [ ] **Extension compatibility**
  - Work well with GitLens, GitHub Copilot, etc.
  - Respect other extensions' link handlers
  - Avoid conflicts with file path link providers

- [ ] **Workspace trust**
  - Handle untrusted workspaces
  - Security warnings for absolute paths
  - Sandboxed parsing

### Phase 9: Developer Experience

- [ ] **Comprehensive test coverage**
  - 100% branch coverage for parsing
  - Edge case testing (Unicode, special characters, very large numbers)
  - Performance testing for large files
  - Integration testing

- [ ] **Documentation**
  - API documentation for parser
  - Contributing guidelines
  - Video tutorials
  - Best practices guide

- [ ] **Telemetry**
  - Anonymous usage statistics (opt-in)
  - Most used features tracking
  - Error reporting

- [ ] **Performance**
  - Lazy loading of link history
  - Efficient path resolution
  - Optimized regex patterns
  - Caching of workspace structure

### Nice-to-Have Features

- [ ] **Circular/radius-based selection**
  - Define selection based on starting point and character radius
  - Format: `path#L10C5@radius:15` (line 10, column 5, radius of 15 chars)
  - Useful for contextual selections around a point
  - All `rangelink-core-*` implementations must support

- [ ] **Code review integration**
  - Generate links for PR review comments
  - Share links in review discussions
  - Track link usage in reviews

- [ ] **Team collaboration**
  - Share link preferences with team
  - Team-specific delimiter configurations
  - Link usage analytics

- [ ] **IDE integrations**
  - JetBrains IDEs support
  - Neovim plugin
  - Emacs support

- [ ] **AI assistant integration**
  - Generate RangeLinks from AI responses
  - Parse AI-provided code references
  - Context-aware link generation

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Built with ❤️ for developers who love precision
