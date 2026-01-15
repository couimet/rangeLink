---
allowed-tools: Read, Write, Edit, Bash(*), Glob, Grep
argument-hint: <rangelink-to-scratchpad-steps>
description: Execute steps from a scratchpad block and create commit message
---

# Tackle Scratchpad Block Workflow

## Context

RangeLink to scratchpad steps: $ARGUMENTS

This command executes a specific block of implementation steps from a scratchpad file, then creates a commit message for review.

## Step 1: Read the Target Block

Read the lines specified by the RangeLink to get the step(s) to execute.

**If the RangeLink doesn't resolve** (file not found, lines don't exist, or content isn't actionable steps): STOP immediately and report the issue. Do not attempt to guess, search for alternatives, or infer intent.

## Step 2: Understand the Context

Read the full scratchpad to understand:

- The overall goal/issue being addressed
- Parent issue context (if noted)
- Files to modify (from "Files to Modify" section if present)

Note: User controls execution order. Do not verify or block based on previous steps.

## Step 3: Assess Clarity

Before executing, assess if the steps are clear enough:

**If unclear**: Follow the `questions` workflow in CLAUDE.md to ask for clarification.
Use filename pattern: `NNNN-scratchpad-block-questions.txt`

**If clear**: Proceed to Step 4.

## Step 4: Execute the Steps

Perform the implementation work as specified in the selected lines:

- Make code changes
- Add/update tests as needed
- Fix any issues that arise

### Test Execution

Follow rule E001 in CLAUDE.md for shell environment setup, then run:

```bash
pnpm test
```

**Exception**: Skip tests only if the scratchpad block explicitly says not to run them for this step.

## Step 5: Create Commit Message File

**IMPORTANT**: Always create a NEW commit message file for this block. Never reuse commit message files from previous steps.

Follow the `commits` workflow in CLAUDE.md.

Use filename pattern: `NNNN-scratchpad-step-description.txt`

Include context from:

- The scratchpad's goal/issue number
- What was implemented in this block
- Reference to the scratchpad file

## Step 6: Report Status and STOP

Print:

1. Summary of changes made
2. Files modified
3. Test results (pass/fail count)
4. Commit message file path

**IMPORTANT: Do NOT run `git commit`.**

Wait for user to:

- Review the changes
- Review the commit message
- Manually commit when ready

## Quality Checklist

Before finishing:

- [ ] All steps in the RangeLink block were executed
- [ ] Tests pass (unless scratchpad explicitly skipped them)
- [ ] NEW commit message file created with clear "why" context
- [ ] Changes align with scratchpad's stated goal
- [ ] No unrelated changes included
