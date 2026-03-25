# Testing RangeLink VS Code Extension

> **Note:** This guide covers testing the RangeLink VS Code extension. For development workflow (F5 debugging, local install), see [DEVELOPMENT.md](./DEVELOPMENT.md). For publishing, see [PUBLISHING.md](./PUBLISHING.md).

---

## Quick Reference

| Test type             | Command                                      | When to run                        | Runs in CI           |
| --------------------- | -------------------------------------------- | ---------------------------------- | -------------------- |
| Unit tests            | `pnpm test`                                  | Every change                       | ✅                   |
| Unit tests (watch)    | `pnpm test:watch`                            | During active development          | —                    |
| Coverage report       | `pnpm test:coverage`                         | Before PR / on demand              | ✅ (with thresholds) |
| Integration tests     | `pnpm test:release`                          | Before PR, after feature work      | ✅                   |
| Prepare QA test plan  | `pnpm generate:qa-test-plan`                 | Start of release cycle             | —                    |
| Generate QA issue     | `pnpm generate:qa-issue`                     | At the start of each release cycle | —                    |
| Generate QA checklist | `pnpm generate:qa-checklist`                 | Before manual QA pass              | —                    |
| QA smoke setup        | `pnpm qa:setup`                              | Before manual QA pass              | —                    |
| Validate QA coverage  | `pnpm validate:qa-coverage`                  | After adding integration tests     | ✅                   |
| Release testing guide | `pnpm generate:release-testing-instructions` | Start of release cycle             | —                    |

All commands run from `packages/rangelink-vscode-extension/` unless noted.

---

## Testing Lifecycle

### Release QA Cycle (once per release)

```mermaid
flowchart TD
    Z[generate:release-testing-instructions] -.->|generates guide| A
    A[Set nextTargetVersion] --> B[generate:qa-test-plan]
    B --> C[/qa-suggest in Claude Code/]
    C --> D[Review + append new TCs]
    D --> E[Commit YAML]
    E --> F[generate:qa-issue]
    F --> G[GitHub parent + sub-issues created]
    G --> H[qa:setup]
    H --> H1[Build .vsix]
    H1 --> H2[Install in qa-test profile]
    H2 --> H3[Apply settings profile]
    H3 --> H4[Generate checklist]
    H4 --> H5[Launch editor with fixture workspace]
    H5 --> I[Manual QA pass]
    I --> I1[Ready-now TCs — no setup needed]
    I1 --> I2[Open terminals + bind]
    I2 --> I3[Terminal-dependent TCs]
    I3 --> I4[Switch settings profiles as needed]
    I4 --> J{All TCs pass?}
    J -- No --> K[Fix + re-run affected TCs]
    K --> J
    J -- Yes --> L[Tag release + publish]
```

---

## Unit Tests

```bash
# Run all unit tests
pnpm test

# Watch mode — re-runs on file change
pnpm test:watch

# Coverage report (writes to coverage/)
pnpm test:coverage
```

Integration test files (`src/__integration-tests__/`) are excluded from the Jest run — they require the VS Code extension host and are covered by `pnpm test:release`.

---

## Integration Tests (VS Code Extension Host)

### What they cover

Integration tests run inside a real VS Code process via `@vscode/test-cli`. They validate behaviour that cannot be tested with mocks: command registration, clipboard interaction, navigation, document link detection, and terminal binding.

### Running locally

```bash
# From packages/rangelink-vscode-extension/
pnpm test:release
```

### QuickPick limitation

VS Code's extension host test runner provides no API to interact with QuickPick UI — tests cannot programmatically select items, dismiss pickers, or read picker contents. A QuickPick that opens during a test **will stall the test indefinitely** because it blocks the command from completing, and there is no way to dismiss it from test code.

**Workaround — command bypass:** Many TCs that involve a QuickPick as a means to an end (e.g., "bind via picker, verify toast") can be automated by calling the underlying command directly (`rangelink.bindToTerminalHere`, `rangelink.bindToTextEditorHere`) to bypass the picker entirely, then asserting the outcome via log-based UI assertions.

**What cannot be automated:** TCs that verify picker content itself (item ordering, badges, grouping, placeholder text) or dialog interaction (confirmation buttons, cancel behavior) must remain `automated: false` in the QA YAML. These require manual testing.

See https://github.com/couimet/rangeLink/issues/483 for the full triage of automatable vs manual TCs.

---

## CI Pipeline

CI runs automatically on every pull request and on pushes to `main`. The job is defined in `.github/workflows/ci.yml`.

### Job: Test & Validate (`ubuntu-latest`)

Steps run in this order:

| Step                         | What it does                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Setup Node.js and pnpm       | Installs the Node version from `.nvmrc` via the `setup-node-pnpm` composite action   |
| Install dependencies         | Runs `pnpm install` via the `install-deps` composite action                          |
| Check formatting and linting | Runs Prettier and ESLint via `check-formatting`                                      |
| Run tests with coverage      | Runs `pnpm test` (all packages) with coverage thresholds enforced                    |
| Run integration tests        | Runs `pnpm test:release` under Xvfb via the `run-integration-tests` composite action |
| Check TODOs/FIXMEs           | Counts or diffs `TODO`/`FIXME` comments; on PRs, fails if new ones are introduced    |

---

## QA Test Plan

The QA test plan is a version-scoped YAML file that tracks both automated and manual test cases for a given release cycle.

### File location and naming

```text
qa/qa-test-cases-v<version>[-NNN].yaml
```

Example: `qa/qa-test-cases-v1.1.0.yaml` (base), `qa/qa-test-cases-v1.1.0-001.yaml` (first iteration)

The version is the target release (`nextTargetVersion` from `package.json`). It is embedded in the filename and parsed automatically by the `generate-qa-issue` script — no extra flags needed. The `-NNN` suffix handles multiple iterations within a version.

New QA YAML files are created by `pnpm generate:qa-test-plan`. The script carries forward all TCs from the most recent YAML, resets `status:` fields to `pending`, and preserves `automated:` flags.

### The `automated` field

Each test case has an `automated: true/false` field:

- `automated: true` — covered by an integration test in `src/__integration-tests__/`. These run on every CI push and do not require manual execution during a release cycle.
- `automated: false` — must be executed manually. Reasons include: requires AI assistant interaction, requires UI interaction (e.g. modal dialogs, drag-and-drop), or tests platform-specific behaviour that differs from the CI environment.

When you implement an integration test for a TC, update its `automated` field to `true` in the YAML.

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
    E --> G{Can it be integration-tested?}
    G -- Yes --> H["Set automated: true<br/>Write integration test"]
    G -- No --> I["Set automated: false<br/>Describe manual steps"]
    H --> J[validate:qa-coverage passes]
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

The script validates prerequisites and generates a markdown file at `qa/release-testing-instructions-v<version>[-NNN].md` with copy-paste ready commands for the full release testing lifecycle (7 phases: prerequisites → QA test plan → GitHub issues → unit tests → integration tests → manual QA → pre-publish verification).
