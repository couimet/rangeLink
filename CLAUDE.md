# Claude Code Instructions

<meta>
  <purpose>Project-specific instructions for Claude Code</purpose>
  <project>RangeLink - Code location link generator for VSCode/Cursor</project>
  <version>2.0 - XML-structured format</version>
</meta>

---

<critical-rules>
<!-- These rules are checked on EVERY response. Violations are unacceptable. -->

<rule id="Q001" priority="critical">
  <title>Questions go to file, not terminal</title>
  <do>Save questions to `.claude-questions/NNNN-description.txt`</do>
  <never>Print questions directly in terminal output</never>
  <checklist>
    - Use `Glob(pattern="*.txt", path=".claude-questions/")` to find next NNNN
    - Use `.txt` extension (NOT `.md`)
    - Print only the filepath in terminal
    - User edits file - it's the single source of truth
  </checklist>
</rule>

<rule id="C001" priority="critical">
  <title>Commit messages go to file</title>
  <do>Save commit messages to `.commit-msgs/NNNN-description.txt`</do>
  <checklist>
    - Use `Glob(pattern="*.txt", path=".commit-msgs/")` to find next NNNN
    - Use `.txt` extension (NOT `.md`)
    - Focus on "why", not "what" (git diff shows "what")
    - Keep concise (< 15 lines)
  </checklist>
</rule>

<rule id="C002" priority="critical">
  <title>No narrating comments</title>
  <never>Add comments that simply describe what the code does (the code is self-documenting)</never>
  <do>Only add comments for non-obvious behavior, gotchas, or "why" explanations</do>
  <bad-examples>
    - `// Create mock objects`
    - `// Configure adapter with options`
    - `// First item should be X`
  </bad-examples>
  <good-examples>
    - `// Workaround for VSCode API limitation`
    - `// Using raw value 2 to test external contract (not enum reference)`
  </good-examples>
</rule>

<rule id="S001" priority="critical">
  <title>Scratchpads for working documents</title>
  <do>Save working documents to `.scratchpads/NNNN-description.txt`</do>
  <when>PR drafts, implementation plans, analysis notes, any temporary working doc</when>
  <checklist>
    - Use `Glob(pattern="*.txt", path=".scratchpads/")` to find next NNNN
    - Use `.txt` extension for consistency
  </checklist>
</rule>

<rule id="T001" priority="critical">
  <title>No .not.toThrow() for happy paths</title>
  <do>Call function directly - Jest fails automatically on unexpected exceptions</do>
  <never>Use `expect(() => fn()).not.toThrow()` for happy path tests</never>
  <good-example>
    ```typescript
    validateInputSelection(input); // Direct call - clearer intent
    ```
  </good-example>
  <bad-example>
    ```typescript
    expect(() => validateInputSelection(input)).not.toThrow(); // Unnecessary
    ```
  </bad-example>
</rule>

<rule id="T002" priority="critical">
  <title>Use .toStrictEqual() for objects and arrays</title>
  <do>Use `.toStrictEqual()` when asserting objects or arrays</do>
  <never>Use `.toContainEqual()` - it's a partial matcher that hides unexpected properties</never>
  <scope>Objects and arrays only - primitives (strings, booleans, numbers) don't need this</scope>
  <rationale>Catches undefined vs missing properties, stricter type checking</rationale>
</rule>

