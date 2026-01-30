---
allowed-tools: Read, Write, Bash(git:*)
argument-hint: <note text>
description: Drop a timestamped note for the current issue - collected by /finish-issue for PR descriptions
---

# Breadcrumb Command

## Context

Note to record: $ARGUMENTS

Like Hansel and Gretel dropping breadcrumbs to find their way home, this command lets you drop notes along your journey through an issue. When you run `/finish-issue`, it follows the trail back—collecting all discoveries, decisions, and reminders.

## Step 1: Validate Branch

```bash
git branch --show-current
```

**If branch doesn't match `issues/<NUMBER>` pattern:**

- Print: "Not on an issue branch. Breadcrumbs require an `issues/<NUMBER>` branch."
- STOP

**Extract the issue number** from the branch name (e.g., `issues/258` → `258`).

## Step 2: Validate Input

**If $ARGUMENTS is empty or whitespace:**

- Print: "Usage: /breadcrumb `<note text>`"
- STOP

## Step 3: Append Breadcrumb

**File location:** `.breadcrumbs/<ISSUE-NUMBER>.md`

**If file doesn't exist**, create it with header:

```markdown
# Breadcrumbs for Issue #<NUMBER>
```

**Append the entry:**

```markdown
## <TIMESTAMP>

<note text>
```

Where `<TIMESTAMP>` is the current date/time in format `YYYY-MM-DD HH:MM:SS`.

Use bash to get timestamp and append:

```bash
date "+%Y-%m-%d %H:%M:%S"
```

## Step 4: Confirm

Print a brief confirmation:

```text
🍞 Breadcrumb dropped in .breadcrumbs/<NUMBER>.md
```

Do NOT print the full file contents—keep it minimal.
