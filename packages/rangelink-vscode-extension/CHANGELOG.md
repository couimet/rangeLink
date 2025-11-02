# Changelog

All notable changes to the RangeLink VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - Unreleased

### Fixed

- Fixed ESLint configuration moved to root for better monorepo management
- Fixed improper version link in documentation
- Explicitly delete target file during build to avoid potential issues

### Documentation

- Added comprehensive monorepo release and tagging strategy (RELEASE-STRATEGY.md)
- Reorganized documentation with minimalist root README and detailed package guides
- Added post-publishing enhancements section to roadmap
- Improved markdown formatting consistency
- Marked Phase 4A complete in roadmap with v0.1.0 tagging details

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

### Documentation

- Comprehensive README with usage examples and use cases
- Link formats guide (LINK-FORMATS.md)
- BYOD specification (BYOD.md)
- Error handling reference (ERROR-HANDLING.md)
- Logging approach documentation (LOGGING.md)
- Architecture documentation (ARCHITECTURE.md)
- Development roadmap (ROADMAP.md)

[Unreleased]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.1.0...HEAD
[0.1.1]: https://github.com/couimet/rangelink/compare/vscode-extension-v0.1.0...HEAD
[0.1.0]: https://github.com/couimet/rangelink/releases/tag/vscode-extension-v0.1.0
