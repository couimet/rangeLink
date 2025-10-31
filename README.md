# RangeLink

Create sharable links to code ranges in your files. Perfect for documentation, AI prompts, and team collaboration.

By default, the link format uses GitHub-inspired notation (`#L10-L25` for lines or `#L10C5-L25C20` for lines with columns) for ranges, but generates local file paths suitable for your workspace, documentation, interactions with AI assistants, etc.

![Version](https://img.shields.io/badge/version-0.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Tests](https://img.shields.io/badge/tests-100%25%20coverage-green)

## Quick Start

### Installation

1. Open VS Code or Cursor
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "RangeLink"
4. Click Install

### Create a Link

1. **Select text** in the editor (non-empty selection required)
2. **Press `Cmd+R Cmd+L`** (Mac) or `Ctrl+R Ctrl+L` (Windows/Linux)
3. Link copied to clipboard!

**Note:** `R` then `L` - the letters stand for **R**ange **L**ink.

### Example Output

```
src/utils/parser.ts#L42C10-L58C25
```

## Features

- **GitHub-Style Notation** - Uses familiar `#L10-L25` format developers already know
- **Universal Sharing** - Links work across editors and tools (VSCode, Cursor, Sublime Text, etc.)
- **Rectangular Selection** - Share column selections with double hash notation (`##`)
- **Portable Links (BYOD)** - Links work regardless of recipient's delimiter configuration
- **Customizable Delimiters** - Configure notation to match your preferences
- **Status Bar Feedback** - Visual confirmation when links are created
- **Cross-Platform** - Works on Windows, macOS, and Linux

## Link Formats

### Basic Formats

| Selection Type | Format | Example |
|----------------|--------|---------|
| Single line | `path#L<line>` | `src/file.ts#L42` |
| Multiple lines | `path#L<start>-L<end>` | `src/file.ts#L10-L25` |
| With column precision | `path#L<line>C<col>-L<line>C<col>` | `src/file.ts#L42C6-L42C15` |
| Rectangular selection | `path##L<start>C<col>-L<end>C<col>` | `src/file.ts##L10C5-L20C10` |

### Rectangular Mode

When you use VSCode's column selection (Alt+drag or Shift+Alt+Arrow keys), RangeLink detects this and uses **double hash** (`##`) notation:

- **Normal multi-line**: `path#L10C5-L20C10` (traditional selection)
- **Rectangular mode**: `path##L10C5-L20C10` (column selection)

The double hash distinguishes these selection types for proper reconstruction.

**Learn more:** [docs/LINK-FORMATS.md](./docs/LINK-FORMATS.md)

### Portable Links (BYOD)

**Share code references that work regardless of delimiter configuration.**

Portable RangeLinks embed delimiter metadata so recipients parse correctly even with different settings:

```
src/file.ts#L10C5-L20C10~#~L~-~C~
```

The `~` separator marks embedded delimiters (`#`, `L`, `-`, `C`) that override recipient's local config.

**Benefits:**
- ✅ No coordination needed between sender and recipient
- ✅ Works across different editors and tools
- ✅ Future-proof - survives configuration changes
- ✅ Zero setup for recipients

**Learn more:** [docs/BYOD.md](./docs/BYOD.md)

## Commands

All commands are available via keyboard shortcuts, Command Palette, and right-click context menu:

| Command | Shortcut (Mac) | Shortcut (Win/Linux) | Description |
|---------|----------------|----------------------|-------------|
| Copy Range Link | `Cmd+R Cmd+L` | `Ctrl+R Ctrl+L` | Relative path link |
| Copy Range Link (Absolute) | `Cmd+R Cmd+Shift+L` | `Ctrl+R Ctrl+Shift+L` | Absolute path link |
| Copy Portable Link | `Cmd+R Cmd+P` | `Ctrl+R Ctrl+P` | Portable BYOD link |
| Copy Portable Link (Absolute) | `Cmd+R Cmd+Shift+P` | `Ctrl+R Ctrl+Shift+P` | Absolute BYOD link |

**Customizing shortcuts:** Press `Cmd+K Cmd+S` (Mac) or `Ctrl+K Ctrl+S` (Win/Linux) → search "RangeLink"

## Use Cases

### AI Assistants

Share precise code locations with Claude Code, GitHub Copilot, or any AI tool:

```
"Check out the bug in auth/login.ts#L42C10-L58C25"
```

### Cross-Editor Teams

Your team uses VSCode, Cursor, and Sublime? RangeLink works everywhere:

```
src/utils/parser.ts#L120-L145
→ Works in any editor, any tool
```

### Documentation

Add precise code references to docs, READMEs, and technical writing:

```markdown
See the implementation in [parser.ts#L89-L102](src/parser.ts#L89-L102)
```

### Code Reviews

Point teammates to specific code sections in Slack, Teams, or PR comments:

```
"The issue is here: api/routes.ts#L215C8-L223C45"
```

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

### Validation Rules

All delimiters must satisfy:
- ✅ Not empty (min 1 character)
- ✅ No digits (0-9)
- ✅ No whitespace
- ✅ No reserved characters (`~`, `|`, `/`, `\`, `:`, `,`, `@`)
- ✅ Unique (case-insensitive)
- ✅ No substring conflicts
- ✅ Hash must be exactly 1 character

Invalid configurations fall back to defaults with a warning in the output channel.

**Learn more:** [docs/ERROR-HANDLING.md](./docs/ERROR-HANDLING.md#configuration-errors-1xxx)

## Monorepo Structure

RangeLink is organized as a pnpm workspace monorepo with two primary packages:

```
rangeLink/
  packages/
    rangelink-core-ts/            # Pure TypeScript core library
      - Zero dependencies
      - Platform-agnostic
      - 100% test coverage target
      - Used by all TypeScript-based extensions

    rangelink-vscode-extension/   # VSCode extension
      - Thin wrapper around core library
      - VSCode-specific commands and UI
      - Adapter layer for VSCode types

  docs/                           # Comprehensive documentation
    - ARCHITECTURE.md             # Design principles and patterns
    - BYOD.md                     # Portable links specification
    - ERROR-HANDLING.md           # Error codes and validation
    - LINK-FORMATS.md             # Link notation reference
    - LOGGING.md                  # Structured logging approach
    - ROADMAP.md                  # Development roadmap
    - architecture-multi-language.md  # Multi-language vision

  .commits/                       # Commit message templates
```

### Core Library Philosophy

The core library (`rangelink-core-ts`) follows these principles:

1. **Zero Dependencies** - No runtime dependencies (only TypeScript as devDependency)
2. **Platform-Agnostic** - No VSCode coupling; defines own `Selection` interface
3. **Comprehensive Testing** - 100% branch coverage target
4. **Structured Logging** - All messages use stable error codes for i18n readiness

**Learn more:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## Development

**Quick start:**
```bash
pnpm install    # Install dependencies
pnpm -r compile # Build all packages
pnpm -r test    # Run tests
```

**For complete development guide:** See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed instructions on:
- Monorepo structure and commands
- Debugging the extension
- Core library development
- Testing strategy
- Package creation
- Development workflow

## Roadmap

RangeLink follows a **micro-iteration** development approach (1-2 hours per iteration) to prevent scope creep and maintain momentum.

### Development Principles

1. **Micro-Iterations (1-2 hours max)** - Small, focused sessions with clear "done when" criteria
2. **One Focus Per Iteration** - Feature work and refactoring are separate
3. **Commit Early, Commit Often** - Commit after each micro-iteration
4. **Explicit Scope Definition** - Document what IS and IS NOT in scope upfront
5. **Test-Driven Quality** - Aim for 100% branch coverage

### Current Status

- ✅ **Phase 1: Core Enhancements** - Mostly complete (rectangular mode, validation, BYOD generation)
- 🔨 **Phase 2: Core Architecture** - In progress (monorepo, testing, documentation)
- 📋 **Phase 3: Link Navigation** - Planned (click/paste to navigate)
- 📋 **Phase 4: Publishing** - Planned (VSCode Marketplace launch)

### Upcoming Features

**Phase 3 - Link Navigation (Planned):**
- Click or paste RangeLinks to navigate directly to code
- Hover tooltips showing file path and range
- Integration with VSCode link detection

**Phase 5 - Enhanced BYOD Support (Planned):**
- Always-portable option (configuration)
- Improved error messages and recovery
- Performance optimizations

**Phase 6 - Multi-Range Links (Planned):**
- Reference multiple code sections in one link
- Syntax: `path#L10-L20|L30-L40|L50-L60`
- Non-contiguous code selections

**Full roadmap:** [docs/ROADMAP.md](./docs/ROADMAP.md)

## Multi-Language Vision

RangeLink is designed for **multi-language expansion** with feature parity across implementations:

### Specification-Driven Development

Future implementations (Java, Rust, C/C++, Go) will:
1. Share a common **JSON specification** defining behavior
2. Pass the same **contract tests** (language-agnostic test cases)
3. Enforce **feature parity** via CI

**Architecture example:**
```
spec/
  schema/              # JSON Schema for data structures
  contracts/           # Behavioral contracts (JSON test cases)

packages/
  rangelink-core-ts/   # TypeScript (current)
  rangelink-core-java/ # Java (future)
  rangelink-core-rust/ # Rust (future)
  rangelink-core-c/    # C/C++ (future)
```

All implementations run the same contract tests. CI fails if any implementation diverges.

**Learn more:** [docs/architecture-multi-language.md](./docs/architecture-multi-language.md)

## Error Handling

RangeLink uses **structured logging** with stable error codes for i18n readiness:

```
[LEVEL] [CODE] message
```

**Example logs:**
```
[INFO] [MSG_1001] Configuration loaded: line="L", column="C", hash="#", range="-"
[ERROR] [ERR_1005] Invalid delimiterLine value "L~" (reserved character '~')
[WARN] [WARN_2001] Position delimiter not in BYOD metadata. Used local setting 'C'
```

### Error Code Categories

| Range | Category | Description |
|-------|----------|-------------|
| `MSG_1xxx` | Configuration Info | Configuration status messages |
| `ERR_1xxx` | Configuration Errors | Delimiter validation failures |
| `ERR_2xxx` | BYOD Errors | Portable link parsing failures |
| `WARN_2xxx` | BYOD Warnings | BYOD recovery and fallback warnings |

**Accessing logs:**
1. Open Output panel: View > Output (`Ctrl+Shift+U` / `Cmd+Shift+U`)
2. Select "RangeLink" from dropdown

**Learn more:** [docs/ERROR-HANDLING.md](./docs/ERROR-HANDLING.md), [docs/LOGGING.md](./docs/LOGGING.md)

## Requirements

- VSCode or Cursor version 1.80.0 or higher
- pnpm 8.0+ (for development)
- Node.js 18+ (for development)

## Contributing

Contributions are welcome!

**Getting started:**
1. See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
2. See [DEVELOPMENT.md](./DEVELOPMENT.md) for setup and development workflow

## Documentation

### For Users

- **[Extension README](./packages/rangelink-vscode-extension/README.md)** - Marketplace-ready documentation
- **[Link Formats](./docs/LINK-FORMATS.md)** - Complete notation reference
- **[BYOD Guide](./docs/BYOD.md)** - Portable links specification
- **[Error Codes](./docs/ERROR-HANDLING.md)** - Troubleshooting reference

### For Developers

- **[Architecture](./docs/ARCHITECTURE.md)** - Design principles and patterns
- **[Roadmap](./docs/ROADMAP.md)** - Development plan and iterations
- **[Logging](./docs/LOGGING.md)** - Structured logging approach
- **[Multi-Language Vision](./docs/architecture-multi-language.md)** - Future expansion plans

## Known Issues

None at the moment. If you find a bug, please [report it](https://github.com/couimet/rangelink/issues).

## License

MIT - see [LICENSE](./LICENSE) file for details.

## Links

- 📦 [VSCode Extension](./packages/rangelink-vscode-extension)
- 💎 [Core Library](./packages/rangelink-core-ts)
- 🐛 [Report Issues](https://github.com/couimet/rangelink/issues)
- 📚 [Full Documentation](./docs/)
- 🤝 [Contributing Guide](./CONTRIBUTING.md)

---

Made with ❤️ for developers who love precision
