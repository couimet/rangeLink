# Testing RangeLink VS Code Extension

> **Note:** This guide covers testing the RangeLink VS Code extension. For development workflow (F5 debugging, local install), see [DEVELOPMENT.md](./DEVELOPMENT.md). For publishing, see [PUBLISHING.md](./PUBLISHING.md).

---

## Quick Reference

| Test type                | Command                                                       | When to run                        | Runs in CI           |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------- | -------------------- |
| Unit tests               | `pnpm test`                                                   | Every change                       | ✅                   |
| Unit tests (watch)       | `pnpm test:watch` (from extension dir)                        | During active development          | —                    |
| Coverage report          | `pnpm test:coverage` (from extension dir)                     | Before PR / on demand              | ✅ (with thresholds) |
| Integration tests        | `pnpm test:release`                                           | Before PR, after feature work      | —                    |
| Integration (CI-safe)    | `pnpm test:release:automated`                                 | CI / headless environments         | ✅                   |
| Integration (extensions) | `pnpm test:release:with-extensions`                           | Tests needing real AI extensions   | ✅                   |
| Integration (filter)     | `pnpm test:release:grep "<pattern>"`                          | Run specific TCs by ID or suite    | —                    |
| Ubuntu manual QA         | `pnpm test:release:ubuntu`                                    | Manual QA of Ctrl+R keybindings    | —                    |
| Cursor manual QA         | `pnpm test:release:cursor`                                    | Manual QA of Cursor IDE TCs        | —                    |
| Prepare QA test plan     | `pnpm generate:qa-test-plan:vscode-extension`                 | Start of release cycle             | —                    |
| Generate QA issue        | `pnpm generate:qa-issue:vscode-extension`                     | At the start of each release cycle | —                    |
| Local QA checklist       | `pnpm generate:qa-issue:vscode-extension -- --local`          | Offline QA / before manual pass    | —                    |
| Validate QA coverage     | `pnpm validate:qa-coverage:vscode-extension`                  | After adding integration tests     | ✅                   |
| Release testing guide    | `pnpm generate:release-testing-instructions:vscode-extension` | Start of release cycle             | —                    |
| Verify all QA scripts    | `pnpm verify:qa-scripts:vscode-extension`                     | After QA script changes            | —                    |

All commands run from the project root unless noted.

