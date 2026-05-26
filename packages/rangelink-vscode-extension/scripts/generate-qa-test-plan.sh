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
# Filename: qa-test-cases-v<version>.yaml, or qa-test-cases-unreleased.yaml when nextTargetVersion is "Unreleased".
# Always regenerates: header is freshly emitted, body is carried forward from the highest-sorted existing yaml.
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

# Version-aware filename + label. "Unreleased" is the placeholder used during
# trunk-based development before finalize-release locks in a SemVer.
if [[ "$NEXT_VERSION" == "Unreleased" ]]; then
  NEXT_LABEL="Unreleased"
  BASE_NAME="qa-test-cases-unreleased"
else
  NEXT_LABEL="v${NEXT_VERSION}"
  BASE_NAME="qa-test-cases-v${NEXT_VERSION}"
fi
OUTPUT_FILE="$QA_DIR/${BASE_NAME}.yaml"

# Prefer the existing target file as the carry-forward source so in-progress
# unreleased edits aren't clobbered by a versioned file that would win the
# ASCII sort ('u' < 'v').
if [[ -f "$OUTPUT_FILE" ]]; then
  PREVIOUS_YAML="$OUTPUT_FILE"
else
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
fi

HEADER="# RangeLink QA Test Cases — v${PUBLISHED_VERSION} → ${NEXT_LABEL}
#
# Scope: Changes accumulated between the vscode-extension-v${PUBLISHED_VERSION} release tag and the current
#        main branch tip, targeting ${NEXT_LABEL}.
#
# Source of truth for this QA cycle. Run \`pnpm generate:qa-issue -- qa/$(basename "$OUTPUT_FILE")\`
# to create the corresponding GitHub issue tracker (parent issue + per-section sub-issues).
#
# Schema:
#   id:              Unique test case identifier (<feature-slug>-NNN)
#   feature:         Feature area
#   scenario:        One-line description of what is tested
#   labels:          Optional tags (e.g., cursor, ubuntu, requires-extensions)
#   preconditions:   Required setup steps — only on \`automated: false\` entries
#   steps:           Ordered test actions — only on \`automated: false\` entries
#   expected_result: What a passing run looks like
#   automated:       Coverage status:
#                      true     — covered by a non-[assisted] integration test in
#                                 src/__integration-tests__/suite/ (runs in CI)
#                      assisted — covered by an [assisted]-tagged integration test
#                                 that pauses for a human UI action
#                      false    — fully manual; preconditions and steps are required
#   non_automatable_reason: Required when \`automated: false\`. Why this TC cannot be
#                           automated (even assisted):
#                             platform-specific — requires Win/Linux; CI runs on macOS
#                             ide-specific      — requires Cursor IDE; not in VS Code host"

BODY=$(sed -n '/^test_cases:/,$p' "$PREVIOUS_YAML")

{
  echo "$HEADER"
  echo ""
  echo "$BODY"
} > "$OUTPUT_FILE"

RELATIVE_PATH="${OUTPUT_FILE#"$REPO_ROOT"/}"
echo "Created $RELATIVE_PATH — run /qa-suggest to add TCs for new features"
