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
  <do>Follow the `/question` skill for file format, location, and naming conventions</do>
  <never>Print questions directly in terminal output</never>
</rule>

<rule id="C001" priority="critical">
  <title>Commit messages go to file</title>
  <do>Follow the `/commit-msg` skill for file format, location, and naming conventions</do>
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
  <do>Follow the `/scratchpad` skill for file format, location, and naming conventions</do>
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

<rule id="T008" priority="critical">
  <title>Use custom matchers for Result and error assertions</title>
  <do>Use `toBeRangeLinkExtensionErrorErr(code, { message, functionName, details? })` for error Result assertions</do>
  <do>Use `toBeOkWith((value) => { expect(value).toStrictEqual({...}) })` for success Result assertions</do>
  <do>Use `toStrictEqual()` on the full value object inside `toBeOkWith` callbacks — never pick individual properties</do>
  <never>Use `result.success` + `if` guard patterns to manually unwrap Result types</never>
  <available-matchers>
    - `toBeOk()` / `toBeErr()` - simple success/error check
    - `toBeOkWith(callback)` - success with value assertion
    - `toBeErrWith(callback)` - error with assertion
    - `toBeRangeLinkExtensionErrorErr(code, expected)` - error Result with full RangeLinkExtensionError validation
    - `toThrowRangeLinkExtensionError(code, expected)` - sync throw
    - `toThrowRangeLinkExtensionErrorAsync(code, expected)` - async throw
  </available-matchers>
  <bad-example>
    ```typescript
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DESTINATION_NOT_BOUND');
      expect(result.error.message).toBe('No destination is currently bound');
    }
    ```
  </bad-example>
  <good-example>
    ```typescript
    expect(result).toBeRangeLinkExtensionErrorErr('DESTINATION_NOT_BOUND', {
      message: 'No destination is currently bound',
      functionName: 'PasteDestinationManager.focusBoundDestination',
    });

    expect(result).toBeOkWith((value: BindSuccessInfo) => {
      expect(value).toStrictEqual({ destinationName: 'Terminal', destinationKind: 'terminal' });
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

<rule id="P004" priority="critical">
  <title>No direct vscode.* behavior calls — use ideAdapter</title>
  <do>Call behavior methods through `ideAdapter`: `ideAdapter.showTextDocument()`, `ideAdapter.sendText()`</do>
  <do>Import constants/enums directly: `vscode.TextEditorRevealType.InCenterIfOutsideViewport`</do>
  <never>Call `vscode.window.*` or `vscode.workspace.*` behavior methods directly when an adapter method exists</never>
  <exception>Bootstrap code that runs before the adapter is created (e.g., `vscode.window.createOutputChannel`)</exception>
  <principle>Facades wrap behaviors, not types/constants</principle>
  <rationale>Direct calls bypass the adapter abstraction, making code harder to test and inconsistent with the rest of the codebase</rationale>
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

<integration-test-convention>
  <principle>Files named `*.integration.test.ts` in `__tests__/` are Jest tests that use real module compositions instead of full mocking</principle>
  <principle>These are distinct from `__integration-tests__/` which are VS Code extension tests run via `test:release`</principle>
  <scripts>
    - `test` — runs ALL Jest tests (unit + integration), unchanged default
    - `test:fast` — excludes `*.integration.test.ts` files for a quick feedback loop during development
    - `test:release` — runs VS Code extension integration tests (separate concern, separate runner)
  </scripts>
  <naming>Use `*.integration.test.ts` suffix for tests that exercise real module compositions with minimal mocking (e.g., real `formatMessage()`, real `toInputSelection()`)</naming>
  <placement>Co-locate with the unit test file: `Foo.test.ts` → `Foo.integration.test.ts` in the same directory</placement>
</integration-test-convention>

<release-test-requirement>
  <rule>Any change to files in `packages/rangelink-vscode-extension/qa/` or `packages/rangelink-vscode-extension/src/__integration-tests__/` MUST be validated by running `pnpm test:release`</rule>
  <reason>The QA validator script only checks ID matching — it does not execute the tests. Only `test:release` compiles the extension and runs integration tests in a real VS Code host, which is the only way to verify that log-based assertions and command behavior actually work.</reason>
  <command>`pnpm test:release` (compiles the extension, launches VS Code host, runs integration tests, then runs QA validator — all in one command)</command>
</release-test-requirement>

</testing>

---

<documentation>

<changelog>
  <rule>Never modify past releases - CHANGELOGs are historical records</rule>
  <do>Add new entries to [Unreleased] section only</do>
  <never>Edit content under versioned headers like `## [1.0.0]` or `## [0.5.0]`</never>
  <rationale>Past releases document what shipped; rewriting history misleads users</rationale>
</changelog>

<unreleased-markers>
  <rule>When documenting unreleased features in README, add `<sup>Unreleased</sup>` markers</rule>
  <mark>New section headers (features, settings)</mark>
  <mark>New rows in command/setting tables</mark>
  <mark>A `> [!IMPORTANT]` banner at the top of the README if one doesn't exist yet</mark>
  <skip>Cosmetic renames or rewording of existing features — only mark genuinely new functionality</skip>
  <see>docs/RELEASE-STRATEGY.md § Trunk-Based Documentation</see>
