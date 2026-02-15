---
name: github-issues
description: Conventions for creating GitHub issues — labels, sub-issues, and content rules. Auto-consulted when Claude creates or modifies issues.
user-invocable: false
---

# GitHub Issue Conventions

This skill defines the project-specific conventions for GitHub issues. Claude auto-consults this when creating or modifying issues.

## Required Labels

ALL issues MUST have one `type:*` label AND one `priority:*` label. Optionally add `scope:*` labels for affected packages.

### Type labels (required — pick ONE)

- `type:bug` — Bug or defect in existing functionality
- `type:enhancement` — New feature or enhancement
- `type:debt` — Technical debt that needs addressing
- `type:docs` — Documentation improvements
- `type:refactor` — Code refactoring without behavior change
- `type:test` — Test coverage improvements

### Priority labels (required — pick ONE)

- `priority:critical` — Must be fixed ASAP
- `priority:high` — High priority
- `priority:medium` — Medium priority
- `priority:low` — Nice to have

### Scope labels (optional — pick any that apply)

- `scope:core` — rangelink-core-ts package
- `scope:vscode-ext` — rangelink-vscode-extension package
- `scope:test-utils` — rangelink-test-utils package
- `scope:tooling` — Build tools, scripts, CI/CD
- `scope:docs` — Documentation files

### Labels to avoid

Do NOT use GitHub's default labels: bug, enhancement, duplicate, invalid, wontfix, question, good first issue, help wanted.

## Parent-Child Issues

Use the GraphQL `addSubIssue` mutation for native sub-issue relationships. Never rely only on text links in descriptions (e.g., "Parent: #47").

```bash
# Get node IDs
PARENT_ID=$(gh api repos/:owner/:repo/issues/$PARENT_NUM --jq '.node_id')
CHILD_ID=$(gh api repos/:owner/:repo/issues/$CHILD_NUM --jq '.node_id')

# Link using native API
gh api graphql -H "GraphQL-Features: sub_issues" -f query="
  mutation {
    addSubIssue(input: {issueId: \"$PARENT_ID\", subIssueId: \"$CHILD_ID\"}) {
      clientMutationId
    }
  }
"
```

## No References to Ephemeral Files

NEVER reference `.scratchpads/`, `.claude-questions/`, `.commit-msgs/`, or `.breadcrumbs/` files in GitHub issue content. These files are local/ephemeral and not accessible from GitHub.

- Capture ALL relevant information directly in the issue body
- If a scratchpad references a questions file, inline the decisions in the issue
