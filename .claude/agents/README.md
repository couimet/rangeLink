# Custom Claude Code Agents

This directory contains custom subagents for the RangeLink project.

## Available Agents

### test-scope-fixer

**Purpose**: Detects and fixes badly scoped tests that test implementation details instead of mocking delegated utility functions.

**When to use**: When you have test files that directly test the behavior of utility functions instead of mocking them and testing only the delegation logic.

**Usage**:

```
Task(subagent_type="test-scope-fixer", prompt="Analyze <test-file-path>")
```

**Workflow**:

1. **Phase 1 (Analysis)**: Agent analyzes tests, identifies badly scoped ones, checks utility test coverage, and presents a detailed refactoring plan
2. **User reviews and approves** the plan
3. **Phase 2 (Refactoring)**: Agent applies the changes (adds mocks, removes badly scoped tests, adds properly scoped tests)
4. **Phase 3 (Report)**: Agent runs tests and reports results

**Key Features**:

- Detects tests that verify utility function implementation details
- Checks for coverage gaps in utility test files
- Uses `jest.mock()` for module-level mocking
- Uses `jest.spyOn()` for per-test customization
- Ensures each test asserts on mock calls (delegation verification)
- Runs tests after refactoring to verify correctness

### tc-implement

**Purpose**: Implements one QA TC ID end-to-end as an integration test. Traces the production code path, writes the test using `__integration-tests__/helpers/`, inserts in TC-ID ascending order in the right `suite/` file, updates the YAML entry's `automated:` field, and runs the matching `pnpm test:release:*` command.

**When to use**: When you have a QA TC ID that needs an integration test. Works for any `automated:` value (`false`, `assisted`, or `true` — the last is useful for re-implementing a test file that was lost). Typical workflow: `/tcs-definition` (skill) drafts a batch of TCs in a scratchpad; `tc-implement` (agent) is invoked once per TC for short feedback loops.

**Usage**:

```
Task(subagent_type="tc-implement", prompt="bind-to-destination-013")
```

**Workflow**:

1. **Validate**: reads the TC entry from `qa-test-cases.yaml`; rejects unknown IDs.
2. **Trace**: identifies the picker / command / adapter mutation path and the logged-field shape.
3. **Build**: assembles the test using the gold-standard `assert.deepStrictEqual` shape (terminal/file/overflow items).
4. **Resolve target file**: by neighbor TC-ID (slug-to-file is NOT 1:1); falls back to camelCase slug for new files.
5. **Insert**: maintains ascending TC-ID order within the file.
6. **Extend helpers**: adds new primitives to `helpers/<topic>.ts` when missing rather than inlining.
7. **Update YAML**: switches `automated:` to `true` or `assisted` based on `waitForHuman*` use; drops `preconditions:` and `steps:` (compact template).
8. **Run pnpm**: picks `:grep` / `:with-extensions --grep` / `:automated` based on the TC's `labels:` and `automated:` value.
9. **Iterate or report**: one retry on failure, then reports pass/fail with details.

**Key Features**:

- Repeats T011, T016, T017 for self-containment (canonical rules in CLAUDE.md). Houses the release-test command reference. General test rules T009, T010, T012, T013, T014, T015 stay in CLAUDE.md only.
- Encodes the two conventions from issue #650 thread: no redundant negative log-scraping (the framework asserts that by default), and prefer end-to-end assertions over middle-layer log-scraping.
- Handles non-1:1 slug-to-file mappings by neighbor lookup with explicit tie-breakers.
- For the granted tool list, see the agent's frontmatter — this README does not duplicate it.

---

## Related Skills

### tcs-definition

**Purpose**: Interview-driven skill that drafts new QA test cases for the current `issues/<ID>` branch. Reads the active-plan note, issue body, parent issue, related YAML entries, and any partial diff; drafts initial suggestions; then runs targeted `AskUserQuestion` rounds for edge cases.

**When to use**: As a step inside `/start-issue` plans, before implementation begins. The output is a scratchpad with paste-ready YAML and a list of TC IDs to hand to `tc-implement`.

**Usage**: `/tcs-definition` (zero-argument).

### qa-suggest

**Purpose**: CHANGELOG-driven (`[Unreleased]` entries) TC suggester. Diffs CHANGELOG against the current YAML and scans integration tests to draft new entries.

**When to use**: At release time, when CHANGELOG `[Unreleased]` has accumulated entries that may not yet have TCs.

**Usage**: `/qa-suggest` (zero-argument).

The three pieces compose: `tcs-definition` runs at issue-start (spec-driven), `tc-implement` runs per-TC during implementation, `qa-suggest` runs at release-time as a backstop.

## How Agents Work

**Accessing agents**:

- Use the `/agents` command to list available agents
- Invoke with `Task(subagent_type="agent-name", ...)`

## Testing New Agents

After creating a new agent file:

1. **Verify file structure**: Ensure YAML frontmatter is correct
2. **Restart Claude Code session**: Agents may need session reload
3. **List agents**: Run `/agents` to verify it's detected
4. **Test with simple prompt**: Start with basic usage to verify behavior

## Agent Development Tips

1. **Clear descriptions**: Use natural language that explains WHEN to use the agent
2. **Focused tools**: Only grant tools the agent actually needs
3. **Structured workflow**: Break complex tasks into numbered phases
4. **Wait for approval**: For destructive operations, always present a plan first
5. **Detailed reports**: Show what changed, why, and any issues found
6. **Handle edge cases**: Document how agent handles missing files, ambiguous cases, etc.
