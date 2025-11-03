# Claude Code Instructions

## Commit Messages

**Always save commit messages to `.commit-msgs/` folder** (not root directory).

Use filename format: `.commit-msgs/YYYY-MM-DD-short-description.txt`

Example: `.commit-msgs/2025-01-03-remove-hashmode-enum.txt`

## Project Context

RangeLink is a tool for generating and navigating code location links with support for:

- Multiple editors (VSCode, Cursor, Neovim planned)
- Multiple selection types (Normal, Rectangular)
- Customizable delimiters and formats
- Strong typing and comprehensive validation

## Code Style

- Use TypeScript strict mode
- Prefer functional error handling with `Result<T, E>` type
- Use custom Jest matchers for Result testing (`toBeOkWith`, `toBeErrWith`)
- Always use `.toStrictEqual()` for test assertions (not `.toEqual()`)
- Comprehensive JSDoc comments for public APIs
- Internal validation functions throw exceptions, public APIs catch and return Result

## Testing Requirements

- Maintain 99%+ test coverage
- Run full test suite before committing
- Add tests for all new features and bug fixes
- Use descriptive test names that explain the scenario
- **Use string literals for enum values in test assertions** (not enum references)
  - Tests the external-facing contract/API surface
  - Example: `linkType: 'Regular'` instead of `linkType: LinkType.Regular`
  - Catches accidental enum value changes

## Documentation

- Update ROADMAP.md when completing phases
- Document architectural decisions/ADRs in relevant docs/ files
- Keep commit messages detailed -- yet concise -- with motivation, changes, and benefits
