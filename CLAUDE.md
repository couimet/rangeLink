# Claude Code Instructions

## ⚠️ CRITICAL WORKFLOW REMINDERS

**STOP AND READ BEFORE RESPONDING:**

### Questions & Design Decisions

- **NEVER print questions directly in terminal output**
- **ALWAYS save to:** `.claude-questions/NNNN-topic-slug.txt` (`.txt` format, NOT `.md`)
- Check existing files with `Glob` to find next NNNN number
- Print only the filepath in terminal
- User edits the file - it's the single source of truth

### Commit Messages

- **ALWAYS save to:** `.commit-msgs/NNNN-description.txt` (`.txt` format, NOT `.md`)
- Check existing files with `Glob` to find next NNNN number
- Focus on "why", not "what" (git diff shows "what")
- Keep concise (< 15 lines)

### Testing Style

- **NO** `expect().not.toThrow()` for happy paths - just call the function directly
- **USE** `.toStrictEqual()` not `.toEqual()`
- **USE** string literals for enum values in assertions:
  - **Our own enums**: Use string literals to test contract - `'Regular'` not `LinkType.Regular`
  - **External library enums/constants**: Use actual constant - `vscode.TextEditorRevealType.InCenterIfOutsideViewport` is fine
  - Rationale: We control our own enum values (test contract), but not external libraries (use their constants)

---

## Autonomous Operation Guidelines

**Claude should operate autonomously for standard development tasks without asking for permission.**

### Always Proceed Without Asking For

1. **Reading files** - Read any project files to understand context
2. **Running tests** - `pnpm test`, `pnpm --filter <package> test`, etc.
3. **Compiling/building** - `pnpm compile`, `pnpm clean`, `tsc`, etc.
4. **Checking git status** - `git status`, `git log`, `git diff`
5. **Searching code** - `grep`, `find`, `rg` (ripgrep)
6. **Installing dependencies** - `pnpm install` (after package.json changes)
7. **Formatting code** - `pnpm format:fix`
8. **Linting** - Running eslint or other linters
9. **Reading documentation** - Web searches, fetching docs from official sites
10. **Creating test files** - When implementing features, always add corresponding tests
11. **Editing files** - To fix bugs, implement features, refactor code
12. **Writing new files** - When required for features (but prefer editing existing files)

### Ask Permission Before

1. **Git commits** - Always ask before committing (user reviews first)
2. **Publishing** - Never publish packages without explicit approval
3. **Deleting files** - Confirm before removing files (unless clearly obsolete)
4. **Major architectural changes** - Discuss before large refactors
5. **External API calls** - When consuming third-party services
6. **Changing dependencies** - Adding/removing packages in package.json
7. **Modifying configuration** - Changes to tsconfig.json, jest.config.js, etc.

### Default Behavior

- **Be proactive** - If tests fail, investigate and fix without asking
- **Run verification** - After making changes, automatically run tests
- **Self-correct** - If a command fails, try alternative approaches
- **Provide context** - Explain what you're doing, but don't wait for approval for standard tasks
- **Use parallel operations** - Run multiple independent commands concurrently when possible

**Rationale:** This enables efficient parallel development across multiple worktrees without constant approval prompts for routine operations.

## Node.js and pnpm Setup

**Important:** Claude Code runs non-interactive shells, so `node` and `pnpm` may not be available in the PATH by default.

**Before running any pnpm commands:**

```bash
source ~/.zshrc && nvm use && npm run enable-pnpm
```

**Explanation:**

- `source ~/.zshrc` loads nvm and sets up the shell environment
- `nvm use` switches to the Node.js version specified in `.nvmrc` (v22)
- `npm run enable-pnpm` enables pnpm via corepack

**Use this pattern for all pnpm commands:**

```bash
source ~/.zshrc && nvm use && pnpm <command>
```

## Asking Questions and Design Decisions

**Important:** All files in `.claude-questions/` and `.commit-msgs/` must be `.txt` format (not `.md`), even if they contain markdown-style formatting.

**Example paths:**

- Questions: `.claude-questions/0001-navigation-approach.txt` ⚠️ (folder is `.claude-questions/`, not `.questions/`)
- Commit messages: `.commit-msgs/0001-fix-infinite-recursion.txt`

When Claude needs to ask questions or gather design decisions before implementing:

1. **Never print questions directly in terminal** - this causes confusion with duplicate numbering and makes tracking answers difficult
2. **Always save questions to a text file** in `.claude-questions/NNNN-topic-slug.txt` where:
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

**IMPORTANT: BEFORE creating a commit message file:**