<rule id="T003" priority="critical">
  <title>Literal values for contract assertions</title>
  <scope>Applies to expect() assertions only, NOT test setup/mocks</scope>
  <do>Use string literals in assertions for OUR enums: `expect(x).toBe('Regular')`</do>
  <do>Use string literals in assertions for user-facing text: `expect(x).toBe('RangeLink Menu')`</do>
  <do>Use string literals in assertions for config keys: `expect(x).toBe('delimiterLine')`</do>
  <setup>Enum values ARE allowed in test setup (mocks, fixtures) for type safety</setup>
  <exception>External library enums in assertions: use actual constant</exception>
  <rationale>Assertions freeze contracts - catches accidental enum/text changes. Setup code benefits from type safety.</rationale>
  <bad-example>
    ```typescript
    // BAD: enum in assertion - won't catch if enum value changes
    expect(result.linkType).toBe(LinkType.Regular);
    expect(item.tooltip).toBe(messagesEn[MessageCode.STATUS_BAR_MENU_TOOLTIP]);
    ```
  </bad-example>
  <good-example>
    ```typescript
    // GOOD: Setup uses enum for type safety
    const mockParsedLink: ParsedLink = {
      linkType: LinkType.Regular,
      selectionType: SelectionType.Normal,
      // ...
    };

    // GOOD: Assertions use literals to freeze contract
    expect(result.linkType).toBe('Regular');
    expect(item.tooltip).toBe('RangeLink Menu');
    ```

  </good-example>
</rule>

<rule id="T004" priority="critical">
  <title>No partial matchers</title>
  <never>Use `expect.objectContaining()` or `expect.stringContaining()`</never>
  <do>Assert exact values - if the full object is too verbose, extract relevant fields first</do>
  <rationale>Partial matchers hide unexpected properties and make tests less precise</rationale>
</rule>

<rule id="T005" priority="critical">
  <title>No manual mock cleanup</title>
  <never>Use `afterEach(() => { jest.clearAllMocks(); })` or similar manual cleanup</never>
  <rationale>Jest config already has `clearMocks`, `resetMocks`, `restoreMocks` set to `true`</rationale>
  <see>jest.config.js lines 5-7</see>
</rule>

<rule id="T006" priority="critical">
  <title>Use toHaveBeenCalledWith for mock assertions</title>
  <do>Use `.toHaveBeenCalledWith(param1, param2, ...)` to verify mock call parameters</do>
  <never>Access `.mock.calls[0]` to extract and assert parameters separately</never>
  <bad-example>
    ```typescript
    const [items] = mockFn.mock.calls[0];
    expect(items[0]).toStrictEqual({ label: 'foo' });
    ```
  </bad-example>
  <good-example>
    ```typescript
    expect(mockFn).toHaveBeenCalledWith(
      [{ label: 'foo' }, { label: 'bar' }],
      { option: 'value' },
    );
    ```
  </good-example>
</rule>

<rule id="T007" priority="critical">
  <title>Always test logging behavior</title>
  <do>Include logger assertions in tests that verify method behavior - logging provides critical visibility for debugging</do>
  <never>Create separate tests just for logging - consolidate with behavior tests</never>
  <rationale>Log statements are part of the method contract; they provide visibility needed when bugs are reported</rationale>
  <good-example>
    ```typescript
    it('creates and configures component', () => {
      myComponent.initialize();

      expect(mockDependency.create).toHaveBeenCalledWith(config);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'MyComponent.initialize' },
        'Component initialized',
      );
    });
    ```

  </good-example>
</rule>

