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
# Filename: qa-test-cases-v<version>[-NNN].yaml
# Reruns append a suffix: -001, -002, etc.
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

COMMIT=$(git -C "$REPO_ROOT" rev-parse --short HEAD)
BASE_NAME="qa-test-cases-v${NEXT_VERSION}"
OUTPUT_FILE="$QA_DIR/${BASE_NAME}.yaml"

if [[ -f "$OUTPUT_FILE" ]]; then
  MAX_SUFFIX=0
  for existing in "$QA_DIR/${BASE_NAME}"-[0-9][0-9][0-9].yaml; do
    [[ -e "$existing" ]] || continue
    suffix="${existing%.yaml}"
    suffix="${suffix##*-}"
    num=$((10#$suffix))
    [[ $num -gt $MAX_SUFFIX ]] && MAX_SUFFIX=$num
  done
  NEXT_SUFFIX=$((MAX_SUFFIX + 1))
  OUTPUT_FILE="$QA_DIR/${BASE_NAME}-$(printf '%03d' "$NEXT_SUFFIX").yaml"
fi

# Suffix sort fix: unsuffixed files (v1.1.0.yaml) sort AFTER suffixed files
# (v1.1.0-001.yaml) because '.' > '-' in ASCII. Normalize by appending -000
# to unsuffixed names for sorting purposes, then pick the highest.
PREVIOUS_YAML=$(
  for f in "$QA_DIR"/qa-test-cases-*.yaml; do
    [[ -e "$f" ]] || continue
    name=$(basename "$f")
    base="${name%.yaml}"
    if [[ "$base" =~ -[0-9]{3}$ ]]; then
      printf '%s\t%s\n' "$base" "$f"
    else
      printf '%s-000\t%s\n' "$base" "$f"
    fi
  done | sort -t$'\t' -k1,1 | tail -1 | cut -f2
)
if [[ -z "$PREVIOUS_YAML" ]]; then
  echo "Error: no previous QA YAML found in $QA_DIR" >&2
  exit 1
fi

HEADER="# RangeLink QA Test Cases — v${PUBLISHED_VERSION} → v${NEXT_VERSION}
#
# Scope: Changes accumulated between the vscode-extension-v${PUBLISHED_VERSION} release tag and the current
#        main branch tip, targeting v${NEXT_VERSION}. Created at commit ${COMMIT}.
#
# Source of truth for this QA cycle. Run \`pnpm generate:qa-issue -- qa/$(basename "$OUTPUT_FILE")\`
# to create the corresponding GitHub issue tracker (parent issue + per-section sub-issues).
#
# Schema:
#   id:              Unique test case identifier (<feature-slug>-NNN)
#   feature:         Feature area / CHANGELOG section
#   scenario:        One-line description of the specific scenario being tested
#   preconditions:   List of required setup steps before executing
#   steps:           Ordered list of test actions
#   expected_result: What a passing run looks like
#   automated:       false (manual) | true (covered by TypeScript integration tests)"

BODY=$(sed '1,/^test_cases:/{ /^#/d; }' "$PREVIOUS_YAML")

{
  echo "$HEADER"
  echo ""
  echo "$BODY"
} > "$OUTPUT_FILE"

RELATIVE_PATH="${OUTPUT_FILE#"$REPO_ROOT"/}"
echo "Created $RELATIVE_PATH — run /qa-suggest to add TCs for new features"
