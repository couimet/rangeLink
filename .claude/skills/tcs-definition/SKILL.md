---
name: tcs-definition
version: 2026.06.15.3
description: Draft new QA test cases for the current issue and insert approved ones into qa-test-cases.yaml. Iteration loop draft → review → approve. Pairs with `tc-implement`.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# TCs Definition

Interview-driven definition of new QA test cases for the current issue. Two-phase: draft into a `/note` for review/iteration, then on approval auto-insert into `packages/rangelink-vscode-extension/qa/qa-test-cases.yaml`.

**Shared schema contract**: the QA YAML schema (section headers, indentation, label format, `automated:` value vocabulary) is governed by `CLAUDE.md § qa-yaml` rules QA001-QA008. Both this skill and the `tc-implement` agent rely on those rules.

**Input:** Zero-argument for the draft phase, or the single-word subcommand `apply` to re-read an existing draft note and prompt for approval again (after the user has edited the note). The bare word — not `--apply` — keeps the slash invocation `/tcs-definition apply` short to type.

## Step 1: Resolve Issue Context

Run in parallel:

```bash
git branch --show-current
```

```bash
gh issue view <issue-url-from-branch> --json title,body,number,state,labels
```

Extract the issue ID from `issues/<ID>` on the current branch. If the branch does not match `issues/*`, STOP with: `STOP: tcs-definition runs on an issues/<ID> branch. Current branch is <name>. Switch to the issue branch and re-invoke.` Read the active-plan note at the path stored in `.claude-work/issues/<ID>/active-plan`. If that pointer is missing, STOP with: `STOP: No active-plan pointer at .claude-work/issues/<ID>/active-plan. Run /start-issue first.`

If the issue body references a parent (e.g., `Parent Issue: #47`), fetch it via `gh issue view`.

## Step 2: Read QA YAML and Existing Tests

Read in parallel:

1. `packages/rangelink-vscode-extension/qa/qa-test-cases.yaml` — the full file.
2. Glob `packages/rangelink-vscode-extension/src/__integration-tests__/suite/*.test.ts` and scan for existing `test('<slug>-NNN:` IDs. Build a slug → existing-IDs map.

Record the highest `-NNN` per feature slug; the skill uses `max + 1` for new entries (per QA004 in CLAUDE.md).

## Step 3: Read the Partial Diff (Optional Signal)

Run:

```bash
git diff <base-branch>...HEAD -- packages/rangelink-vscode-extension/src/
```

Where `<base-branch>` is the value recorded under `Base branch:` in the active-plan note (defaults to `origin/main` if absent).

If the diff is non-empty:

- Read it as additional signal for what features and code paths are being added or changed.
- Count lines. If the diff exceeds 1000 lines, warn the user: `The diff is large (N lines). The interview may drift from spec-elicitation into implementation-confirmation. Consider running tcs-definition earlier next time.`

If the diff is empty, skip this signal source and rely entirely on the active-plan, issue body, and parent issue.

## Step 4: Derive Feature Slug and Draft Initial TCs

For each new feature or code path identified in Steps 1-3:

1. **Derive the feature slug** (algorithm — kept in sync with `qa-suggest § Feature slug derivation`):
   1. Strip keybinding prefix `R-[A-Z] ` if present.
   2. Replace space-emdash-space and space-hyphen-space with a single `-`.
   3. Replace `Bug Fix` with `bugfix`.
   4. Lowercase.
   5. Replace spaces with `-`.
   6. Remove non-alphanumeric chars except hyphens.
   7. Collapse multiple hyphens; strip leading/trailing.
2. **Find the next available `-NNN`** for that slug from Step 2's map: `max + 1`.
3. **Draft the TC entry** using the templates below. Pick the full template (with `preconditions:` and `steps:`) for new scenarios with no existing integration-test coverage; pick the compact template (no `preconditions:`/`steps:`) only when an existing test already covers the scenario and the entry just needs to be added to the YAML.

**Full template (`automated: false`)** — new scenario, no integration test yet:

