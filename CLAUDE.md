# Claude Code Instructions

## Asking Questions and Design Decisions

When Claude needs to ask questions or gather design decisions before implementing:

1. **Never print questions directly in terminal** - this causes confusion with duplicate numbering and makes tracking answers difficult
2. **Always save questions to a file** in `.claude-questions/NNNN-topic-slug.txt` where:
   - `NNNN` is sequential (0001, 0002, etc.) - check existing files with Glob and increment from highest
   - `topic-slug` is auto-generated kebab-case description (max 50 chars)
3. **Print only the filepath** in terminal output
4. **File format:**

   ```markdown
   # Question Topic

   ## Question 1: <question with options/recommendations>

   Answer: [prefilled recommended answer when available]

   ---

   ## Question 2: <question with options/recommendations>

   Answer: [prefilled recommended answer when available]
   ```

5. **Number questions sequentially starting from 1** within each file
6. **The questions file is the single source of truth** - user will edit answers there

Claude can still share summaries and thought processes in terminal to provide context, but all questions must go in the file.

## Commit Messages

**Always save commit messages to `.commit-msgs/` folder** (not root directory).

Use filename format: `.commit-msgs/YYYY-MM-DD-short-description.txt`

Example: `.commit-msgs/2025-01-03-remove-hashmode-enum.txt`

### Writing Concise Commit Messages

**Focus on "why", not "what":**

- ✅ Explain the motivation, problem solved, and benefits
- ❌ Do NOT list files modified/added/deleted (the commit is the source of truth)
- ❌ Do NOT duplicate information available in `git diff`

**Structure:**

```
<type>(scope): <short summary>

<Body: Why this change? What problem does it solve?>

Benefits:
- Key benefit 1
- Key benefit 2

```

**Good example:**

```
refactor(vscode-ext): separate dist/ and out/ to follow VSCode conventions

Prevents "Cannot find module" errors by separating development and production builds.
Following official conventions eliminates conflicts where tsc could overwrite esbuild's bundle.

Benefits:
- Impossible for tsc --watch to interfere with packaging
- Standard convention matching VSCode templates
```

**Bad example (too verbose):**

```
refactor(vscode-ext): update build output structure

Modified files:
- esbuild.config.js: Changed outfile from out/ to dist/
- package.json: Updated main field, clean script, compile script
- .vscodeignore: Added out/** exclusion
- Deleted: validate-bundle.sh, validate-vsix.sh, scripts/README.md

Changed esbuild to output to dist/ and updated package.json accordingly...
```

**Key principles:**

- Keep it concise (aim for < 15 lines total)
- First line: conventional commit format (`type(scope): summary`)
- Body: 1-3 sentences explaining context
- Benefits: Bulleted list of key improvements
- Omit file lists (redundant with commit diff)

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
- **No magic numbers** - Define constants for all numeric literals with semantic meaning
  - Always use named constants instead of inline numbers
  - Place constants in appropriate files: feature-specific constants in same file, shared constants in `/constants/`
  - Use SCREAMING_SNAKE_CASE for constant names
  - Example:

    ```typescript
    // ❌ BAD - Magic number
    if (link.length > 3000) {
      throw new Error('Link too long');
    }

    // ✅ GOOD - Named constant
    const MAX_LINK_LENGTH = 3000;
    if (link.length > MAX_LINK_LENGTH) {
      throw new Error(`Link exceeds maximum length of ${MAX_LINK_LENGTH}`);
    }
    ```

  - Rationale: Makes code self-documenting, easier to maintain and update limits

- **Proactive module extraction** - Extract to standalone module WITHOUT being asked when:
  - Function exceeds 50 lines, OR
  - Function has 3+ dependencies (hard to test), OR
  - Logic mixes concerns (e.g., UI + business logic)
  - Place in: `/utils/` (pure utilities), `/services/` (business logic), or root `/src/` (feature-specific)
  - Always use arrow function exports with JSDoc
  - Apply SOLID principles by default (Single Responsibility, minimal dependencies)