1. Use `Glob(pattern="*.txt", path=".commit-msgs/")` to check existing files
2. Find the highest NNNN number
3. Increment by 1 for your new file

**Filename format:** `.commit-msgs/NNNN-short-description.txt`

⚠️ **DO NOT use dates** (e.g., `2025-11-08-description.txt`) - Always use sequential NNNN numbers!

**Examples:**

- ✅ `.commit-msgs/0001-remove-hashmode-enum.txt`
- ✅ `.commit-msgs/0042-fix-validation-bug.txt`
- ❌ `.commit-msgs/2025-11-08-fix-bug.txt` (WRONG - uses date instead of NNNN)
- ❌ `.commit-msgs/fix-bug.txt` (WRONG - missing NNNN prefix)

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
- **Facade pattern for external dependencies**:
  - Facades wrap **behaviors** (methods), not **types/constants**
  - ✅ Wrap through adapter: `ideAdapter.showTextDocument()`, `ideAdapter.createPosition()`
  - ✅ Import directly: `vscode.TextEditorRevealType.InCenterIfOutsideViewport` (constants/enums)
  - Facades should be thin delegation layers (1-3 lines per method)
  - Complex algorithms belong in utilities, not facades
  - Example: VscodeAdapter wraps VSCode API, but vscode enums can be imported directly
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

### JSDoc Documentation Style

**DO NOT add usage examples to JSDoc comments:**

- ❌ **Never** include `@example` blocks with code snippets in JSDoc
- ✅ **Use unit tests** as the single source of truth for usage examples
- ✅ Keep JSDoc focused on **what** the function does and **why** design decisions were made
- ✅ Document parameters, return types, and important behavioral notes

**Rationale:**

- Unit tests already demonstrate all usage patterns comprehensively
- Code examples in JSDoc become stale and require maintenance
- Tests are executable and verified, JSDoc examples are not
- Examples belong in README files and other documentation, not inline comments

**When modifying files with JSDoc examples:**

- Proactively suggest removing `@example` blocks when you see them
- Point user to relevant test files for usage examples

**Good JSDoc (concise, no examples):**

```typescript
/**
 * Parse a RangeLink string into structured components.
 *
 * Supported formats:
 * - `#L10` (single line)
 * - `#L10-L20` (multi-line)
 * - `#L10C5-L20C10` (with columns)
 * - `##L10C5-L20C10` (rectangular)
 *
 * @param link - The RangeLink string to parse
 * @param delimiters - Optional delimiter configuration
 * @returns Result with ParsedLink on success, RangeLinkError on failure
 */
export const parseLink = (
  link: string,
  delimiters?: DelimiterConfig,
): Result<ParsedLink, RangeLinkError> => {
  // ...
};
```

**Bad JSDoc (verbose with examples):**

````typescript
/**
 * Parse a RangeLink string into structured components.
 *
 * @example
 * ```typescript
 * const result = parseLink("src/auth.ts#L42C10");
 * if (result.success) {
 *   console.log(result.value.path); // "src/auth.ts"
 * }
 * ```
 */
````

## Testing Requirements

**REMINDER: Questions about test design? Save to `.claude-questions/NNNN-topic.txt` (see top of file)**

- Maintain 99%+ test coverage
- Run full test suite before committing
- Add tests for all new features and bug fixes
- Use descriptive test names that explain the scenario
- **Use string literals for enum values in test assertions** (not enum references)
  - Tests the external-facing contract/API surface
  - Example: `linkType: 'Regular'` instead of `linkType: LinkType.Regular`
  - Catches accidental enum value changes

### Test Planning Process

**ALWAYS use test-scope-fixer agent when planning or reviewing tests:**

1. **Before writing new tests:**
   - Invoke `@agent-test-scope-fixer` with the test plan
   - Ask: "Are these tests properly scoped? Should dependencies be mocked?"
   - Get recommendations on test architecture

2. **After writing tests:**
   - Invoke `@agent-test-scope-fixer` to validate test scope
   - Ensure tests don't test implementation details of delegated utilities
   - Verify proper mocking boundaries

3. **When refactoring existing tests:**
   - Invoke `@agent-test-scope-fixer` to analyze current architecture
   - Identify coupling issues and badly scoped tests
   - Get refactoring recommendations

**Example invocation:**
```
Use @agent-test-scope-fixer to analyze [file] and determine:
1. Are tests properly scoped (unit vs integration)?
2. Should dependencies be mocked or use real implementations?
3. Are tests testing implementation details?
4. Recommendations for proper test architecture
```

### Test Architecture Guidelines

**Prefer mocking for presentation-layer tests:**

When testing presentation-layer components (providers, controllers, UI logic):
- **Mock all dependencies** to isolate the component under test
- **Test only orchestration logic** (how component delegates to dependencies)
- **Avoid testing implementation details** of delegated utilities
- **Add integration tests separately** (2-3 tests) to verify mocks work correctly

**Example: Document Provider (GOOD pattern)**
```typescript
// Mock the handler completely
const createMockHandler = (): jest.Mocked<RangeLinkNavigationHandler> => ({
  getPattern: jest.fn(() => TEST_PATTERN),
  parseLink: jest.fn(),
  formatTooltip: jest.fn(),
  navigateToLink: jest.fn(),
}) as unknown as jest.Mocked<RangeLinkNavigationHandler>;

