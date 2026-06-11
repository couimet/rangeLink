# Release Testing Instructions: RangeLink VS Code Extension Unreleased

**Generated:** 2026-06-11 18:27:42 UTC
**Scope:** Changes from v1.0.0 → v2.0.0

This file contains version-specific, copy-paste ready commands for the full release testing lifecycle.
Work through each phase in order — later phases depend on earlier ones completing successfully.

---

## Phase 1: Generate QA Test Plan

Create or carry forward the QA test plan YAML for Unreleased.

```bash
pnpm generate:qa-test-plan:vscode-extension
```

This creates `qa/qa-test-cases-v2.0.0.yaml` by carrying forward all TCs from the previous plan with statuses reset to pending.

### AI-powered gap detection

Run the `/qa-suggest` skill in Claude Code to identify features in the CHANGELOG `[Unreleased]` section that lack test coverage.

### Review and commit

1. Review the generated YAML and any `/qa-suggest` recommendations
2. Append new TCs as needed (continue from the highest existing TC ID in each feature slug)
3. Commit the YAML:

```bash
git add packages/rangelink-vscode-extension/qa/qa-test-cases-v2.0.0.yaml
git commit -m "Add QA test plan for Unreleased"
```

---

## Phase 2: Create GitHub QA Issues

Generate the GitHub issue tracker (a single issue with grouped checkboxes per feature domain) from the QA YAML.

### Dry run first

```bash
pnpm generate:qa-issue:vscode-extension -- --dry-run
```

Review the output to verify section groupings and TC counts look correct.

### Create issues

```bash
pnpm generate:qa-issue:vscode-extension
```

The script prints the created issue URL.

---

## Phase 3: Run Unit Tests + Coverage

```bash
pnpm test
```

All tests must pass. Check coverage thresholds in the output.

---

## Phase 4: Run Integration Tests

```bash
pnpm test:release
```

This compiles the extension, launches a VS Code extension host, runs integration tests, and validates QA coverage (automated TC markers ↔ integration test IDs). All three stages must pass.

---

## Phase 5: Manual QA Pass

### Walk through the checklist

Generate a local QA checklist:

```bash
pnpm generate:qa-issue:vscode-extension --local
```

The generated checklist is at `qa/output/qa-checklist-v2.0.0-<timestamp>.md`.
Each TC is annotated with its automation status and reason. Cursor and Ubuntu TCs are grouped into their own sections with the required run commands inline.

---

## Phase 6: Validate QA Coverage

```bash
pnpm validate:qa-coverage:vscode-extension
```

Ensures all TCs marked `automated: true` in the YAML have matching integration tests, and vice versa. Fix any mismatches before proceeding.

---

## Phase 7: Pre-Publish Verification

### Final checklist

- [ ] All unit tests pass (`pnpm test`)
- [ ] All integration tests pass (`pnpm test:release`)
- [ ] All manual QA TCs pass (or have documented exceptions in the QA GitHub issue)
- [ ] QA coverage validation passes (`pnpm validate:qa-coverage:vscode-extension`)
- [ ] CHANGELOG `[Unreleased]` section is complete and accurate
- [ ] README has no stale content for the new features

### Next step: publish

When all checks pass, generate the publishing instructions:

```bash
pnpm generate:publish-instructions:vscode-extension
```

This validates the release environment and creates a version-specific publishing guide at `publishing-instructions/publish-vscode-extension-Unreleased.md`.
