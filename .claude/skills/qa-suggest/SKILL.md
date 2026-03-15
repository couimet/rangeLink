---
name: qa-suggest
version: 2026.03.14.1
description: Analyze CHANGELOG [Unreleased] against QA YAML test cases and suggest new TCs for uncovered features. Zero-argument — auto-discovers all inputs from the project.
allowed-tools: Read, Write, Glob, Grep, Bash
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

- **Current YAML**: the file whose name contains `v<nextTargetVersion>` (e.g., `qa-test-cases-v1.1.0-2026-03-14.yaml`)
- **Previous YAML**: the most recent file that does NOT contain `v<nextTargetVersion>` — this is the baseline for diffing

**If the current YAML doesn't exist**, STOP: "No QA YAML found for v`<nextTargetVersion>`. Run `pnpm generate:qa-test-plan` first."

Read both YAML files in parallel.

**YAML structure note**: TC entries are nested under `test_cases:` with indentation (`  - id: ...`). When searching for TC IDs, use `id: ` without a `^` line-start anchor — the entries are indented.

## Step 3: Read CHANGELOG and Integration Tests

Read these in parallel:

1. `packages/rangelink-vscode-extension/CHANGELOG.md` — extract only the `## [Unreleased]` section (stop at the next `## [` header)
2. `packages/rangelink-vscode-extension/src/__integration-tests__/suite/` — Glob for `*.test.ts` files and scan their `suite()`/`test()` names to understand what is already automated

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
  - id: <feature-slug>-NNN
    feature: '<CHANGELOG section name>'
    scenario: '<one-line description of the specific scenario>'
    preconditions:
      - '<setup step>'
    steps:
      - '<test action>'
    expected_result: '<what passing looks like>'
    automated: false
```

### TC ID scheme: feature-slug IDs

IDs are derived from the `feature:` field value using this algorithm:

1. Strip keybinding prefix `R-[A-Z] ` if present (e.g., `R-M Status Bar Menu` → `Status Bar Menu`)
2. Replace ` — ` and ` - ` with `-`
3. Replace `Bug Fix` with `bugfix`
4. Lowercase everything
5. Replace spaces with `-`
6. Remove non-alphanumeric chars except hyphens
7. Collapse multiple hyphens to one, strip leading/trailing hyphens
8. Append `-NNN` where NNN is the next available 3-digit zero-padded number for that slug within the current YAML

**To find the next available number**: scan the current YAML for all `id:` values that start with the derived slug prefix, extract the highest NNN, and use `max + 1`.

**`automated` field**: set to `true` only if you confirmed an integration test already covers this exact scenario in Step 3. Otherwise set `false`.

**Section placement**: new TCs go at the end of their feature's section in the YAML. If no section exists for the feature yet, create a new section comment block following the existing pattern.

## Step 7: Write Scratchpad Report

Create a scratchpad file for the report. Use the `/scratchpad` conventions:

1. Determine the issue context from the current git branch (e.g., `issues/382` → issue ID `382`)
2. Find the next available sequence number in `.claude-work/issues/<ID>/scratchpads/`
3. Write the scratchpad to `.claude-work/issues/<ID>/scratchpads/NNNN-qa-suggest-v<nextTargetVersion>.txt`

If no issue context can be determined, use `.claude-work/scratchpads/` instead.

The scratchpad should contain these sections in order:

### Header

```text
# QA Suggest — v<version> → v<nextTargetVersion>

## What to do next

1. Review the suggested TCs below — edit descriptions, remove irrelevant ones
2. Copy the YAML block at the bottom into the QA file at the appropriate section
3. Verify the IDs don't collide with existing entries
```

### Change Summary

```text
## Change Summary

### Suggested (N new TCs)
- [ ] <id>: <scenario> — covers CHANGELOG entry "<entry>"
- [ ] ...

### Removed (N TCs dropped from previous cycle)
- <id>: <scenario> — reason
- ...

### Changed (N TCs updated)
- <id>: automated false → true (integration test added)
- ...

### Carried Forward (N TCs unchanged)
<count only, no individual listing>
```

Each suggested TC has a `- [ ]` checkbox so the user can mark which ones to keep.

### Suggested YAML Block

A fenced YAML block ready to copy-paste into the QA file:

````text
## Suggested YAML — copy into QA file

```yaml
# --- Suggested TCs for [Unreleased] features ---

  - id: <feature-slug>-NNN
    feature: '...'
    ...
```
````

Do NOT auto-write to the QA file. The developer reviews and appends manually.

### Skipped Entries

```text
## Skipped CHANGELOG Entries

- "<entry>" — internal refactor, no user-visible change
- "<entry>" — CI-only change
- ...
```

If nothing was skipped, write: "No entries skipped — all [Unreleased] items have corresponding TCs."

### Ready-to-Paste Prompts

Add a final section with pre-built prompts the user can copy-paste into Claude Code. Use the actual scratchpad path, QA YAML path, and YAML filename from this run:

```text
## Next steps — copy-paste prompts

### 1. Integrate suggested TCs into the QA file

Integrate suggestions from <scratchpad-path> to <current-yaml-path>

### 2. Generate GitHub tracking issues (run from project root)

pnpm generate:qa-issue:vscode-extension

To target a specific file instead of auto-discover:

pnpm generate:qa-issue:vscode-extension -- qa/<current-yaml-filename>
```

Replace `<scratchpad-path>`, `<current-yaml-path>`, and `<current-yaml-filename>` with the real values from this run.

### Terminal Output

After writing the scratchpad, print only a short summary to the terminal:

```text
Wrote <scratchpad-path>
  Suggested: N new TCs
  Skipped:   N CHANGELOG entries
  Review the scratchpad to finalize.
```

## Output Format

Never hard-wrap prose output — each paragraph is one continuous line; line breaks for structure only.
