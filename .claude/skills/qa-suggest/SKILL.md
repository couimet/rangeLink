---
name: qa-suggest
version: 2026.03.12.1
description: Analyze CHANGELOG [Unreleased] against QA YAML test cases and suggest new TCs for uncovered features. Zero-argument — auto-discovers all inputs from the project.
allowed-tools: Read, Glob, Grep
---

# QA Suggest

Suggest new test cases for the current QA cycle by diffing the CHANGELOG against existing TC coverage. No arguments needed — everything is auto-discovered from the project.

**Input:** None (zero-argument skill)

## Step 1: Discovery

Read the extension package.json to get the version context:

```text
Read packages/rangelink-vscode-extension/package.json
```

Extract:

- `nextTargetVersion` — the upcoming release version (e.g., `1.1.0`)
- `version` — the last published version (e.g., `1.0.0`)

**If `nextTargetVersion` is not set**, STOP: "Set `nextTargetVersion` in `packages/rangelink-vscode-extension/package.json` before running `/qa-suggest`."

## Step 2: Locate QA YAMLs

Find the current cycle's YAML and the previous version's YAML:

```text
Glob(pattern="packages/rangelink-vscode-extension/qa/qa-test-cases-*.yaml")
```

- **Current YAML**: the file whose name contains `v<nextTargetVersion>` (e.g., `qa-test-cases-v1.1.0-unreleased-2026-03-12.yaml`)
- **Previous YAML**: the most recent file that does NOT contain `v<nextTargetVersion>` — this is the baseline for diffing

**If the current YAML doesn't exist**, STOP: "No QA YAML found for v`<nextTargetVersion>`. Run `pnpm generate:qa-test-plan` first."

Read both YAML files in parallel.

## Step 3: Read CHANGELOG and Integration Tests

Read these in parallel:

1. `packages/rangelink-vscode-extension/CHANGELOG.md` — extract only the `## [Unreleased]` section (stop at the next `## [` header)
2. `src/__integration-tests__/suite/` — Glob for `*.test.ts` files and scan their `suite()`/`test()` names to understand what is already automated

## Step 4: Diff TCs Between Versions

Compare the current YAML against the previous YAML:

- **Carried forward**: TCs present in both (same `id:`)
- **Removed**: TCs in the previous YAML but not in the current one
- **Changed**: TCs whose `automated:` field flipped between versions, or whose `scenario:` text was updated

Record these for the change summary output.

## Step 5: Cross-Reference CHANGELOG Against TC Coverage

For each entry under `## [Unreleased]` in the CHANGELOG:

1. Check if an existing TC already covers this feature or fix (match by `feature:` field and `scenario:` description)
2. Check if an integration test already covers it (from Step 3 scan)
3. If neither covers it, draft a new TC entry

**Skip these CHANGELOG entries** (and record them for the skipped list):

- Internal refactors with no user-visible behavior change
- CI/build-only changes
- Documentation-only changes
- Dependency bumps with no behavior change

## Step 6: Draft New TC Entries

For each uncovered CHANGELOG entry, draft one or more TC entries following the YAML schema:

```yaml
- id: TC-NNN
  feature: '<CHANGELOG section name>'
  scenario: '<one-line description of the specific scenario>'
  preconditions:
    - '<setup step>'
  steps:
    - '<test action>'
  expected_result: '<what passing looks like>'
  platform: all
  automated: false
  status: pending
```

**TC numbering**: find the highest `TC-NNN` ID in the current YAML and number new TCs starting from `max + 1`.

**`automated` field**: set to `true` only if you confirmed an integration test already covers this exact scenario in Step 3. Otherwise set `false`.

## Step 7: Output Report

Print three sections:

### 1. Change Summary

Compare the current QA YAML against the previous version's YAML:

```text
## Change Summary (v<version> → v<nextTargetVersion>)

### Added (N new TCs suggested)
- TC-NNN: <scenario> — covers CHANGELOG entry "<entry>"
- ...

### Removed (N TCs dropped)
- TC-NNN: <scenario> — reason
- ...

### Changed (N TCs updated)
- TC-NNN: automated false → true (integration test added)
- ...

### Carried Forward (N TCs unchanged)
<count only, no individual listing>
```

### 2. Suggested YAML Block

Print the new TC entries as a fenced YAML block ready to append to the QA file:

````text
```yaml
# --- Suggested TCs for [Unreleased] features ---

- id: TC-NNN
  feature: '...'
  ...
```
````

Do NOT auto-write to the file. The developer reviews and appends manually.

### 3. Skipped Entries

List CHANGELOG entries that were intentionally omitted:

```text
## Skipped CHANGELOG Entries

- "<entry>" — internal refactor, no user-visible change
- "<entry>" — CI-only change
- ...
```

If nothing was skipped, print: "No entries skipped — all [Unreleased] items have corresponding TCs."

## Output Format

Never hard-wrap prose output — each paragraph is one continuous line; line breaks for structure only.