```yaml
- id: <feature-slug>-NNN
  feature: '<feature slug or display name>'
  scenario: '<one-line description of the specific scenario>'
  preconditions:
    - '<setup step>'
  steps:
    - '<test action>'
  expected_result: '<what passing looks like>'
  automated: false
```

**Compact template (`automated: true` or `automated: assisted`)** — only when an existing integration test already covers the scenario:

```yaml
- id: <feature-slug>-NNN
  feature: '<feature slug or display name>'
  scenario: '<one-line description of the specific scenario>'
  expected_result: '<what passing looks like>'
  automated: true # or: assisted
```

Add `labels:` (multi-line list per QA008) when the scenario needs `requires-extensions`, `cursor`, `ubuntu`, or other tag from the YAML's existing label vocabulary.

## Step 5: Targeted Interview Rounds

Run AT MOST 3 `AskUserQuestion` rounds. Each round asks at most 4 questions.

**Skip-round criterion**: do not ask anything answerable from the active-plan, issue body, or parent issue. If after Step 4 the open-questions list is empty, skip Step 5 entirely.

Prioritize asking about:

1. **Negative paths** the user wants tested (e.g., "Should we test that the new command fails gracefully when no editor is active?").
2. **Ordering** that has user-visible meaning (e.g., "When the picker reopens after dismissal, should the previously selected item appear first?").
3. **Overflow thresholds** when the feature involves lists or quick picks (e.g., "Should we test what happens above the inline-default count?").
4. **Settings-default vs overridden behavior** when the feature reads from configuration.

When a `requires-extensions` scenario surfaces, confirm the marketplace extension family (`Claude Code`, `Gemini Code Assist`, `Copilot Chat`, `Cursor AI`, custom AI assistants).

Do not re-derive feature slugs by asking the user.

## Step 6: Write the Draft Note

If invoked with `apply`, SKIP this step — Step 7 will find and read the most recent draft note instead.

Use the issue-context resolver to compute the next available path:

```bash
~/.claude/skills/issue-context/target-path.sh --type notes --description "tcs-definition"
```

The note has four required structural anchors; prose between them is freeform.

**Anchor 1 — Header.** Required wording for the `Status:` line (the skill greps for this on `apply`):

```text
# TCs Definition — Issue #<NUMBER>

Status: pending-approval
```

Valid `Status:` values: `pending-approval` (ready for review) or `applied` (already written to YAML — skill refuses to re-apply).

**Anchor 2 — Change Summary.** Header literally `## Change Summary`, followed by a checkbox list. Each entry: `- [ ] <id>: <scenario>`. Carried-forward count below as one line: `Carried forward: M TCs already cover this issue's scope.`

**Anchor 3 — TCs YAML block.** Header literally `## TCs to Insert — edit me, then approve`, followed by a single fenced ```yaml block containing one or more TC entries. This is the source of truth on `apply`.

Edit rules below the block (write them once, verbatim):

- Indent each TC entry's top-level keys with TWO spaces (matches the `qa-test-cases.yaml` schema).
- Keep all entries inside the FIRST fenced ```yaml block under this header. Additional yaml blocks elsewhere in the note are ignored by the parser.
- To EXCLUDE a TC, delete its entry from the yaml block.
- To ADD a TC, append it inside the same yaml block in the same shape.

**Anchor 4 — Next-step.** Header literally `## Next — implement these TCs (after approval + YAML insert)`. List the IDs that will be inserted, one per line. Add one line: `Invoke per ID: Task(subagent_type="tc-implement", prompt="<tc-id>")`.

## Step 7: Approval Loop

Find the active draft note:

- Without `apply`: the note just written in Step 6.
- With `apply`: the most recent `.claude-work/issues/<ID>/notes/*-tcs-definition.txt` file. Read it. If `Status:` is not `pending-approval`, STOP with: `STOP: No pending tcs-definition draft found (or already applied). Run /tcs-definition without arguments to start a new draft.`

