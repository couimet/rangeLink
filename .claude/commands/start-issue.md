---
allowed-tools: Read, Bash(gh:*), Write, Glob
argument-hint: <github-issue-url>
description: Start working on a GitHub issue - analyze it and create a scratchpad with questions
---

# Start GitHub Issue Workflow

## Context

Issue URL: $ARGUMENTS

Fetch the issue details:
!`gh issue view $ARGUMENTS --json title,body,number,state,labels`

## Your Tasks

1. **Analyze the issue** - Read and understand the requirements, acceptance criteria, and any linked context

2. **Create a scratchpad** - Use `Glob(pattern="*.txt", path=".scratchpads/")` to find the highest NNNN, increment by 1, then create `.scratchpads/NNNN-issue-NUMBER-description.txt` with:
   - Issue summary
   - Key requirements
   - Acceptance criteria (if specified)
   - Initial implementation approach
   - Open questions

3. **Create questions file (if needed)** - If you have questions that need user input, use `Glob(pattern="*.txt", path=".claude-questions/")` to find the next number, then create `.claude-questions/NNNN-issue-NUMBER-questions.txt` following this format:

   ```
   # Questions for Issue #NUMBER

   ## Question 001: <question with options/recommendations>

   Answer: [prefilled recommended answer when available]

   ---
   ```

4. **Report status** - Print the paths of created files so the user knows what was prepared

## Important

- Follow all CLAUDE.md rules (use .txt extension, focus on WHY not WHAT, etc.)
- Be thorough in analysis but concise in documentation
- Prefill recommended answers when you have a clear recommendation
