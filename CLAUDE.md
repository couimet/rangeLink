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
- **Prefer arrow functions** for all new code and when refactoring existing code
  - Arrow functions: `const myFunc = (param: string): string => { ... }`
  - Avoid traditional function declarations: `function myFunc(param: string): string { ... }`
  - Exception: Methods in classes use method syntax
- **Use `undefined` instead of `null`** for TypeScript consistency
  - TypeScript convention: optional/absent values are `undefined`
  - Lighter: `field: Type | undefined;` (implicit initialization)
  - Avoid: `field: Type | null = null;` (explicit, heavier)
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

### ROADMAP and JOURNEY Maintenance

**When completing work items:**

1. **Mark as complete in ROADMAP.md** first (change status to ✅ Complete)
2. **After user commits**, move completed sections to JOURNEY.md:
   - Copy entire completed section (with all context, tasks, deliverables)
   - Preserve completion status and rationale
   - Remove from ROADMAP.md
   - Update ROADMAP.md with summary: `**Completed:** [brief list] (see JOURNEY.md for details)`
3. **Don't batch moves** - move items to JOURNEY after each phase completes (keeps ROADMAP lean)

**Examples:**

- Phase 1A complete → Mark ✅ in ROADMAP → User commits → Move full section to JOURNEY → Update ROADMAP
- Phase 4E-4I complete → Mark all ✅ → User commits → Move to JOURNEY → Add summary line in ROADMAP Phase 4

**Code snippet handling:**

By default, **remove all code snippets** when moving to JOURNEY.md:

- The commit contains the implementation - JOURNEY is for context/decisions, not code
- Exception: Keep code ONLY when it illustrates a key architectural decision or you are explicitly prompted to

### General Documentation

- Document architectural decisions/ADRs in relevant docs/ files
- Keep commit messages detailed -- yet concise -- with motivation, changes, and benefits
