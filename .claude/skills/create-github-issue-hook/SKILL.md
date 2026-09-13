---
name: create-github-issue-hook
description: RangeLink issue-label requirements for /create-github-issue. Consulted by the base skill at its label-selection step.
user-invocable: false
allowed-tools: Bash(gh issue view *), Bash(gh issue edit *)
---

# Create-Github-Issue Hook (RangeLink)

Consulted automatically by `/create-github-issue` at its label-selection step. Adds rangeLink-only requirements on top of the base workflow. All creation mechanics stay in the base skill: draft parsing, repo resolution, issue creation, sub-issue and dependency linking. Do not re-implement any of that here.

## Scope

This hook applies to issues created in couimet/rangeLink only. Read the issue URL returned by the base skill, which names the repository that actually received the issue. When the URL is not under https://github.com/couimet/rangeLink/, the hook does not apply: report that, then let the base skill continue with its generic label offer. The cross-repo article-registration issue that `/release-prep` creates in couimet/couimet.github.io carries no labels, so it skips this hook.

## Required Labels

Every issue created in this repo must carry exactly one `type:*` label and exactly one `priority:*` label before it is reported as created.

When either required label is not already determined, ask the user to choose, present the catalogs below, and wait for the answer.

### Type labels (pick ONE)

- `type:bug` — Bug or defect in existing functionality
- `type:chore` — Maintenance or housekeeping
- `type:debt` — Technical debt that needs addressing
- `type:docs` — Documentation improvements
- `type:enhancement` — New feature or enhancement
- `type:refactor` — Code refactoring without behavior change
- `type:test` — Test coverage improvements

### Priority labels (pick ONE)

- `priority:critical` — Must be fixed ASAP
- `priority:high` — High priority
- `priority:medium` — Medium priority
- `priority:low` — Nice to have

### Apply

Run the edit against the issue URL returned by the base skill:

```bash
gh issue edit "<ISSUE_URL>" --add-label "type:<chosen>" --add-label "priority:<chosen>"
```

## Optional Scope Labels

Offer any that apply (optional, not required):

- `scope:core` — rangelink-core-ts package
- `scope:vscode-ext` — rangelink-vscode-extension package
- `scope:test-utils` — rangelink-test-utils package
- `scope:tooling` — Build tools, scripts, CI/CD
- `scope:docs` — Documentation files

## Labels to Avoid

Do NOT use GitHub's default labels: bug, enhancement, duplicate, invalid, wontfix, question, good first issue, help wanted.

## Completion Gate

Report the issue as created only after each prefix count equals one. Count the labels per prefix:

```bash
gh issue view "<ISSUE_URL>" --json labels --jq '[.labels[].name | select(startswith("type:"))] | length'
gh issue view "<ISSUE_URL>" --json labels --jq '[.labels[].name | select(startswith("priority:"))] | length'
```

Each command must print `1`. When a prefix holds more than one label, the issue breaks the one-label-per-prefix contract. Remove the labels that are not the chosen one, then re-run the count:

```bash
gh issue edit "<ISSUE_URL>" --remove-label "<extra-label>"
```

The base skill creates the issue without `--label`, so a second label under a prefix comes from a manual add during the run.