</unreleased-markers>

<cross-references>
  <before-renaming>Search for incoming references: `grep -r "Section Name" docs/`</before-renaming>
  <link-pattern>Use relative links with anchors: `[text](./FILE.md#section-anchor)`</link-pattern>
  <anchor-format>GitHub: lowercase, spaces → hyphens, special chars removed</anchor-format>
  <when-breaking-link>Update all incoming references in same commit</when-breaking-link>
</cross-references>

</documentation>

---

<qa-yaml>

<rule id="QA001" priority="critical">
  <title>Never renumber existing QA test case IDs</title>
  <do>Keep existing IDs stable across QA runs so results are comparable apples-to-apples</do>
  <never>Renumber, reorder, or reassign existing TC IDs — even to "fill gaps"</never>
  <rationale>QA results reference IDs by name; renumbering breaks traceability between runs</rationale>
</rule>

<rule id="QA002" priority="critical">
  <title>QA YAML files are a journal — copy-forward, never edit in place</title>
  <do>Copy the latest QA YAML file to a new version-suffixed file (e.g., `qa-test-cases-v1.1.0-001.yaml`), then append new TCs to the copy</do>
  <do>Update the header and `generate:qa-issue` filename reference in the new copy</do>
  <never>Edit a previous QA YAML file to add, remove, or reorder test cases</never>
  <exception>Fixing typos or updating `automated: true/false` status in an existing file is allowed</exception>
  <rationale>Each file is a point-in-time snapshot; diffing consecutive files shows exactly what was added between QA cycles</rationale>
</rule>

<rule id="QA003" priority="critical">
  <title>TC IDs are globally unique across all QA YAML files</title>
  <do>Check all existing YAML files in `qa/` for the highest ID in the same `<feature-slug>` before assigning new numbers</do>
  <never>Reuse an ID that appears in any QA YAML file for the same version</never>
</rule>

<rule id="QA004" priority="critical">
  <title>No gaps in TC ID sequences</title>
  <do>When appending TCs to a journal snapshot, continue from the highest existing ID in that feature slug (e.g., if `bind-to-destination-010` exists, the next is `bind-to-destination-011`)</do>
  <never>Skip numbers or leave gaps in the sequence</never>
  <rationale>Gaps make it ambiguous whether a TC was deleted or never existed</rationale>
</rule>

<rule id="QA005" priority="critical">
  <title>`automated` field requires a matching integration test on the branch</title>
  <do>The `automated` field accepts three values: `true` (fully automated), `assisted` (human-in-the-loop), `false` (fully manual)</do>
  <do>When marking a TC `automated: true`, ensure a non-`[assisted]` integration test exists in `src/__integration-tests__/suite/` on the same branch</do>
  <do>When marking a TC `automated: assisted`, ensure an `[assisted]`-tagged integration test exists in `src/__integration-tests__/suite/` on the same branch. See TESTING.md § "Assisted mode" for the `[assisted]` tag convention.</do>
  <do>Use `automated: false` for scenarios that can't be integration-tested at all (e.g., requires AI assistant interaction, platform-specific behaviour). See TESTING.md § "QuickPick limitation" for what can and cannot be automated.</do>
  <never>Mark `automated: true` or `automated: assisted` based on unit tests alone — the validator only checks integration tests</never>
  <see>packages/rangelink-vscode-extension/scripts/validate-qa-coverage.sh</see>
</rule>

<rule id="QA006" priority="critical">
  <title>TC IDs are a shared contract — rename both sides</title>
  <do>When renaming a TC ID in QA YAML or integration tests, update ALL occurrences in both `qa/*.yaml` (latest file only) and `src/__integration-tests__/suite/*.test.ts`</do>
  <do>After any TC ID rename, run `./scripts/validate-qa-coverage.sh` to confirm no mismatches</do>
  <do>Before committing, grep for the old ID: `grep -r "old-id" qa/ src/__integration-tests__/`</do>
  <never>Rename a TC ID in only one location — partial renames cause false-positive validator matches</never>
  <rationale>The validator regex extracts slug-NNN patterns; if YAML and test IDs diverge, the validator may silently match the wrong entry</rationale>
</rule>

<rule id="QA007" priority="critical">
  <title>TC IDs use domain-based naming, not origin-based</title>
  <do>Name TC IDs by feature domain: `link-navigation-001`, `text-editor-destination-001`, `smart-padding-001`</do>
  <never>Prefix TC IDs with `bugfix-`, `feature-`, `changed-`, or other origin/changelog-category prefixes</never>
  <rationale>TCs describe what is tested, not why it was added; domain grouping survives across releases</rationale>
</rule>

</qa-yaml>

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
    - Destinations (auto-send to AI tools)
    - Clickable navigation (jump to code from links)
  </tech-features>
</project-context>
