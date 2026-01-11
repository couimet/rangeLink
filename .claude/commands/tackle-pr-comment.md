---
allowed-tools: Read, Glob, Grep, Write, Bash(gh api repos/*/*/pulls/*/reviews/*), Bash(gh api repos/*/*/pulls/*/comments/*), Bash(gh api repos/*/*/issues/*/comments/*), Bash(gh api repos/*/*/pulls/*/comments), Bash(gh api repos/*/*/issues/*/comments)
argument-hint: <pr-comment-url>
description: Tackle a PR comment - analyze feedback, explore code, and create implementation scratchpad
---

# Tackle PR Comment Workflow

## Context

PR Comment URL: $ARGUMENTS

## Step 1: Parse the URL and Fetch the Comment

Parse the URL to determine the comment type and extract IDs:

| URL Fragment              | Type                 | API Call                                                |
| ------------------------- | -------------------- | ------------------------------------------------------- |
| `#pullrequestreview-{id}` | Review               | `gh api repos/{owner}/{repo}/pulls/{pr}/reviews/{id}`   |
| `#discussion_r{id}`       | Inline code comment  | `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}`  |
| `#issuecomment-{id}`      | Conversation comment | `gh api repos/{owner}/{repo}/issues/{pr}/comments/{id}` |

Extract: owner, repo, PR number, comment type, and comment ID from the URL.

## Step 2: Fetch Thread Context

### For Inline Code Comments (`discussion_r*`)

These may be part of a threaded conversation. After fetching the target comment:

1. Check if it has `in_reply_to_id` (meaning it's a reply in a thread)
2. Fetch all comments on the PR: `gh api repos/{owner}/{repo}/pulls/{pr}/comments`
3. Filter to find all comments in the same thread (same `in_reply_to_id` chain or replies to the target)
4. Present the full thread chronologically

### For Issue Comments (`issuecomment-*`)

1. First, get the total count: `gh api repos/{owner}/{repo}/issues/{pr}/comments --jq 'length'`
2. Fetch the 5 most recent comments for context (sorted by creation time, newest first)
3. **If total > 5**: Inform the user:
   > "This PR has {N} comments. I loaded the 5 most recent for context. Would you like me to load all {N} for a holistic view?"
4. Wait for user response before proceeding if they want full context (workflow blocks until user responds)

### For Reviews (`pullrequestreview-*`)

Fetch the review directly - reviews are standalone with their body containing the full feedback.

## Step 3: Analyze and Explore Code

1. **Identify code references** in the comment(s):
   - File paths mentioned
   - Line numbers referenced
   - Function/class names discussed

2. **Explore the codebase**:
   - Read the referenced files
   - Understand the current implementation
   - Look at related code that might be affected
   - Check existing tests

3. **Understand the reviewer's concern**:
   - What is the core issue or suggestion?
   - Is this about correctness, style, performance, or architecture?
   - What outcome does the reviewer want?

## Step 4: Assess Clarity

Before creating the scratchpad, assess if the feedback is clear enough to act on:

**If unclear**: Stop and tell the user:

> "The reviewer's feedback is ambiguous. Before I create an implementation plan, we may need to ask a clarifying question. Here's what's unclear: [explain]. Would you like me to draft a clarifying question for the PR?"

**If clear**: Proceed to Step 5.

## Step 5: Create Implementation Scratchpad

Follow the `scratchpads` workflow in CLAUDE.md.

**Naming pattern**: `NNNN-pr-{PR_NUMBER}-{COMMENT_TYPE}-{COMMENT_ID}.txt`

Where:

- `{COMMENT_TYPE}` is: `review`, `discussion`, or `issuecomment`
- `{COMMENT_ID}` is the numeric ID from the URL (e.g., `3647271799`, `r1234567`, `987654`)

Use Glob to find the highest existing NNNN in `.scratchpads/` and increment.

### Scratchpad Format

```markdown
# PR #{PR_NUMBER} Comment Response

Source: {FULL_PR_COMMENT_URL}

## Reviewer Feedback Summary

{1-3 sentence summary of what the reviewer is asking for}

## Analysis

{Your analysis of the feedback - what needs to change and why}

## Implementation Plan

### Step 1: {description}

- Specific file: `path/to/file.ts`
- What to change: {details}

### Step 2: {description}

...

## Recommendations

{Your recommendations for the best approach, with reasoning}

## Files to Modify

- `path/to/file1.ts` - {what changes}
- `path/to/file2.ts` - {what changes}
```

## Step 6: Questions (If Needed)

If there are decisions that need user input (not clarification from reviewer), use the `questions` workflow in CLAUDE.md:

**Naming pattern**: `NNNN-pr-{PR_NUMBER}-{COMMENT_TYPE}-{COMMENT_ID}-questions.txt`

Only create a questions file for decisions that would fundamentally change the implementation approach.

## Step 7: Report and Stop

Print:

1. The scratchpad file path
2. The questions file path (if created)
3. Brief summary of what you found

**IMPORTANT: Do NOT start implementing changes.**

Wait for the user to review the scratchpad and explicitly ask you to proceed with implementation.

## Step 8: Commit Message (After User Approves)

When the user approves the plan and asks to proceed:

1. **Ask**: "Would you like me to create a commit message file now? (The implementation plan has enough context to draft it.)"

2. **If yes**: Follow the `commits` workflow in CLAUDE.md to create the commit message file. Use the scratchpad's implementation plan and reviewer feedback summary to craft the message. Use `[PR feedback]` as the commit prefix (instead of conventional commit format). Include a `Ref: {PR_COMMENT_URL}` footer to link back to the review comment.

3. **Then**: Proceed with implementation.

This allows the commit message to be drafted early (from the plan) rather than waiting until all changes are complete.

## Quality Checklist

Before finishing initial analysis (Step 7):

- [ ] Comment was fetched successfully with full thread context (if applicable)
- [ ] Scratchpad contains link to source PR comment
- [ ] Implementation plan has specific file/function names
- [ ] Each step is actionable and concrete
- [ ] Recommendations explain the reasoning
- [ ] User was informed if clarification from reviewer is needed

After user approves (Step 8):

- [ ] Asked user if they want a commit message file created
- [ ] If yes, created commit message with `[PR feedback]` prefix and `Ref:` footer