All `test:release*` commands accept `--label <tag>` (include TCs with QA YAML label, repeatable), `--exclude-label <tag>` (exclude TCs with label, repeatable), `--assisted` (limit to `automated: assisted` TCs), and `--exclude-assisted` (limit to `automated: true` TCs). See [Label-based filtering](#label-based-filtering-with---label) below.

---

## Testing Lifecycle

### Release QA Cycle (once per release)

| Script                                     | When                               | Re-runnable?      | What it does                                                                                    |
| ------------------------------------------ | ---------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm lock-version:vscode-extension X.Y.Z` | Ready to start QA                  | Yes (idempotent)  | Renames QA YAML → versioned, bumps `.version`, regenerates instructions                         |
| `pnpm finalize-release:vscode-extension`   | QA passed, ready to ship           | No (one-way door) | Finalizes CHANGELOG, strips README markers/banner, generates publishing instructions            |
| `pnpm start-release:vscode-extension`      | After publish, starting next cycle | Yes (idempotent)  | Copies versioned YAML → unreleased, adds `[Unreleased]` CHANGELOG header, re-adds README banner |

```mermaid
flowchart TD
    A[Version: Unreleased (deferred)] --> B[lock-version.sh X.Y.Z]
    B --> C[QA pass — manual + automated TCs]
    C --> D{All TCs pass?}
    D -- No --> E[Fix bugs]
    E --> C
    D -- Yes --> F[finalize-release.sh]
    F --> G[build VSIX + publish]
    G --> H[start-release.sh]
    H --> A
```

---

## Integration Tests (VS Code Extension Host)

> **Note:** Integration test files (`src/__integration-tests__/`) are excluded from the Jest unit test run — they require the VS Code extension host and are covered by `pnpm test:release`.

### What they cover

Integration tests run inside a real VS Code process via `@vscode/test-cli`. They validate behaviour that cannot be tested with mocks: command registration, clipboard interaction, navigation, document link detection, and terminal binding.

### Running locally

```bash
# From packages/rangelink-vscode-extension/
pnpm test:release
```

### QuickPick and InputBox dismissal

VS Code's extension host test runner provides no API to programmatically select QuickPick items or interact with dialogs. However, `workbench.action.closeQuickOpen` can programmatically dismiss QuickPicks and InputBoxes — meaning tests that open a picker, read its logged content, and dismiss it **can now be fully automated**.

**`openAndDismiss` helper:** The pattern for automated picker-open-and-dismiss is encapsulated in `openAndDismiss(command)`:

```typescript
// Fires the command (which opens a QuickPick), waits for render + log emission,
// dismisses with closeQuickOpen, then settles.
await openAndDismiss(CMD_BIND_TO_DESTINATION);
const items = extractQuickPickItemsLogged(logCapture.getLinesSince('before-test'));
// assert on items as usual
```

**Workaround — command bypass:** TCs that use a picker as a means to an end (e.g., "bind via picker, verify toast") can be automated by calling the underlying command directly (`rangelink.bindToTerminalHere`, `rangelink.bindToTextEditorHere`) to bypass the picker entirely.

**What still requires assisted mode:** TCs that need to:

- Select a specific item from a picker (closeQuickOpen only dismisses, it cannot choose)
- Navigate a multi-picker flow (select item in picker A → picker B opens → verify B's content)
- Verify dialog interactions (confirmation buttons with Yes/No)

Mark these `automated: assisted` in the QA YAML. See [Assisted mode](#assisted-mode-assisted-tests) below. Only TCs that genuinely cannot be tested even with human-in-the-loop assistance should remain `automated: false`.

See https://github.com/couimet/rangeLink/issues/483 for the full triage of automatable vs manual TCs.

### Assisted mode (`[assisted]` tests)

Tests tagged `[assisted]` in their name automate setup and validation but pause for a human to perform UI actions that the extension host cannot control (QuickPick interaction, dialog buttons, visual verification). A persistent VS Code notification shows the instruction text; the tester clicks Cancel to signal completion and resume the test.

**Two scripts, two modes:**

| Script                        | What runs                            | Timeout    | Use case                      |
| ----------------------------- | ------------------------------------ | ---------- | ----------------------------- |
| `pnpm test:release`           | All tests (automated + `[assisted]`) | 5 min/test | Human at screen — QA sessions |
| `pnpm test:release:automated` | Automated only (excludes assisted)   | 20 s/test  | CI / headless environments    |

All modes are handled by a single `scripts/run-integration-tests.sh` with different flags. Filtering resolves through the QA YAML via `resolve-qa-labels.js` — no string matching on test names. The `--automated` flag selects the automated config (`.vscode-test.automated.mjs`, 20 s timeout) and resolves to `automated: true` TC IDs from the YAML.

**Filtering with `test:release:grep`:**

```bash
# Single TC by ID
pnpm test:release:grep "status-bar-menu-002"

# Multiple TCs (regex OR)
pnpm test:release:grep "status-bar-menu-002|status-bar-menu-005"

# All TCs in a suite (matches suite name)
pnpm test:release:grep "R-M Status Bar Menu"

# Only assisted tests
pnpm test:release --assisted
```

Runs from the project root or extension directory. Compiles first, then runs only matching tests. The `validate:qa-coverage` step is intentionally skipped when filtering — it expects the full suite.

**Output capture and failed-test rerun:**

All `test:release*` commands capture output to timestamped files in `qa/output/` (e.g., `qa/output/test-run-20260328-141328-grep-assisted-file-picker.txt`). The report file path is printed at the start and end of each run. Output streams incrementally — partial reports are preserved if the run is interrupted.

When tests fail, the script extracts failed TC IDs and prints a ready-to-use rerun command:

```text
Re-run failed tests:
  ./scripts/run-integration-tests.sh --grep "file-picker-002|file-picker-003"
```

### Label-based filtering with `--label`

The `--label` flag resolves test IDs from QA YAML labels and builds a Mocha grep pattern. Labels in the YAML are multi-line lists under each test case:

```yaml
- id: clipboard-preservation-001
  labels:
    - clipboard
  automated: true
```

Common flag combinations:

```bash
# All tests with a given label (any automated status — true, assisted, or false)
pnpm test:release --label clipboard

# Label + assisted-only (human-in-the-loop tests only)
pnpm test:release --label clipboard --assisted

# Label + exclude assisted (CI-safe, automated: true tests only)
pnpm test:release --label clipboard --exclude-assisted

# Label + assisted + real AI extensions (e.g., Claude Code)
pnpm test:release:with-extensions --label clipboard --assisted

# Label combined with an explicit --grep pattern (AND — both must match)
pnpm test:release:grep "cold-paste" --label clipboard --assisted

# Exclude extension-requiring tests
pnpm test:release:automated --exclude-label requires-extensions
```

When `--assisted` is passed, only TCs marked `automated: assisted` are included. When `--exclude-assisted` is passed, only TCs marked `automated: true` are included. Without either, all matching TCs run regardless of their `automated` status.

`--label` resolves from the latest QA YAML in `qa/`. Multiple `--label` values are OR-combined (union of all matching TCs). `--label` combines with `--grep` via AND — both conditions must match the test title. `--exclude-label` subtracts TCs from the include set. The `validate:qa-coverage` step is skipped when filtering (same as `--grep` filtering), since it expects the full suite.

**Adding new assisted tests:**

1. Add the test to the relevant themed file in `src/__integration-tests__/suite/` — do not create a separate directory.
2. Prefix the test name with `[assisted]`: `test('[assisted] my-tc-id: description', ...)`.
3. Call `printAssistedBanner()` in `suiteSetup()` if this is the first `[assisted]` test in the suite.
4. Use `waitForHuman(tcId, action, consoleSteps)` or `waitForHumanVerdict(tcId, action, consoleSteps)` to pause for human input — see [Choosing between waitForHuman and waitForHumanVerdict](#choosing-between-waitforhuman-and-waitforhumanverdict) below for when to use each.
5. Add assertions after `waitForHuman` returns (log-based, clipboard, etc.).
6. Clean up in `teardown`/`suiteTeardown` — close editors, dispose terminals, delete temp files.

**Two-screen workflow:** Run `pnpm test:release` in a terminal on one screen. The VS Code test host opens on the other. Instructions appear in both the terminal (structured steps) and as a persistent notification in VS Code (flowing summary). Perform the action, click Cancel on the notification, and the test continues.

### Choosing between waitForHuman and waitForHumanVerdict

The two helpers serve different contracts. Pick the right one based on what the test asserts.

**`waitForHuman`** — use when the human performs a UI action that cannot be automated, and programmatic assertions verify the outcome. The human's role is mechanical (open a picker, press a chord, click a context menu). Clicking Cancel without performing the action causes the subsequent programmatic assertions to fail — the test cannot pass green against a broken state.

Examples of correct `waitForHuman` usage:

- Human selects an item from a QuickPick; log assertions verify the picked item and the effect
- Human right-clicks a context menu; assertions read the terminal buffer or editor content
- Human types text into an input box; assertions verify navigation or log output

**`waitForHumanVerdict`** — use when the human's eye IS the assertion. The human observes a visible outcome (content arriving in a webview, a UI element appearing/disappearing, clipboard content after paste) and clicks PASS or FAIL. Always assert on the verdict:

```typescript
const verdict = await waitForHumanVerdict('tc-id', 'Did X appear?', ['step 1', 'step 2']);
assert.strictEqual(verdict, 'pass', 'Human reported X did not appear');
```

Examples of correct `waitForHumanVerdict` usage:

- Verifying a RangeLink appeared in Claude Code / Cursor AI / Copilot Chat (webviews are not inspectable)
- Verifying clipboard was restored after paste to an AI assistant (human checks via manual paste)
- Verifying a UI element is visible/hidden when no programmatic signal exists

**Warmup pattern** — when a test needs a warm send before the actual verdict (warm paste tests), use `waitForHuman` for the warmup step and `waitForHumanVerdict` for the verdict step. The warmup is setup, not assertion — the verdict covers the test contract.

---

## CI Pipeline

CI runs automatically on every pull request and on pushes to `main`. The job is defined in `.github/workflows/ci.yml`.

### Job: Test & Validate (`ubuntu-latest`)

Steps run in this order:

| Step                         | What it does                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Setup Node.js and pnpm       | Installs the Node version from `.nvmrc` via the `setup-node-pnpm` composite action             |
| Install dependencies         | Runs `pnpm install` via the `install-deps` composite action                                    |
| Check formatting and linting | Runs Prettier and ESLint via `check-formatting`                                                |
| Run tests with coverage      | Runs `pnpm test` (all packages) with coverage thresholds enforced                              |
| Run integration tests        | Runs `pnpm test:release:automated` under Xvfb via the `run-integration-tests` composite action |
| Check TODOs/FIXMEs           | Counts or diffs `TODO`/`FIXME` comments; on PRs, fails if new ones are introduced              |

---

## Manual QA Environments

Some TCs are marked `automated: false` with a `non_automatable_reason` because they require a specific platform or IDE that cannot be tested in the standard extension host. The scripts below launch dedicated environments for these TCs.

### Ubuntu (Ctrl+R keybindings)

`platform-specific` TCs require a Linux environment where `Ctrl` (not `Cmd`) is the primary modifier key. The provided Docker container runs Ubuntu 24.04 with XFCE desktop, VS Code, and the extension's repo mounted at `/workspace`.

**Prerequisites:** Docker Desktop (or Docker Engine) installed and running.

```bash
# Builds image on first run (or after Dockerfile changes: docker build -t rangelink-qa-ubuntu -f docker/Dockerfile.ubuntu .)
pnpm test:release:ubuntu
```

The container opens a noVNC web desktop at http://localhost:6080/vnc.html. Open a terminal inside the desktop, run the extension tests, or manually verify `Ctrl+R` keybinding variants against the fixture workspace at `/workspace/packages/rangelink-vscode-extension/qa/fixtures/workspace`.

The Dockerfile is at `docker/Dockerfile.ubuntu`. VS Code is installed from the Microsoft apt repo.

### Cursor (IDE-specific tests)

`ide-specific` TCs require Cursor IDE. These can only be verified manually — Cursor has no headless extension host mode for third-party extensions.

```bash
pnpm test:release:cursor
```

Builds the extension, installs it in Cursor, prints the Cursor-specific TCs to verify, then launches Cursor. Any workspace works — the fixture is just a convenience with a few file types ready.

The `cursor` CLI must be on your PATH. If it's not, install it from Cursor's command palette: `Cmd+Shift+P` → "Install 'cursor' command".

---

## QA Test Plan

The QA test plan is a version-scoped YAML file that tracks both automated and manual test cases for a given release cycle.

### File location and naming

```text
qa/qa-test-cases-unreleased.yaml
```

During trunk-based development the file is `qa/qa-test-cases-unreleased.yaml`. At release time `pnpm lock-version:vscode-extension` renames it to `qa/qa-test-cases-v<version>.yaml`.

The filename is always `qa-test-cases-unreleased.yaml` during trunk-based development — the version is deferred until `pnpm lock-version:vscode-extension` locks it in at QA time. It is parsed automatically by the `generate-qa-issue` script — no extra flags needed. One file per release — Git tracks history across versions.

New QA YAML files are created by `pnpm generate:qa-test-plan`. The script carries forward all TCs from the most recent YAML, resets `status:` fields to `pending`, and preserves `automated:` flags.

### The `automated` field

Each test case has an `automated` field with three possible values:

| Value      | Meaning                                                | Covered by                                  | Runs in CI |
| ---------- | ------------------------------------------------------ | ------------------------------------------- | ---------- |
| `true`     | Fully automated, no human needed                       | `test:release:automated` and `test:release` | Yes        |
| `assisted` | Automated setup + validation, human performs UI action | `test:release` only (human at screen)       | No         |
| `false`    | Fully manual, no integration test exists               | Manual QA checklist                         | No         |

- `automated: true` — covered by a non-`[assisted]` integration test in `src/__integration-tests__/suite/`. Runs on every CI push.
- `automated: assisted` — covered by an `[assisted]`-tagged integration test. The test automates setup and validation but pauses for a human to perform a UI action (QuickPick verification, dialog interaction). See [Assisted mode](#assisted-mode-assisted-tests) above.
- `automated: false` — must be executed manually. Reasons include: requires AI assistant interaction, requires platform-specific behaviour, or cannot be tested even with human-in-the-loop assistance.

When you implement an integration test for a TC, update its `automated` field to `true` or `assisted` in the YAML.

#### `preconditions:` and `steps:` are only on manual TCs

`preconditions:` and `steps:` appear only on `automated: false` entries. For `automated: true` and `automated: assisted` TCs the integration test in `src/__integration-tests__/suite/` is the canonical source — setup code, `waitForHuman()`/`waitForHumanVerdict()` action prompts, and assertions all live there. Duplicating them in YAML invites drift, so they are omitted. When flipping a TC from `false` to `true` or `assisted`, delete the `preconditions:` and `steps:` blocks at the same time.

### When to add new test cases

Add at least one TC to the QA YAML for every:

- New user-visible feature
- Bug fix that should not regress

```mermaid
flowchart TD
    A[PR ready for review] --> B{User-visible change?}
    B -- No --> C[No QA TC needed]
    B -- Yes --> D{New feature or bug fix?}
    D -- New feature --> E[Add QA TC to YAML]
    D -- Bug fix --> F{Could it regress?}
    F -- No --> C
    F -- Yes --> E
    E --> G{Can it be fully automated?}
    G -- Yes --> H["Set automated: true<br/>Write integration test"]
    G -- No --> K{Needs human UI action<br/>but test can validate?}
    K -- Yes --> L["Set automated: assisted<br/>Write [assisted] test"]
    K -- No --> I["Set automated: false<br/>Describe manual steps"]
    H --> J[validate:qa-coverage passes]
    L --> J
    I --> J
```

Place new TCs at the end of the file under the relevant feature section. TC ID rules:

- **Never renumber** existing IDs — results reference IDs by name across QA cycles
- **Continue from the highest** existing ID for that feature slug (e.g., if `bind-to-destination-010` exists, the next is `bind-to-destination-011`)
- **IDs are globally unique** per feature slug across all QA YAML snapshots — check the highest ID in `qa/` before assigning

Set `automated: true` immediately if you are also writing the integration test; otherwise set `false` and leave a note in the scenario description.

### Quick Start

Release testing is **guided through a script** that generates version-specific instructions:

```bash
pnpm generate:release-testing-instructions:vscode-extension
```

The script validates prerequisites and generates a markdown file at `qa/release-testing-instructions-v<version>.md` with copy-paste-ready commands for the full release testing lifecycle (7 phases: prerequisites → QA test plan → GitHub issues → unit tests → integration tests → manual QA → pre-publish verification).
