---
allowed-tools: Read, Bash(git:*, pnpm:*, gh:*), Write, Glob, Grep
argument-hint: [optional: issue-number-or-url]
description: Wrap up issue work - run verification, check documentation needs, generate PR description
---

# Finish Issue Workflow

## Context

Symmetrical companion to `/start-issue` - handles the "wrap up" phase of issue work.

**Input:** $ARGUMENTS

If no argument provided, extract issue number from current branch name (`issues/<NUMBER>`).

## Your Tasks

### 1. Determine Issue Number

```bash
# If no argument, extract from branch name
git branch --show-current
```

Parse the issue number from `issues/<NUMBER>` pattern or use the provided argument.

### 2. Pre-PR Verification

Run these commands from the **project root** (where `pnpm-workspace.yaml` lives):

```bash
# Format code
pnpm format:fix

# Run tests - all must pass
pnpm test

# Check for uncommitted changes
git status
```

- If `format:fix` makes changes → prepare a commit
- If tests fail → investigate and fix before proceeding
- If uncommitted changes exist → notify user

### 3. Documentation Review

Check if documentation updates are needed:

**CHANGELOG.md** (`packages/rangelink-vscode-extension/CHANGELOG.md`):

- User-facing changes → Add entry (Added/Changed/Fixed)
- Internal refactoring/infrastructure → No entry (users don't see it)

**README.md**:

- New command → Document with keybinding
- New setting → Document in Configuration
- New feature → Document appropriately
- Internal changes → Usually no update

**package.json contributes** (`packages/rangelink-vscode-extension/package.json`):

- Verify commands/keybindings/settings/menus already added during implementation

### 4. Gather Context for PR Description

Collect information from:

- Scratchpads matching `*issue-NUMBER*`: `ls .scratchpads/*issue-<NUMBER>*`
- Commit messages: `git log --oneline origin/main..HEAD`
- Commit details: `git log origin/main..HEAD`

### 5. Generate PR Description Scratchpad

Follow the `scratchpads` workflow in CLAUDE.md for file location and numbering.
Use filename pattern: `NNNN-finish-issue-NUMBER.txt`

The PR description MUST follow this template:

```markdown
[issues/NUMBER] Title

## Summary
2-3 sentences on what this accomplishes.

## Changes
- Bulleted list of key changes
- Omit file lists (PR shows modified files)
- Group related changes

## Test Plan
- [ ] All existing tests pass
- [ ] New tests added for: [list]
- [ ] Manual testing: [describe if applicable]

## Documentation
- [ ] CHANGELOG.md: [entry added / not needed - reason]
- [ ] README.md: [updated / not needed - reason]

## Related
- Closes #NUMBER
```

### PR Description Rules

- **NEVER** reference `.scratchpads/` or `.claude-questions/` files
- These are local/ephemeral and not accessible from GitHub
- Capture all relevant information directly in the PR body

### 6. Handle Ambiguity

If unclear whether documentation is needed or other decisions arise:

- Use the questions workflow in CLAUDE.md to gather user input
- Do NOT guess on user-facing decisions

### 7. Report Status and STOP

Print a summary:

```text
=== Issue #NUMBER Ready for PR ===

Verification:
- format:fix: [ran / no changes needed]
- tests: [all pass / X tests, Y passing]
- uncommitted changes: [none / list]

Documentation:
- CHANGELOG.md: [entry added / not needed - reason]
- README.md: [updated / not needed - reason]

Files created:
- .scratchpads/NNNN-finish-issue-NUMBER.txt (PR description)

---

Ready for PR. Review the scratchpad and:
1. Create PR: gh pr create --title "..." --body-file .scratchpads/NNNN-finish-issue-NUMBER.txt
2. Or ask Claude to create the PR
```

**IMPORTANT: Do NOT create the PR automatically.**

This command prepares everything for the PR. Wait for the user to:

- Review the PR description
- Explicitly ask to create the PR (e.g., "create PR", "submit")

## Quality Checklist

Before finishing, verify:

- [ ] `pnpm format:fix` ran successfully
- [ ] `pnpm test` passes
- [ ] No uncommitted changes (or user notified)
- [ ] PR description doesn't reference ephemeral files
- [ ] Documentation needs assessed
- [ ] Scratchpad created with PR description
