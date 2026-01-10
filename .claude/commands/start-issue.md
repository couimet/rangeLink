---
allowed-tools: Read, Bash(gh:*), Write, Glob, Grep
argument-hint: <github-issue-url>
description: Start working on a GitHub issue - analyze, explore codebase, and create detailed implementation plan
---

# Start GitHub Issue Workflow

## Context

Issue URL: $ARGUMENTS

Fetch the issue details:
!`gh issue view $ARGUMENTS --json title,body,number,state,labels`

## Your Tasks

### 1. Create Feature Branch

Create a feature branch for this issue using the pattern `issues/<NUMBER>`:

```bash
git checkout -b issues/<NUMBER>
```

Where `<NUMBER>` is the GitHub issue number (e.g., `issues/223`).

### 2. Gather Full Context

- **Fetch parent issues** - If the issue body references a parent (e.g., "Parent Issue: #47"), fetch it to understand the broader goal and how this issue fits into the plan
- **Note child issues** - If this is a parent/epic, note child issues to understand full scope
- **Explore the codebase** - Use Grep/Glob/Read to find and examine:
  - Files/functions mentioned in the issue
  - Related code that will be affected
  - Existing patterns to follow
  - Test files that will need updates

### 3. Create Implementation Plan Scratchpad

Follow the `scratchpads` workflow in CLAUDE.md for file location and numbering.
Use filename pattern: `NNNN-issue-NUMBER-description.txt`

The scratchpad for issues MUST contain these sections:

```markdown
# Issue #NUMBER: Title

Parent: #XX (if applicable)
Type/Priority/Scope: from labels

## Context

- Brief issue summary (1-2 sentences)
- Parent issue context: how this fits into broader plan (if applicable)
- Key insight from codebase exploration that shapes the implementation

## Implementation Plan

Numbered steps that are:

- **Commit-sized** - each step could be a single commit or small PR
- **Specific** - reference exact files, functions, types by name
- **Ordered** - dependencies between steps are clear
- **Testable** - each step should mention what tests to add/update

Example format:

### Step 1: <brief description>

- Add `<TypeName>` interface to `src/types/<filename>.ts`
- Export from `src/types/index.ts`

### Step 2: <brief description>

- Modify `<functionName>()` in `src/<path>/<filename>.ts`
- Update return type, add new parameters

### Step 3: <brief description>

- Add tests in `src/<path>/__tests__/<filename>.test.ts`
- Cover happy path, edge cases, error conditions

## Assumptions Made

List any reasonable defaults assumed to avoid blocking on minor decisions:

- "Assuming X because Y" - document reasoning

## Files to Modify

Bulleted list of all files that will be touched, grouped by step.

## Acceptance Criteria

Checklist from the issue (copy verbatim if provided).
```

### 4. Create Questions File (Only If Necessary)

**Only create questions for decisions that would FUNDAMENTALLY change the implementation plan.**

Do NOT ask questions about:

- Minor choices with clear best practices (assume the better option)
- Implementation details you can reasonably decide
- Things you can verify by reading existing code patterns

DO ask questions about:

- Architectural decisions with no clear winner
- User-facing behavior where preference matters
- Scope clarification when requirements are ambiguous

If questions are needed, follow the `questions` workflow in CLAUDE.md for file location and numbering.
Use filename pattern: `NNNN-issue-NUMBER-questions.txt`

Extend the base format with issue-specific fields:

```markdown
# Questions for Issue #NUMBER

## Question 001: <specific question>

Context: <why this matters for the plan>

Options:
A) <option> - <tradeoff>
B) <option> - <tradeoff>

Recommendation: <your recommendation with reasoning>

**Plan impact:** <which steps would change based on answer>

Answer: <prefilled with recommendation>

---
```

### 5. Report Status

Print the branch name and paths of created files so the user knows what was prepared.

## Quality Checklist

Before finishing, verify:

- [ ] Feature branch `issues/<NUMBER>` was created
- [ ] Implementation plan has specific file/function names (not "update the code")
- [ ] Each step is small enough to be one commit
- [ ] Test updates are mentioned for each step that changes behavior
- [ ] Assumptions are documented with reasoning
- [ ] Questions (if any) would genuinely change the plan if answered differently