// Tests focus ONLY on provider orchestration
it('should delegate parsing to handler', () => {
  mockHandler.parseLink.mockReturnValue(Result.ok(mockParsed));

  provider.provideDocumentLinks(document, token);

  expect(mockHandler.parseLink).toHaveBeenCalledWith('src/file.ts#L10');
});
```

**Example: Terminal Provider (BAD pattern - avoid this)**
```typescript
// ❌ DON'T: Use real handler in unit tests
const handler = new RangeLinkNavigationHandler(delimiters, mockLogger);
provider = new RangeLinkTerminalProvider(handler, mockLogger);

// ❌ Tests verify handler implementation, not just provider orchestration
it('should extend single-position selection', async () => {
  // Tests exact character math: char + 1
  // Tests line length boundary conditions
  // Tests empty line handling
  // All handler implementation details, not provider orchestration!
});
```

**Integration Tests (when to add):**
- Add 2-3 integration tests in separate describe block or file
- Use real implementations to verify mocks are accurate
- Test critical paths end-to-end
- Keep minimal - most tests should be unit tests with mocks

**Rationale:**
- **Faster tests:** Mocks avoid real parsing/API calls
- **Focused tests:** Test one layer at a time
- **Maintainable:** Tests don't break when dependencies change
- **Debuggable:** Failures pinpoint exact component issue
- **Consistent:** Same pattern across all presentation-layer tests

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

**Avoid `expect().not.toThrow()` for happy path tests:**

```typescript
// ❌ AVOID - Unnecessary wrapper, adds noise
expect(() => validateInputSelection(input)).not.toThrow();

// ✅ PREFERRED - Direct call, clearer intent
validateInputSelection(input);
```

**Rationale:**

- Tests fail automatically if unexpected exceptions occur (Jest default behavior)
- Direct calls are clearer: "this should work" vs "this should not throw"
- `.not.toThrow()` implies exception testing, but happy paths aren't about exceptions

**When `.not.toThrow()` IS appropriate:**

- Explicitly testing that edge cases don't crash: `expect(() => parse('')).not.toThrow()`
- Documenting surprising valid inputs: `expect(() => validate({unusual: 'case'})).not.toThrow()`
- After fixing a bug where something used to throw incorrectly

**Use `toBeRangeLinkErrorErr` for Result-returning functions (not nested matchers):**

```typescript
// ✅ PREFERRED - Clean, single matcher for Result types
const result = computeRangeSpec(input);
expect(result).toBeRangeLinkErrorErr('SELECTION_EMPTY', {
  message: 'Selections array must not be empty',
  functionName: 'validateInputSelection',
});

// ❌ AVOID - Old nested pattern
const result = computeRangeSpec(input);
expect(result).toBeErrWith((error: RangeLinkError) => {
  expect(error).toBeRangeLinkError('SELECTION_EMPTY', {
    message: 'Selections array must not be empty',
    functionName: 'validateInputSelection',
  });
});
```

**Extract error objects as test-scoped constants when testing error re-throw:**

```typescript
// ✅ PREFERRED - Assert on error object (type + message + reference equality)
const expectedError = new TypeError('Unexpected validation error');
jest.spyOn(module, 'fn').mockImplementationOnce(() => {
  throw expectedError;
});
expect(() => myFunction()).toThrow(expectedError);

// ❌ AVOID - Brittle string-only assertion
jest.spyOn(module, 'fn').mockImplementationOnce(() => {
  throw new TypeError('Unexpected validation error');
});
expect(() => myFunction()).toThrow('Unexpected validation error');
```

**Rationale for error object extraction:**

- Asserts on error **type** (TypeError, RangeError, etc.), not just message
- Asserts on **reference equality** (exact error object was re-thrown)
- Less brittle: message changes won't break test if error type changes too
- Self-documenting: error object definition shows exactly what's being tested

**Always verify jest.spyOn() calls:**

```typescript
// ✅ REQUIRED - Verify spy was called with exact parameters
const spy = jest.spyOn(module, 'functionName').mockImplementation(...);

