# Testing RangeLink VS Code Extension

> **Note:** This guide covers testing the RangeLink VS Code extension. For development workflow (F5 debugging, local install), see [DEVELOPMENT.md](./DEVELOPMENT.md). For publishing, see [PUBLISHING.md](./PUBLISHING.md).

---

## Quick Reference

| Test type            | Command                      | When to run                        | Runs in CI           |
| -------------------- | ---------------------------- | ---------------------------------- | -------------------- |
| Unit tests           | `pnpm test`                  | Every change                       | ✅                   |
| Unit tests (watch)   | `pnpm test:watch`            | During active development          | —                    |
| Coverage report      | `pnpm test:coverage`         | Before PR / on demand              | ✅ (with thresholds) |
| Integration tests    | `pnpm test:release`          | Before PR, after feature work      | ✅                   |
| Prepare QA test plan | `pnpm generate:qa-test-plan` | Start of release cycle             | —                    |
| Generate QA issue    | `pnpm generate:qa-issue`     | At the start of each release cycle | —                    |

All commands run from `packages/rangelink-vscode-extension/` unless noted.

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
qa/qa-test-cases-<version>-<YYYY-MM-DD>.yaml
```

Example: `qa/qa-test-cases-v1.1.0-2026-03-13.yaml`

The version is the target release (`nextTargetVersion` from `package.json`) and the date is when the plan was generated. Both are embedded in the filename and parsed automatically by the `generate-qa-issue` script — no extra flags needed.

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

Place new TCs at the end of the file under the relevant feature section. Use the next available TC-NNN ID. Set `automated: true` immediately if you are also writing the integration test; otherwise set `false` and leave a note in the scenario description.

### Starting a new QA cycle

1. Set `nextTargetVersion` in `packages/rangelink-vscode-extension/package.json` to the upcoming release version
2. Run `pnpm generate:qa-test-plan:vscode-extension` from the root of the project to create the new YAML with all existing TCs reset to `pending`
3. Run `/qa-suggest` in Claude Code to get suggested TCs for new features based on the CHANGELOG `[Unreleased]` section
4. Review the suggested TCs — add, edit, or remove as needed
5. Commit the YAML and run `pnpm generate:qa-issue` to create the GitHub tracking issues

### Generating a QA GitHub issue

The `generate-qa-issue` script creates a parent GitHub issue + one sub-issue per feature section, linked with task-list checkboxes. This is the starting point for a manual QA cycle.

**Prerequisites:**

```bash
# python3 with PyYAML (the script shells out to python3 for YAML parsing)
pip3 install pyyaml

# gh CLI authenticated with write access
gh auth status
```

**Running the script:**

```bash
# Dry run — prints what would be created without making API calls
pnpm generate:qa-issue -- --dry-run qa/qa-test-cases-v1.1.0-2026-03-13.yaml

# Live run — creates issues on GitHub
pnpm generate:qa-issue -- qa/qa-test-cases-v1.1.0-2026-03-13.yaml
```

The script creates:

1. One **parent issue** titled `QA: <version> — <date>` with a task list of sub-issue links
2. One **sub-issue per feature section** listing all TCs (automated ones marked for reference)

Sub-issues are linked to the parent via GitHub's sub-issue API. Run with `--dry-run` first to verify the output before committing API calls.