**Parse rule**: extract entries from the FIRST fenced ```yaml block under the `## TCs to Insert` header. Ignore any other fenced yaml blocks elsewhere in the note. Count entries.

Prompt for approval via `AskUserQuestion`:

```json
{
  "questions": [
    {
      "question": "Approve N TC(s) and insert into qa-test-cases.yaml?",
      "header": "Approval",
      "options": [
        {
          "label": "Apply now",
          "description": "Write the YAML block entries into the right sections of qa-test-cases.yaml, then mark Status: applied"
        },
        {
          "label": "Edit first",
          "description": "Stop and let me edit the note; re-invoke /tcs-definition apply when ready"
        },
        {
          "label": "Cancel",
          "description": "Stop without changes; the note remains for later reference"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

Branch on the answer:

### Apply now

**Safety note (run BEFORE any YAML edit)**: stash with a unique key so a concurrent stash with the same generic name does not collide:

```bash
STASH_KEY="tcs-definition-pre-apply-$(date +%Y%m%d-%H%M%S)"
git stash push -m "$STASH_KEY" packages/rangelink-vscode-extension/qa/qa-test-cases.yaml
```

Keep `STASH_KEY` in the shell session. On validator failure, restore via `git stash list | grep "$STASH_KEY"` to find the stash ref, then `git stash pop <ref>`. On success, `git stash drop <ref>`.

For each entry in the parsed YAML block:

1. **Derive the feature slug** from the entry's `id:` (strip the trailing `-NNN`).
2. **Locate the target section** in `qa-test-cases.yaml`:
   - Scan for `# Section N — <Title>` header comments.
   - For each section, collect the `id:` prefixes of its TCs.
   - Pick the section whose TCs share the new entry's slug prefix.
   - If no section matches, append a NEW section block at the end of the file. Header: `# Section <next-N> — <Title>`. `<next-N>` = the highest existing section number + 1. `<Title>` = the entry's `feature:` field, verbatim.
3. **Find the insertion point** within the section: the line AFTER the last entry of that section (immediately before the next `# Section` header, or at file end).
4. **Insert the entry** preserving the schema indent (two-space top-level keys). Leave a blank line before the new entry to match the existing spacing pattern.
5. **Verify QA001-QA004**: the entry's `-NNN` must be `max(NNN) + 1` for its slug within the YAML (already computed in Step 4) and must not collide with any existing ID.

After all entries are written, run `./packages/rangelink-vscode-extension/scripts/validate-qa-coverage.sh` to confirm no breakage. If the validator fails, restore the YAML using the stash key above and STOP with: `STOP: validator failed after insert. <validator-output>. YAML restored from stash.`

Update the note's `Status:` line to `applied` and append a timestamped footer:

```text
---
Applied: <YYYY-MM-DD HH:MM:SS> — N TCs inserted into qa-test-cases.yaml
```

### Edit first

STOP. Print:

```text
Iterate on the draft at <note-path>.

Edit the fenced YAML block in the "TCs to Insert" section directly. When ready, re-invoke:

  /tcs-definition apply

The skill will re-prompt for approval based on your edits.
```

Do NOT modify the note. The user owns iteration.

### Cancel

STOP. Print:

```text
Cancelled. The draft note at <note-path> remains for reference.
```

Do NOT modify the YAML, do NOT mark the note as applied.

## Step 8: Terminal Output

On Apply now success:

```text
Inserted N TCs into packages/rangelink-vscode-extension/qa/qa-test-cases.yaml
Draft note: <note-path> (Status: applied)
Validator: PASSED

Next: implement the TCs with tc-implement (one at a time):
  - Task(subagent_type="tc-implement", prompt="<id-1>")
  - Task(subagent_type="tc-implement", prompt="<id-2>")
  ...
```

On Edit first or Cancel: no additional output beyond what those branches printed.

## Formatting

See `/prose-style` for hard-wrap, code-reference, and GitHub-reference rules. Every paragraph in the generated scratchpad is one continuous line.