- Prefer functional error handling with `Result<T, E>` type
- Use custom Jest matchers for Result testing (`toBeOkWith`, `toBeErrWith`)
- Always use `.toStrictEqual()` for test assertions (not `.toEqual()`)
- Comprehensive JSDoc comments for public APIs
- Internal validation functions throw exceptions, public APIs catch and return Result
- **Log optional parameter usage explicitly:**
  - Use optional params (`param?: Type`) instead of default values when you need to track usage
  - When param not provided: Log at DEBUG level "No [param] provided, using [DEFAULT]"
  - When param provided: Log "Using provided [param]"
  - Include the resolved value in log context for traceability
  - Example:

    ```typescript
    export const parseLink = (link: string, delimiters?: DelimiterConfig): Result<...> => {
      const useFallback = delimiters === undefined;
      const activeDelimiters = useFallback ? DEFAULT_DELIMITERS : delimiters;

      if (useFallback) {
        logger.debug({ fn: 'parseLink', delimiters: activeDelimiters },
          'No delimiter config provided, using DEFAULT_DELIMITERS');
      } else {
        logger.debug({ fn: 'parseLink', delimiters: activeDelimiters },
          'Using provided delimiter config');
      }
      // ... use activeDelimiters everywhere
    }
    ```

  - Rationale: Makes it clear in logs whether defaults were used vs custom config provided

## Testing Requirements

- Maintain 99%+ test coverage
- Run full test suite before committing
- Add tests for all new features and bug fixes
- Use descriptive test names that explain the scenario
- **Use string literals for enum values in test assertions** (not enum references)
  - Tests the external-facing contract/API surface
  - Example: `linkType: 'Regular'` instead of `linkType: LinkType.Regular`
  - Catches accidental enum value changes

### Custom Jest Matchers

**Prefer `toThrowRangeLinkError` for testing functions that throw errors:**

```typescript
// ✅ PREFERRED - Clean, validates all error properties
expect(() => validateInputSelection(input)).toThrowRangeLinkError({
  code: RangeLinkErrorCodes.SELECTION_EMPTY,
  message: 'Selections array must not be empty',
  functionName: 'validateInputSelection',
});

// ❌ AVOID - Old verbose pattern
let caughtError: unknown;
try {
  validateInputSelection(input);
} catch (error) {
  caughtError = error;
}
expect(caughtError).toBeRangeLinkError({...});
```

**Use `toBeRangeLinkError` only for Result types:**

```typescript
// When testing functions that return Result<T, RangeLinkError>
const result = computeRangeSpec(input);
expect(result).toBeErrWith((error: RangeLinkError) => {
  expect(error).toBeRangeLinkError({
    code: RangeLinkErrorCodes.SELECTION_EMPTY,
    message: 'Selections array must not be empty',
    functionName: 'validateInputSelection',
  });
});
```

**Matcher validation:**

- Uses `instanceof RangeLinkError` (strict type checking)
- `functionName` is **required** (all errors must specify throwing function)
- `details` validated with `toStrictEqual` if provided
- `cause` validated if error chaining is used

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
- Exception: Keep code ONLY when it illustrates a key architectural decision
- Keep interface definitions or API shapes that explain "why", not "what"

### General Documentation

- Document architectural decisions/ADRs in relevant docs/ files
- Keep commit messages detailed -- yet concise -- with motivation, changes, and benefits

### Markdown Cross-References and Link Maintenance

**When modifying markdown files, verify cross-file references don't break:**

1. **Search for incoming references** before renaming sections:

   ```bash
   # Check if any files reference the section you're changing
   grep -r "Section Name" docs/ packages/*/README.md packages/*/*.md
   ```

2. **Use resilient link patterns** when creating cross-references:
   - **Relative links with section anchors:** `[text](./FILE.md#section-anchor)`
   - **Include quoted context:** `see [DEVELOPMENT.md → "View extension logs"](./DEVELOPMENT.md#section)`
   - **Add redundant info:** Include key details (keyboard shortcuts, brief steps) inline so link breakage doesn't block users

   Example:

   ```markdown
   Invalid configurations show warnings in the output channel
   (`Cmd+Shift+U` / `Ctrl+Shift+U`, select "RangeLink").
   See [DEVELOPMENT.md](./DEVELOPMENT.md#development-workflow) for details.
   ```

3. **Test links when changing section headings:**
   - Section anchors in GitHub: lowercase, spaces → hyphens, special chars removed
   - Example: `### View Extension Logs` → `#view-extension-logs`
   - When renaming sections, search codebase for the old anchor slug

4. **Common cross-reference pairs to watch:**
   - `README.md` ↔ `DEVELOPMENT.md` (user-facing ↔ developer instructions)
   - `ROADMAP.md` ↔ `JOURNEY.md` (planned ↔ completed work)
   - Package READMEs ↔ root `docs/` (specific ↔ architectural)

5. **When breaking a link is unavoidable:**
   - Update all incoming references in the same commit
   - Use grep/ripgrep to find them: `rg "old-section-name" --type md`
