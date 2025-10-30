# Change Log

All notable changes to RangeLink will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

### Added

- Initial release of RangeLink
- Create link command with keyboard shortcut (`Ctrl+R Ctrl+L` / `Cmd+R Cmd+L`)
- Support for relative and absolute path links
- Smart formatting for single-line, multi-line, and column-specific selections
- Status bar feedback when creating links
- Command palette integration
- Workspace-relative path generation

### Link Format Support

- Line number links: `file.ts#L42`
- Single line with columns: `file.ts#L42C1-L42C10`
- Multiple lines: `file.ts#L10-L25`
- Multi-line with columns: `file.ts#L10C5-L25C20`

[Unreleased]: https://github.com/couimet/rangelink/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/couimet/rangelink/releases/tag/v0.1.0