myFunction(input);

expect(spy).toHaveBeenCalledTimes(1);
expect(spy).toHaveBeenCalledWith(input); // Exact parameter validation

spy.mockRestore(); // Or use afterEach cleanup
```

**Simplify mock test inputs (don't test too deep):**

```typescript
// ✅ PREFERRED - Input doesn't matter when dependency is mocked
const input = {} as InputType; // Mock will intercept before validation
const spy = jest.spyOn(dependency, 'validate').mockImplementation(...);

// ❌ AVOID - Over-specifying input that mock will intercept anyway
const input: InputType = {
  field1: 'value',
  field2: { nested: 'data' },
  field3: [1, 2, 3],
}; // All this detail is unnecessary if mock intercepts
```

**Rationale for spy verification:**

- Ensures mock actually intercepted the call (validates test setup)
- Validates integration contract between layers
- Catches parameter drift when refactoring
- Prevents dangling/unused spy setups
- Self-documenting: shows exactly what's being tested

**Matcher validation:**

- Uses `instanceof RangeLinkError` (strict type checking)
- `functionName` is **required** (all errors must specify throwing function)
- `details` validated with `toStrictEqual` if provided
- `cause` validated if error chaining is used

## GitHub Issue Management

### Parent-Child Issue Relationships

**When creating GitHub issues with parent-child relationships, ALWAYS use GitHub's native sub-issue API:**

- ❌ **NEVER** rely only on text links in issue descriptions/comments (e.g., "Parent Issue: #47")
- ✅ **ALWAYS** use the GraphQL `addSubIssue` mutation to create native relationships
- ✅ Native relationships enable GitHub UI features: progress tracking, filtering, project board integration

**Implementation pattern:**

```bash
# Create parent issue
PARENT_URL=$(gh issue create --title "Parent" --body "..." --label "...")
PARENT_NUM=$(echo "$PARENT_URL" | grep -oE '[0-9]+$')

# Get parent node ID (required for GraphQL)
PARENT_ID=$(gh api repos/:owner/:repo/issues/$PARENT_NUM --jq '.node_id')

# Create child issue
CHILD_URL=$(gh issue create --title "Child" --body "..." --label "...")
CHILD_NUM=$(echo "$CHILD_URL" | grep -oE '[0-9]+$')
CHILD_ID=$(gh api repos/:owner/:repo/issues/$CHILD_NUM --jq '.node_id')

# Link child to parent using native API
gh api graphql -H "GraphQL-Features: sub_issues" -f query="
  mutation {
    addSubIssue(input: {issueId: \"$PARENT_ID\", subIssueId: \"$CHILD_ID\"}) {
      clientMutationId
    }
  }
"
```

**Benefits of native relationships:**

- Sub-issues appear in GitHub UI with visual hierarchy
- Parent shows progress bar based on closed sub-issues
- Filters: `has:sub-issues`, `has:parent-issue`
- Project boards show nested structure
- Better organization and tracking

**Rationale:** Text-only references in descriptions are fragile and don't integrate with GitHub's project management features. Native relationships provide proper tooling support.

### Issue Label Requirements

**ALL issues MUST have both a `type:*` label AND a `priority:*` label.**

**Type labels (required - pick ONE):**

- `type:bug` - Bug or defect in existing functionality
- `type:enhancement` - New feature or enhancement
- `type:debt` - Technical debt that needs to be addressed
- `type:docs` - Documentation improvements
- `type:refactor` - Code refactoring without behavior change
- `type:test` - Test coverage improvements

**Priority labels (required - pick ONE):**

- `priority:critical` - Critical priority - must be fixed ASAP
- `priority:high` - High priority
- `priority:medium` - Medium priority
- `priority:low` - Low priority / nice to have

**Scope labels (optional - pick one or more):**

- `scope:core` - rangelink-core-ts package
- `scope:vscode-ext` - rangelink-vscode-extension package
- `scope:test-utils` - rangelink-test-utils package
- `scope:tooling` - Build tools, scripts, CI/CD
- `scope:docs` - Documentation files (README, ROADMAP, etc.)

**Example issue creation:**

```bash
gh issue create \
  --title "Fix validation bug in parseLink" \
  --body "..." \
  --label "type:bug,priority:high,scope:core"
```

**Rationale:** Consistent labeling enables better filtering, prioritization, and project management. All issues must be categorized by type and priority for effective triage.

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