<rule id="E001" priority="critical">
  <title>Shell environment setup</title>
  <when>Before running pnpm, npm, node, or any JS tooling commands</when>

  <prerequisites>
    1. Ensure working directory is project root (where pnpm-workspace.yaml lives)
    2. Shell config must have nvm configured (Claude Code runs non-interactive shells that don't auto-source config files)
  </prerequisites>

  <setup-sequence>
    Run this sequence to initialize the environment:
    ```
    For zsh:  source ~/.zshrc && nvm use && npm run enable-pnpm
    For bash: source ~/.bashrc && nvm use && npm run enable-pnpm
    ```
  </setup-sequence>

  <verification>
    After setup, verify tools are available:
    ```bash
    node --version && pnpm --version
    ```
    Both commands should return version numbers.
  </verification>

  <troubleshooting>
    <problem symptom="nvm: command not found">
      <cause>Shell config not sourced - nvm function not loaded</cause>
      <fix>Run: `source ~/.zshrc` (zsh) or `source ~/.bashrc` (bash)</fix>
    </problem>

    <problem symptom="N/A: version 'N/A' not found" or ".nvmrc not found">
      <cause>Node version not installed via nvm</cause>
      <fix>Run: `nvm install` (installs version from .nvmrc)</fix>
    </problem>

    <problem symptom="command not found: node">
      <cause>nvm not loaded OR node not installed</cause>
      <fix>Run: `source ~/.zshrc && nvm install && nvm use` (zsh) or `source ~/.bashrc && nvm install && nvm use` (bash)</fix>
    </problem>

    <problem symptom="command not found: pnpm">
      <cause>corepack/pnpm not enabled</cause>
      <fix>Run: `npm run enable-pnpm` from the root of the project</fix>
    </problem>

    <problem symptom="ENOENT pnpm-workspace.yaml">
      <cause>Not in project root directory</cause>
      <fix>Navigate to project root before running commands</fix>
    </problem>

  </troubleshooting>

<rationale>Claude Code runs non-interactive shells; node/pnpm not in PATH by default</rationale>
</rule>

<rule id="A001" priority="critical">
  <title>Never commit unless explicitly asked</title>
  <do>Prepare commit message in `.commit-msgs/NNNN-description.txt` - user commits themselves</do>
  <never>Run `git commit` unless user explicitly asks you to commit</never>
  <rationale>User always reviews and commits on their own</rationale>
</rule>

<rule id="G001" priority="critical">
  <title>Native GitHub sub-issues</title>
  <when>Creating GitHub issues with parent-child relationships</when>
  <do>Use GraphQL `addSubIssue` mutation for native relationships</do>
  <never>Rely only on text links in descriptions (e.g., "Parent: #47")</never>
</rule>

<rule id="G002" priority="critical">
  <title>Required issue labels</title>
  <do>ALL issues MUST have one `type:*` label AND one `priority:*` label</do>
  <do>Optionally add `scope:*` labels for affected packages</do>

  <type-labels description="required - pick ONE">
    - type:bug - Bug or defect in existing functionality
    - type:enhancement - New feature or enhancement
    - type:debt - Technical debt that needs addressing
    - type:docs - Documentation improvements
    - type:refactor - Code refactoring without behavior change
    - type:test - Test coverage improvements
  </type-labels>

  <priority-labels description="required - pick ONE">
    - priority:critical - Must be fixed ASAP
    - priority:high - High priority
    - priority:medium - Medium priority
    - priority:low - Nice to have
  </priority-labels>

  <scope-labels description="optional - pick any that apply">
    - scope:core - rangelink-core-ts package
    - scope:vscode-ext - rangelink-vscode-extension package
    - scope:test-utils - rangelink-test-utils package
    - scope:tooling - Build tools, scripts, CI/CD
    - scope:docs - Documentation files
  </scope-labels>

  <avoid description="GitHub defaults - do not use">
    - bug, enhancement, duplicate, invalid, wontfix, question
    - good first issue, help wanted
  </avoid>
</rule>

<rule id="P001" priority="critical">
  <title>Arrow functions</title>
  <do>Use arrow functions for all new code: `const fn = (param: T): R => { ... }`</do>
  <exception>Class methods use method syntax</exception>
</rule>

<rule id="P002" priority="critical">
  <title>undefined over null</title>
  <do>Use `undefined` for absent values, not `null`</do>
  <rationale>TypeScript convention; lighter syntax with optional properties</rationale>
</rule>

<rule id="P003" priority="critical">
  <title>No magic numbers</title>
  <do>Define named constants for all numeric literals with semantic meaning</do>
  <do>Use SCREAMING_SNAKE_CASE for constant names</do>
</rule>

</critical-rules>

---

<autonomous-operations>

<allowed-actions>
<!-- Claude proceeds without asking permission for these -->
<action>Reading files - any project files for context</action>
<action>Running tests - `pnpm test`, `pnpm --filter pkg test`</action>
<action>Compiling - `pnpm compile`, `pnpm clean`, `tsc`</action>
<action>Git status - `git status`, `git log`, `git diff`</action>
<action>Searching code - grep, find, ripgrep</action>
<action>Installing deps - `pnpm install` after package.json changes</action>
<action>Formatting - `pnpm format:fix`</action>
<action>Linting - `pnpm lint:fix`</action>
<action>Reading docs - web searches, fetching official docs</action>
<action>Creating test files - always add tests for new features</action>
<action>Editing files - bug fixes, features, refactoring</action>
<action>Writing new files - when required (prefer editing existing)</action>
</allowed-actions>

<requires-permission>
<!-- Claude MUST ask before these -->
<action>Git commits - user reviews first</action>
<action>Publishing packages</action>
<action>Deleting files - unless clearly obsolete</action>
<action>Major architectural changes</action>
<action>External API calls - consuming third-party services</action>
<action>Changing dependencies - adding/removing in package.json</action>
<action>Modifying config - tsconfig.json, jest.config.js, etc.</action>
</requires-permission>

<default-behavior>
<behavior>Be proactive - if tests fail, investigate and fix without asking</behavior>
<behavior>Run verification - after changes, automatically run tests</behavior>
<behavior>Self-correct - if command fails, try alternatives</behavior>
<behavior>Provide context - explain actions but don't wait for routine approval</behavior>
<behavior>Use parallel operations - run independent commands concurrently</behavior>
</default-behavior>

</autonomous-operations>

---

<workflows>

<workflow id="questions">
  <title>Questions and Design Decisions</title>
  <location>.claude-questions/NNNN-description.txt</location>
  <extension>.txt (NOT .md)</extension>

  <process>
    1. Use Glob to find highest NNNN, increment by 1
    2. Create file with format below
    3. Print ONLY the filepath in terminal
    4. User edits answers in file
  </process>

  <file-format>
    ```
    # Question Topic

    ## Question 001: <question with options/recommendations>

    Answer: [prefilled recommended answer when available]

    ---

    ## Question 002: <question with options/recommendations>

    Answer: [prefilled recommended answer when available]
    ```

  </file-format>
</workflow>

<workflow id="commits">
  <title>Commit Messages</title>
  <location>.commit-msgs/NNNN-description.txt</location>
  <extension>.txt (NOT .md)</extension>

  <process>
    1. Use Glob to find highest NNNN, increment by 1
    2. Write commit message focusing on WHY, not WHAT
  </process>

  <format>
    ```
    <type>(scope): <short summary>

    <Body: Why this change? What problem does it solve?>

    Benefits:
    - Key benefit 1
    - Key benefit 2
    ```

  </format>

  <principles>
    - Keep concise (< 15 lines)
    - First line: conventional commit format
    - Body: 1-3 sentences of context
    - Omit file lists (redundant with diff)
    - NO line wrapping at 80 columns - use natural line breaks only
  </principles>

  <good-example>
    ```
    refactor(vscode-ext): separate dist/ and out/ to follow VSCode conventions

    Prevents "Cannot find module" errors by separating development and production builds.
    Following official conventions eliminates conflicts where tsc could overwrite esbuild's bundle.

    Benefits:
    - Impossible for tsc --watch to interfere with packaging
    - Standard convention matching VSCode templates
    ```

  </good-example>
</workflow>

<workflow id="scratchpads">
  <title>Working Documents</title>
  <location>.scratchpads/NNNN-description.txt</location>
  <extension>.txt</extension>

  <questions-trigger>
    <mandatory>If design questions arise, FIRST use workflow:questions to gather answers</mandatory>
    <sequence>
      1. Identify questions that need user input
      2. Create .claude-questions/ file using workflow:questions
      3. Wait for user answers
      4. Create/update scratchpad with resolved decisions inlined
    </sequence>
    <rationale>Questions workflow lets user edit answers in-file; scratchpad captures resolved state</rationale>
  </questions-trigger>

  <naming-pattern>
    Base pattern: `NNNN-description.txt`

    When working on a GitHub issue (branch matches `issues/<NUMBER>`):
    - Extract issue number from branch name
    - Use: `NNNN-issue-NUMBER-description.txt`
    - Example: `0008-issue-223-char-to-character.txt`

    When no issue context:
    - Use base pattern: `NNNN-description.txt`
    - Example: `0002-misplaced-tests-analysis.txt`

  </naming-pattern>

  <when-to-use>
    - PR descriptions being drafted
    - Implementation plans and analysis
    - Architecture decision exploration
    - GitHub issue drafts
    - Any temporary working document
  </when-to-use>

  <when-NOT-to-use>
    - Questions needing user answers → .claude-questions/
    - Commit messages → .commit-msgs/
    - Permanent documentation → docs/ or package READMEs
  </when-NOT-to-use>

  <code-references>
    <do>Use RangeLink-format links for all code references so they are clickable from within the scratchpad</do>
    <do>Use workspace-relative paths (from project root)</do>
    <never>Use plain text line references like "(lines 26-37)" or "Line 539"</never>
    <never>Wrap RangeLink links in backticks — backticks become part of the parsed path and break navigation</never>
    <format>path/to/file.ts#L10-L20 for ranges, path/to/file.ts#L10 for single lines</format>
    <bad-examples>
      - file.ts (lines 26-37)
      - Line 539 mentions "TextInserter"
      - `packages/rangelink-vscode-extension/src/file.ts#L26-L37` (backticks break the link)
    </bad-examples>
    <good-examples>
      - packages/rangelink-vscode-extension/src/file.ts#L26-L37
      - packages/rangelink-vscode-extension/src/file.ts#L539 mentions "TextInserter"
      - Remove the standalone logging tests at packages/.../file.test.ts#L54-L85
    </good-examples>
  </code-references>
</workflow>

<workflow id="creating-github-issues">
  <title>Creating GitHub Issues</title>
  <see-also>Rule G002 for required labels</see-also>

  <critical-rule>
    <title>No references to ephemeral files</title>
    <never>Reference .scratchpads/ or .claude-questions/ files in GitHub issue content</never>
    <rationale>These files are local/ephemeral and not accessible from GitHub</rationale>
    <do>Capture ALL relevant information directly in the issue body</do>
    <do>If scratchpad references a questions file, inline the decisions in the issue</do>
    <bad-example>`(from .claude-questions/0062)`</bad-example>
    <good-example>Inline the actual decisions with context</good-example>
  </critical-rule>

  <parent-child-issues>
    <do>Use GraphQL `addSubIssue` mutation for native relationships</do>
    <never>Rely only on text links in descriptions</never>
    <example>
      ```bash
      # Get node IDs
      PARENT_ID=$(gh api repos/:owner/:repo/issues/$PARENT_NUM --jq '.node_id')
      CHILD_ID=$(gh api repos/:owner/:repo/issues/$CHILD_NUM --jq '.node_id')

      # Link using native API
      gh api graphql -H "GraphQL-Features: sub_issues" -f query="
        mutation {
          addSubIssue(input: {issueId: \"$PARENT_ID\", subIssueId: \"$CHILD_ID\"}) {
            clientMutationId
          }
        }
      "
      ```
    </example>

  </parent-child-issues>
</workflow>

<workflow id="pr-review-comments">
  <title>Retrieving PR Review Comments</title>

  <when-to-use>
    - User shares a PR review URL like `https://github.com/owner/repo/pull/123#pullrequestreview-123456789`
    - Need to analyze reviewer feedback
  </when-to-use>

  <process>
    1. Extract the review ID from the URL (the number after `pullrequestreview-`)
    2. Use gh API to fetch the review:
       ```bash
       gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews/{review_id}
       ```
    3. Parse the JSON response - the `body` field contains the review content (text or markdown)
    4. Create a scratchpad with action plan based on feedback
  </process>

  <example>
    ```bash
    # URL: https://github.com/couimet/rangeLink/pull/215#pullrequestreview-3637523002
    gh api repos/couimet/rangeLink/pulls/215/reviews/3637523002
    ```
  </example>

  <response-fields>
    - `body`: Full review content (text or markdown - format varies by reviewer)
    - `state`: APPROVED, CHANGES_REQUESTED, COMMENTED
    - `user.login`: Reviewer username
    - `submitted_at`: Timestamp
  </response-fields>
</workflow>

</workflows>

---

<code-style>

<pattern name="arrow-functions">
  <do>Use arrow functions: `const fn = (param: T): R => { ... }`</do>
  <avoid>Traditional declarations: `function fn(param: T): R { ... }`</avoid>
  <exception>Class methods use method syntax</exception>
</pattern>

<pattern name="undefined-over-null">
  <do>`field: Type | undefined`</do>
  <avoid>`field: Type | null = null`</avoid>
  <rationale>TypeScript convention; implicit initialization is lighter</rationale>
</pattern>

<pattern name="no-magic-numbers">
  <do>
    ```typescript
    const MAX_LINK_LENGTH = 3000;
    if (link.length > MAX_LINK_LENGTH) { ... }
    ```
  </do>
  <avoid>
    ```typescript
    if (link.length > 3000) { ... }
    ```
  </avoid>
</pattern>

<pattern name="error-handling">
  <do>Use `Result<T, E>` type for functional error handling</do>
  <do>Internal validation functions throw; public APIs catch and return Result</do>
  <do>Use custom Jest matchers: `toBeOkWith`, `toBeErrWith`</do>
</pattern>

<pattern name="module-extraction">
  <when>
    - Function exceeds 50 lines, OR
    - Function has 3+ dependencies, OR
    - Logic mixes concerns (UI + business logic)
  </when>
  <locations>
    - /utils/ - pure utilities
    - /services/ - business logic
    - /src/ root - feature-specific
  </locations>
  <do>Apply SOLID principles; use arrow function exports with JSDoc</do>
</pattern>

<pattern name="facade-for-external-deps">
  <do>Wrap behaviors through adapter: `ideAdapter.showTextDocument()`</do>
  <do>Import constants/enums directly: `vscode.TextEditorRevealType.InCenterIfOutsideViewport`</do>
  <principle>Facades wrap behaviors, not types/constants</principle>
</pattern>

<pattern name="logging-optional-params">
  <do>Log at DEBUG level when using default vs provided values</do>
  <example>
    ```typescript
    if (delimiters === undefined) {
      logger.debug({ fn: 'parseLink' }, 'No delimiter config, using DEFAULT_DELIMITERS');
    } else {
      logger.debug({ fn: 'parseLink' }, 'Using provided delimiter config');
    }
    ```
  </example>
</pattern>

<pattern name="jsdoc-style">
  <do>Focus on WHAT and WHY - parameters, return types, behavioral notes</do>
  <never>Include @example blocks with code snippets</never>
  <rationale>Unit tests are the single source of truth for usage examples</rationale>
</pattern>

</code-style>

---

<testing>

<architecture>
  <principle>Maintain 99%+ test coverage</principle>
  <principle>Run full test suite before committing</principle>
  <principle>Add tests for all new features and bug fixes</principle>
  <principle>Use descriptive test names that explain the scenario</principle>
</architecture>

<test-planning>
  <do>Use test-scope-fixer agent when planning or reviewing tests</do>
  <questions-to-ask>
    1. Are tests properly scoped (unit vs integration)?
    2. Should dependencies be mocked or use real implementations?
    3. Are tests testing implementation details?
    4. Recommendations for proper test architecture?
  </questions-to-ask>
</test-planning>

<presentation-layer-testing>
  <principle>Mock all dependencies to isolate component under test</principle>
  <principle>Test only orchestration logic (how component delegates)</principle>
  <principle>Avoid testing implementation details of delegated utilities</principle>
  <principle>Add 2-3 integration tests separately to verify mocks work</principle>

  <good-example description="Mock handler completely">
    ```typescript
    const createMockHandler = (): jest.Mocked<Handler> => ({
      getPattern: jest.fn(() => TEST_PATTERN),
      parseLink: jest.fn(),
    }) as unknown as jest.Mocked<Handler>;

    it('should delegate parsing to handler', () => {
      mockHandler.parseLink.mockReturnValue(Result.ok(mockParsed));
      provider.provideDocumentLinks(document, token);
      expect(mockHandler.parseLink).toHaveBeenCalledWith('src/file.ts#L10');
    });
    ```

  </good-example>

  <bad-example description="Using real handler in unit tests">
    ```typescript
    // DON'T: Tests verify handler implementation, not provider orchestration
    const handler = new RangeLinkNavigationHandler(delimiters, mockLogger);
    provider = new RangeLinkTerminalProvider(handler, mockLogger);
    ```
  </bad-example>
</presentation-layer-testing>

<custom-matchers>

  <matcher name="toThrowRangeLinkError">
    <when>Testing functions that throw errors</when>
    <example>
      ```typescript
      expect(() => validateInputSelection(input)).toThrowRangeLinkError({
        code: RangeLinkErrorCodes.SELECTION_EMPTY,
        message: 'Selections array must not be empty',
        functionName: 'validateInputSelection',
      });
      ```
    </example>
  </matcher>

  <matcher name="toBeRangeLinkErrorErr">
    <when>Testing Result-returning functions</when>
    <example>
      ```typescript
      const result = computeRangeSpec(input);
      expect(result).toBeRangeLinkErrorErr('SELECTION_EMPTY', {
        message: 'Selections array must not be empty',
        functionName: 'validateInputSelection',
      });
      ```
    </example>
  </matcher>

</custom-matchers>

<spy-verification>
  <do>Always verify jest.spyOn() calls were made with exact parameters</do>
  <example>
    ```typescript
    const spy = jest.spyOn(module, 'fn').mockImplementation(...);
    myFunction(input);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(input);
    ```
  </example>
</spy-verification>

<error-testing>
  <do>Extract error objects as test-scoped constants</do>
  <example>
    ```typescript
    const expectedError = new TypeError('Unexpected validation error');
    jest.spyOn(module, 'fn').mockImplementationOnce(() => { throw expectedError; });
    expect(() => myFunction()).toThrow(expectedError);
    ```
  </example>
  <rationale>Asserts on type + message + reference equality</rationale>
</error-testing>

</testing>

---

<documentation>

<changelog>
  <rule>Never modify past releases - CHANGELOGs are historical records</rule>
  <do>Add new entries to [Unreleased] section only</do>
  <never>Edit content under versioned headers like `## [1.0.0]` or `## [0.5.0]`</never>
  <rationale>Past releases document what shipped; rewriting history misleads users</rationale>
</changelog>

<cross-references>
  <before-renaming>Search for incoming references: `grep -r "Section Name" docs/`</before-renaming>
  <link-pattern>Use relative links with anchors: `[text](./FILE.md#section-anchor)`</link-pattern>
  <anchor-format>GitHub: lowercase, spaces → hyphens, special chars removed</anchor-format>
  <when-breaking-link>Update all incoming references in same commit</when-breaking-link>
</cross-references>

</documentation>

---

<project-context>
  <name>RangeLink</name>
  <tagline>One keybinding. Precise references. Any AI assistant or tool.</tagline>
  <description>
    Unified code sharing for AI-assisted development. One keybinding works with
    Claude Code, Cursor AI, Copilot, terminal tools - learn once, use everywhere.
    Character-level precision with GitHub-style universal format.
  </description>
  <tech-features>
    - Multiple editors (VSCode, Cursor)
    - Multiple selection types (Normal, Rectangular)
    - Paste destinations (auto-send to AI tools)
    - Clickable navigation (jump to code from links)
  </tech-features>
</project-context>

---

<file-placement-decision-tree>
```
Is it a question needing user answer? → .claude-questions/NNNN-description.txt
Is it a commit message draft?        → .commit-msgs/NNNN-description.txt
Is it a temporary working document?  → .scratchpads/NNNN-description.txt
Is it a note during issue work?      → /breadcrumb command (creates .breadcrumbs/<ISSUE>.md)
Is it permanent documentation?       → docs/ or package README
```
</file-placement-decision-tree>
