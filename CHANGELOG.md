# Change Log

All notable changes to CodeAnchor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

### Added

- Initial release of CodeAnchor
- Create anchor command with keyboard shortcut (`Ctrl+K Ctrl+A` / `Cmd+K Cmd+A`)
- Support for relative and absolute path anchors
- Smart formatting for single-line, multi-line, and column-specific selections
- Status bar feedback when creating anchors
- Command palette integration
- Workspace-relative path generation

### Anchor Format Support

- Line number anchors: `file.ts:42`
- Single line with columns: `file.ts#L42C1-L42C10`
- Multiple lines: `file.ts#L10-L25`
- Multi-line with columns: `file.ts#L10C5-L25C20`

[Unreleased]: https://github.com/couimet/codeanchor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/couimet/codeanchor/releases/tag/v0.1.0
