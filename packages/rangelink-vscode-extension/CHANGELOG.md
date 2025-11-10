# Changelog

All notable changes to the RangeLink VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0]

### Added

- **Paste Destinations System** - Universal paste destination framework for auto-sending links
  - Unified architecture supports terminal, text editor, and chat integrations
  - One destination active at a time (terminal OR text editor OR Cursor AI)
  - Seamless workflow: select code → link appears where you need it
- **Text Editor Destination** - Paste generated links directly into scratchpad files
  - Perfect for drafting AI prompts in untitled/scratch documents before sending to claude-code
  - Bind any text editor as paste destination (Command Palette → "Bind RangeLink to Text Editor Destination")
  - Auto-paste links at cursor position with smart padding
  - Blocks binary files (images, PDFs, archives) - only text-like files
  - Auto-unbinds when editor closes with notification
- **Cursor AI Integration** - Streamlined clipboard workflow for Cursor IDE
  - Automatically copies link and opens Cursor chat panel
  - User pastes with Cmd/Ctrl+V (workaround for API limitation)
  - Cuts workflow from 5 manual steps to 1
- **Editor Link Navigation** - Click RangeLinks in any editor file to navigate
  - Primary use case: Validate links in scratchpad files before sending to claude-code
  - Works in all file types: markdown, text, code, untitled files
  - Hover tooltips show full navigation details
  - Supports all link formats: single-line, ranges, columns, rectangular mode
  - Reuses terminal navigation logic for consistency

### Changed

- **Unified Paste Destination Management** - Single manager replaces separate terminal/chat systems
  - Command renamed: `rangelink.unbindTerminal` → `rangelink.unbindDestination`
  - Simplified bind/unbind commands work consistently across all destination types
  - Improved error handling and user feedback
- **Terminology Updates** - Harmonized vocabulary across extension
  - "Terminal Binding" → "Terminal Paste Destination"
  - Consistent "Paste Destinations" terminology in UI and docs

## [0.2.1]

### Fixed

- **Critical packaging bug** - Fixed "Cannot find module" errors in v0.2.0
  - Separated `dist/` (production bundle) from `out/` (development output)
  - Follows official VSCode extension conventions
  - Prevents TypeScript compiler from overwriting esbuild's production bundle
  - Eliminates root cause of runtime module loading failures

## [0.2.0]

### Added

- **Terminal Link Navigation** - The killer feature for AI-assisted workflows
  - Click RangeLinks in your terminal to jump directly to code
  - **Cmd+Click** (Mac) or **Ctrl+Click** (Windows/Linux) to navigate
  - Instant file opening with precise cursor positioning
  - Works with single-line, and multi-line ranges
  - Smart path resolution for workspace-relative and absolute paths
  - Helpful tooltips showing the exact location that will be opened
  - Parse validation prevents navigation on invalid links
- **Terminal Binding** - Auto-send generated links to integrated terminal
  - Zero copy/paste friction for AI-assisted development
  - Links appear instantly where claude-code and other tools can see them
- Link validation with informative tooltips displaying full range context

### Changed

- **Broader VSCode compatibility** - Minimum version lowered from 1.80.0 to 1.49.0
  - Now supports 31 additional VSCode versions (3 years of releases)
  - Benefits users on stable corporate environments and older machines
  - Based on `registerTerminalLinkProvider` API availability (introduced in v1.49.0)
- Centralized asset management with build-time sync from monorepo `/assets/` directory
- `README` significantly streamlined: combined redundant sections, added compelling opening quote, removed overpromising claims
- Tool mentions now lead with claude-code (origin story) before other editors
- Refactored internal architecture with `RangeLinkService` for better maintainability

### Fixed

- Extension `README` now uses GitHub raw URL for logo (displays correctly in installed extensions, marketplace, and GitHub)
- Fixed ESLint configuration for better monorepo build reliability
- Fixed marketplace version badge URL in `README` (was using wrong publisher/extension name)
- Build process now explicitly deletes target files to prevent stale artifacts
- `CHANGELOG` now focuses only on extension changes (removed monorepo/internal documentation items)

## [0.1.0]

### Added

- Initial release to VS Code Marketplace
- Link generation with relative and absolute paths
- GitHub-style notation support (`#L10-L25` format)
- Rectangular selection support with `##` notation
- BYOD (Bring Your Own Delimiters) portable links for cross-configuration compatibility
- Custom delimiter configuration with comprehensive validation
- Reserved character validation preventing parsing ambiguities
- Delimiter conflict detection (substring and uniqueness checks)
- Comprehensive error handling with fallback to defaults
- Structured logging with stable error codes for i18n readiness
- Status bar feedback for link creation
- Command palette integration with four main commands:
  - Copy Range Link (relative path)
  - Copy Range Link (absolute path)
  - Copy Portable Link (relative path)
  - Copy Portable Link (absolute path)
- Context menu integration for all commands
- Keyboard shortcuts:
  - `Cmd+R Cmd+L` / `Ctrl+R Ctrl+L` - Copy Range Link
  - `Cmd+R Cmd+Shift+L` / `Ctrl+R Ctrl+Shift+L` - Copy Range Link (Absolute)
  - `Cmd+R Cmd+P` / `Ctrl+R Ctrl+P` - Copy Portable Link
  - `Cmd+R Cmd+Shift+P` / `Ctrl+R Ctrl+Shift+P` - Copy Portable Link (Absolute)

[Unreleased]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.3.0...HEAD
[0.3.0]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.2.1...vscode-extension-v0.3.0
[0.2.1]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.2.0...vscode-extension-v0.2.1
[0.2.0]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.1.0...vscode-extension-v0.2.0
[0.1.0]: https://github.com/couimet/rangelink/releases/tag/vscode-extension-v0.1.0
