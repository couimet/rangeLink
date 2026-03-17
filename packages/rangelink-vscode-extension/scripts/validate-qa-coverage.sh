#!/usr/bin/env bash
#
# Cross-reference validator: QA YAML `automated: true` markers ↔ integration test IDs.
#
# Parses the QA YAML for entries marked `automated: true`, scans integration test files
# for matching TC IDs in test()/describe() blocks, and reports mismatches in both directions.
#
# Usage:
#   ./scripts/validate-qa-coverage.sh [path-to-yaml]
#
# Defaults to the latest QA YAML in qa/ if no argument is provided.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INTEGRATION_TEST_DIR="$PACKAGE_ROOT/src/__integration-tests__/suite"
QA_DIR="$PACKAGE_ROOT/qa"

relative_path() {
  python3 -c "import os.path; print(os.path.relpath('$1', '$2'))"
}

find_latest_qa_yaml() {
  # Among YAML files sharing a date prefix, revision suffixes (-002, -003) are newer.
  # Sort by filename length descending (longer = has suffix = newer), then by name.
  local latest
  latest=$(ls "$QA_DIR"/qa-test-cases*.yaml 2>/dev/null \
    | awk '{ print length, $0 }' \
    | sort -k1,1rn -k2,2 \
    | head -1 \
    | cut -d' ' -f2-)
  if [[ -z "$latest" ]]; then
    echo "No QA YAML files found in $QA_DIR" >&2
    exit 1
  fi
  echo "$latest"
}

# Extract TC IDs where automated: true from YAML.
# Strategy: pair each `id:` line with its `automated:` line using awk.
# Assumes the YAML schema places `id:` before `automated:` in each test case entry.
# current_id is set on `id:` match and cleared on `automated: true/false` match.
parse_automated_ids() {
  local yaml_path="$1"
  awk '
    /^[[:space:]]+-[[:space:]]+id:/ {
      gsub(/^[[:space:]]+-[[:space:]]+id:[[:space:]]+/, "")
      gsub(/^'\''|'\''$/, "")
      gsub(/^"/, ""); gsub(/"$/, "")
      current_id = $0
    }
    /^[[:space:]]+automated:[[:space:]]+true/ {
      if (current_id != "") print current_id
      current_id = ""
    }
    /^[[:space:]]+automated:[[:space:]]+false/ {
      current_id = ""
    }
  ' "$yaml_path" | sort
}

# Extract TC IDs from integration test files.
# Looks for test()/it()/describe()/suite() calls containing slug-NNN patterns.
find_test_ids() {
  if [[ ! -d "$INTEGRATION_TEST_DIR" ]]; then
    echo "Integration test directory not found: $INTEGRATION_TEST_DIR" >&2
    exit 1
  fi

  grep -hE '(test|it|describe|suite)[[:space:]]*\(' "$INTEGRATION_TEST_DIR"/*.test.ts \
    | grep -oE '[a-z][-a-z]*-[0-9]{3}' \
    | sort -u
}

YAML_PATH="${1:-$(find_latest_qa_yaml)}"

if [[ ! -f "$YAML_PATH" ]]; then
  echo "QA YAML file not found: $YAML_PATH" >&2
  exit 1
fi

echo "QA YAML: $(relative_path "$YAML_PATH" "$PACKAGE_ROOT")"
echo "Tests:   $(relative_path "$INTEGRATION_TEST_DIR" "$PACKAGE_ROOT")"
echo

AUTOMATED_IDS=$(parse_automated_ids "$YAML_PATH")
TEST_IDS=$(find_test_ids)

AUTOMATED_COUNT=$(echo "$AUTOMATED_IDS" | grep -c . || true)
TEST_COUNT=$(echo "$TEST_IDS" | grep -c . || true)

echo "YAML automated: true entries: $AUTOMATED_COUNT"
echo "Integration test IDs found:   $TEST_COUNT"
echo

MARKED_BUT_NO_TEST=$(comm -23 <(echo "$AUTOMATED_IDS" | grep .) <(echo "$TEST_IDS" | grep .))
TEST_BUT_NOT_MARKED=$(comm -13 <(echo "$AUTOMATED_IDS" | grep .) <(echo "$TEST_IDS" | grep .))

HAS_ERRORS=false

if [[ -n "$MARKED_BUT_NO_TEST" ]]; then
  HAS_ERRORS=true
  echo "MISMATCH: Marked automated: true in YAML but no matching integration test:" >&2
  while IFS= read -r id; do
    echo "  - $id" >&2
  done <<< "$MARKED_BUT_NO_TEST"
  echo >&2
fi

if [[ -n "$TEST_BUT_NOT_MARKED" ]]; then
  HAS_ERRORS=true
  echo "MISMATCH: Integration test exists but not marked automated: true in YAML:" >&2
  while IFS= read -r id; do
    echo "  - $id" >&2
  done <<< "$TEST_BUT_NOT_MARKED"
  echo >&2
fi

if [[ "$HAS_ERRORS" == true ]]; then
  echo "Validation FAILED — mismatches found." >&2
  exit 1
fi

echo "Validation PASSED — all automated markers match integration tests."
