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

Read the extension package.json to get the published version:

```text
Read packages/rangelink-vscode-extension/package.json
```

Extract:

- `version` — the last published version (e.g., `1.0.0`)

During trunk-based development the QA artifacts use the "Unreleased" placeholder (e.g., `qa-test-cases-unreleased.yaml`) — this convention is embedded in the QA tooling, not read from a config field. The `version` field in package.json always holds the last published SemVer.

## Step 2: Locate QA YAMLs

Find the current cycle's YAML and the previous version's YAML:

```text
Glob(pattern="packages/rangelink-vscode-extension/qa/qa-test-cases-*.yaml")
```

- **Current YAML**: `qa-test-cases-unreleased.yaml` during trunk-based development, or `qa-test-cases-v<version>.yaml` once the version is locked in
- **Previous YAML**: the most recent released version's YAML (e.g., `qa-test-cases-v1.0.0.yaml`) — this is the baseline for diffing

**If the current YAML doesn't exist**, STOP: "No QA YAML found. Run `pnpm generate:qa-test-plan` first."

Read both YAML files in parallel.

**YAML structure note**: TC entries are nested under `test_cases:` with indentation (`  - id: ...`). When searching for TC IDs, use `id: ` without a `^` line-start anchor — the entries are indented.

## Step 3: Read CHANGELOG and Integration Tests

Read these in parallel:

1. `packages/rangelink-vscode-extension/CHANGELOG.md` — extract only the `## [Unreleased]` section (stop at the next `## [` header)
2. `packages/rangelink-vscode-extension/src/__integration-tests__/suite/` — Glob for `*.test.ts` files and scan two things: (a) `suite()`/`test()` names to map scenarios to TC IDs, and (b) which tests call `waitForHuman` or `waitForHumanVerdict` — those are the assisted ones (see "Choosing the automated value" in Step 6 for why this is the canonical signal)

## Step 4: Diff TCs Between Versions

Compare the current YAML against the previous YAML:

- **Carried forward**: TCs present in both (same `id:`)
- **Removed**: TCs in the previous YAML but not in the current one
- **Changed**: TCs whose `automated:` field flipped between versions, or whose `scenario:` text was updated

Record these for the change summary output.

**Schema-migration noise to ignore.** Starting in v1.1.0 the YAML schema dropped `preconditions:` and `steps:` from every `automated: true` and `automated: assisted` entry — the integration test is canonical for those. When diffing against a pre-v1.1.0 YAML, do NOT treat the removal of `preconditions:`/`steps:` as a "Changed" event, whether it appears alone or alongside an `automated: false → true|assisted` flip. Only flag genuine semantic changes (the automated flip itself, or scenario text edits).

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

For each uncovered CHANGELOG entry, draft one or more TC entries following the YAML schema. The shape of the entry depends on whether an integration test already covers the scenario — see [Choosing the automated value](#choosing-the-automated-value) below to pick first, then use the matching template from [YAML templates](#yaml-templates).

### Choosing the `automated` value

Look at the integration tests loaded in Step 3 and find any test whose scenario matches the CHANGELOG entry. Then:

- A test exists and it calls `waitForHuman` or `waitForHumanVerdict` (it pauses for a human action at runtime) → set `automated: assisted`
- A test exists and it does NOT call either of those (fully programmatic, no human in the loop) → set `automated: true`
- No test covers the scenario → set `automated: false`

The presence of `waitForHuman` / `waitForHumanVerdict` is the canonical signal because it is the actual runtime mechanism that pauses the test for a human. Naming conventions like an `[assisted]` prefix in the test title are a secondary signal layered on top of the functional behaviour; treat the prefix as a hint, but always confirm by looking for the `waitForHuman*` call.

### YAML templates

**Full template (`automated: false`)** — used when no integration test covers the scenario. `preconditions:` and `steps:` are required because the YAML is the only source of instructions:

<!-- prettier-ignore -->
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

**Compact template (`automated: true` or `automated: assisted`)** — used when an integration test in `src/__integration-tests__/suite/` already covers the scenario. Omit `preconditions:` and `steps:` because the integration test is canonical and duplicating instructions invites drift:

<!-- prettier-ignore -->
```yaml
  - id: <feature-slug>-NNN
    feature: '<CHANGELOG section name>'
    scenario: '<one-line description of the specific scenario>'
    expected_result: '<what passing looks like>'
    automated: true   # or: assisted
```

### TC ID scheme: feature-slug IDs

IDs are derived from the `feature:` field value using this algorithm:

1. Strip keybinding prefix `R-[A-Z] ` if present (e.g., `R-M Status Bar Menu` → `Status Bar Menu`)
2. Replace space-emdash-space and space-hyphen-space with a single `-`
3. Replace `Bug Fix` with `bugfix`
4. Lowercase everything
5. Replace spaces with `-`
6. Remove non-alphanumeric chars except hyphens
7. Collapse multiple hyphens to one, strip leading/trailing hyphens
8. Append `-NNN` where NNN is the next available 3-digit zero-padded number for that slug within the current YAML

**To find the next available number**: scan the current YAML for all `id:` values that start with the derived slug prefix, extract the highest NNN, and use `max + 1`.

### Section placement

New TCs go at the end of their feature's section in the YAML. If no section exists for the feature yet, create a new section comment block following the existing pattern.

## Step 7: Write Scratchpad Report

Create a scratchpad file for the report. Use the `/scratchpad` conventions:

1. Determine the issue context from the current git branch (e.g., `issues/382` → issue ID `382`)
2. Find the next available sequence number in `.claude-work/issues/<ID>/scratchpads/`
3. Write the scratchpad. Choose the filename based on `nextTargetVersion`:
   - If `nextTargetVersion` is `"Unreleased"`: `.claude-work/issues/<ID>/scratchpads/NNNN-qa-suggest.txt`
   - If `nextTargetVersion` is a locked SemVer (e.g., `"2.0.0"`): `.claude-work/issues/<ID>/scratchpads/NNNN-qa-suggest-v<nextTargetVersion>.txt`

If no issue context can be determined, use `.claude-work/scratchpads/` instead.

The scratchpad should contain these sections in order:

### Header

If `nextTargetVersion` is `"Unreleased"`, use this header:

```text
# QA Suggest — v<version> → Unreleased
```

If `nextTargetVersion` is a locked SemVer (e.g., `"2.0.0"`), use this header instead:

```text
# QA Suggest — v<version> → v<nextTargetVersion>
```

Then continue with the shared body:

## What to do next

1. Review the suggested TCs below — edit descriptions, remove irrelevant ones
2. Copy the YAML block at the bottom into the QA file at the appropriate section
3. Verify the IDs don't collide with existing entries

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
