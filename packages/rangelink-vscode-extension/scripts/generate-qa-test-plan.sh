#!/usr/bin/env bash
set -euo pipefail

# Usage: ./generate-qa-test-plan.sh
#
# Creates a new QA test plan YAML for the next release cycle by carrying forward
# all test cases from the previous plan with statuses reset to pending.
#
# Reads nextTargetVersion from package.json to name the output file.
# Reads version (last published) to document the scope in the header.
#
# Requires: jq

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(git -C "$PACKAGE_DIR" rev-parse --show-toplevel)"
PACKAGE_JSON="$PACKAGE_DIR/package.json"
QA_DIR="$PACKAGE_DIR/qa"

NEXT_VERSION=$(jq -r '.nextTargetVersion // empty' "$PACKAGE_JSON")
if [[ -z "$NEXT_VERSION" ]]; then
  echo "Error: nextTargetVersion not set in $PACKAGE_JSON — update it before running generate:qa-test-plan" >&2
  exit 1
fi

PUBLISHED_VERSION=$(jq -r '.version // empty' "$PACKAGE_JSON")
if [[ -z "$PUBLISHED_VERSION" ]]; then
  echo "Error: version not set in $PACKAGE_JSON" >&2
  exit 1
fi

TODAY=$(date +%Y-%m-%d)
COMMIT=$(git -C "$REPO_ROOT" rev-parse --short HEAD)
OUTPUT_FILE="$QA_DIR/qa-test-cases-v${NEXT_VERSION}-unreleased-${TODAY}.yaml"

if [[ -f "$OUTPUT_FILE" ]]; then
  echo "Error: $OUTPUT_FILE already exists — remove it first or update nextTargetVersion" >&2
  exit 1
fi

PREVIOUS_YAML=$(find "$QA_DIR" -name 'qa-test-cases-*.yaml' -type f | sort | tail -n 1)
if [[ -z "$PREVIOUS_YAML" ]]; then
  echo "Error: no previous QA YAML found in $QA_DIR" >&2
  exit 1
fi

HEADER="# RangeLink QA Test Cases — v${PUBLISHED_VERSION} → v${NEXT_VERSION} (Unreleased) — ${TODAY}
#
# Scope: Changes accumulated between the vscode-extension-v${PUBLISHED_VERSION} release tag and the current
#        main branch tip, targeting v${NEXT_VERSION}. Created at commit ${COMMIT}.
#
# Source of truth for this QA cycle. Run \`pnpm generate:qa-issue -- qa/$(basename "$OUTPUT_FILE")\`
# to create the corresponding GitHub issue tracker (parent issue + per-section sub-issues).
#
# Schema:
#   id:              Unique test case identifier (TC-NNN)
#   feature:         Feature area / CHANGELOG section
#   scenario:        One-line description of the specific scenario being tested
#   preconditions:   List of required setup steps before executing
#   steps:           Ordered list of test actions
#   expected_result: What a passing run looks like
#   platform:        all | mac | win/linux
#   automated:       false (manual) | true (covered by TypeScript integration tests)
#   status:          pending | pass | fail | skip"

BODY=$(sed '1,/^test_cases:/{ /^#/d; }' "$PREVIOUS_YAML")

BODY=$(echo "$BODY" | sed -E 's/^(    status:) (pass|fail|skip)$/\1 pending/')

{
  echo "$HEADER"
  echo ""
  echo "$BODY"
} > "$OUTPUT_FILE"

RELATIVE_PATH="${OUTPUT_FILE#"$REPO_ROOT"/}"
echo "Created $RELATIVE_PATH — run /qa-suggest to add TCs for new features"
