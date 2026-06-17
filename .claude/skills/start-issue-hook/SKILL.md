---
name: start-issue-hook
description: QA test case coverage requirements for /start-issue plans. Surfaces /tcs-definition during planning.
user-invocable: false
allowed-tools: Read, Glob
---

# Start-Issue Hook (RangeLink)

Consulted automatically by `/start-issue` during context gathering. Adds QA TC coverage awareness to every issue plan.

## Additional Context Gathering

Read `packages/rangelink-vscode-extension/qa/qa-test-cases.yaml` to understand current TC coverage. Note which feature sections exist and the highest `-NNN` per slug. Optionally glob `packages/rangelink-vscode-extension/src/__integration-tests__/suite/*.test.ts` to map existing test IDs by slug — this helps the plan reference which TCs already exist vs which need drafting.

## Additional Plan Requirements

The plan must include EITHER:

- **A TC-definition step** that invokes `/tcs-definition` to draft new or updated QA test cases — placed BEFORE implementation steps when feasible.
- **An explicit justification in "Assumptions Made"** stating why TCs are not needed for this issue. Valid reasons: internal refactors that don't change user-visible behavior, tooling/infrastructure changes, CI/CD changes, documentation-only changes, dependency bumps with no behavioral impact, changes to `.claude/` skills or agents that don't touch extension runtime code.

If the issue introduces, modifies, or fixes user-visible behavior (new features, changed commands, changed output, new settings, behavior-altering bug fixes), the TC-definition step is REQUIRED — do not skip with an assumption.

## Where the Step Sits

Prefer placing `/tcs-definition` as the first plan step. The skill's draft phase is spec-elicitation — running it before implementation keeps the interview focused on what the feature should do rather than confirming what was built. The skill itself warns when the diff exceeds 1000 lines because the interview drifts from spec-elicitation to implementation-confirmation.

When the TC entries depend on implementation-defined details (schema, exact output format), move the `/tcs-definition` step after the implementation steps but still before `/finish-issue`.

The `/tcs-definition` step body should read:

```
Invoke /tcs-definition to draft QA test cases for the new/changed behavior.
Once TCs are approved and inserted into qa-test-cases.yaml, implement them
one at a time with the tc-implement agent.
```