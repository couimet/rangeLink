---
name: release-prep
version: 2026.08.19.1
description: Finish release tracking after release:lock has run: create the couimet.github.io article-registration issue, add it to the release board, and report all tracking issue URLs. Argument: target version X.Y.Z
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Release Prep

Finish the GitHub tracking artifacts for a release of the VS Code extension after the release lock workflow has run. The lock script (`pnpm release:lock:vscode-extension X.Y.Z`) creates the QA issue and the dev.to issue and adds them to the release board; this skill creates the remaining cross-repo couimet.github.io article-registration issue, adds it to the board, and reports all three URLs.

**Input:** `X.Y.Z` target version (e.g., `/release-prep 2.1.0`)

## Step 1: Verify the release lock completed

The lock workflow must have run first; its console summary prints this skill prompt. Confirm its state:

- `packages/rangelink-vscode-extension/qa/release-testing-instructions-vX.Y.Z.md` exists
- Its frontmatter contains both `qa_issue_url:` and `devto_issue_url:` with real URLs

If either check fails, stop and print: run `pnpm release:lock:vscode-extension X.Y.Z` first, then re-run this skill.

## Step 2: Read the issue URLs from the instructions frontmatter

Extract both URLs from the frontmatter of `packages/rangelink-vscode-extension/qa/release-testing-instructions-vX.Y.Z.md`:

- QA issue URL: the value of `qa_issue_url`
- Dev.to issue URL: the value of `devto_issue_url`

These are the issues the lock script created and already added to the release board.

## Step 3: Check for an existing cross-repo issue

The article-registration issue lives in couimet/couimet.github.io. Check for an existing open issue before creating a new one:

```text
gh issue list --repo couimet/couimet.github.io --state open --search "Register RangeLink X.Y.Z article on the site in:title"
```

If an open issue with that title is returned, reuse its URL for the board step and skip creation. This makes the skill re-runnable.

## Step 4: Create the cross-repo issue

Write a draft body with the Write tool to a temporary file (e.g., `/tmp/release-prep-2.1.0.md`), then invoke the /create-github-issue skill, passing the draft file path as its argument.

The draft needs these elements:

- First line: `**Target repo:** couimet/couimet.github.io` (the /create-github-issue target repo override)
- Title: `Register RangeLink X.Y.Z article on the site`
- Body: reference https://github.com/couimet/couimet.github.io/pull/94 as the registration pattern to follow (the `articles.yml` entry plus associated content). Do NOT embed an `articles.yml` snippet: the PR is the reference, so the body cannot rot as the site template changes
- Blocked-by line: `Blocked by <dev.to issue URL>` so /create-github-issue detects the dependency and links it with its link-dependency.sh script

Generated issues carry no labels. When /create-github-issue runs label discovery, select no labels so the `--label` flag is omitted.

Capture the returned issue URL.

## Step 5: Add the cross-repo issue to the release board

Run:

```text
packages/rangelink-vscode-extension/scripts/add-issue-to-release-board.sh <cross-repo issue URL>
```

The script resolves the `RangeLink vX.Y.Z release` board for the version in package.json, adds the issue, and sets Status to Ready when the board has a Ready option (warn and skip otherwise, matching the release lock script's rule). Pass `--dry-run` to preview without GitHub calls.

## Step 6: Report

Print all three issue URLs and the board link:

```text
QA issue:      <qa issue URL>
Dev.to issue:  <dev.to issue URL>
Cross-repo:    <cross-repo issue URL>
Board:         <board URL>
```

If an existing cross-repo issue was reused, mark it in the report so the reader knows no new issue was created.

## Output Format

Never hard-wrap prose output; each paragraph is one continuous line, with line breaks for structure only.
