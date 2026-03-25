#!/usr/bin/env bash
#
# Cross-reference validator: QA YAML `automated: true` markers ↔ integration test IDs.
#
# Parses the QA YAML for entries marked `automated: true`, scans integration test files
# for matching TC IDs in test()/describe() blocks, and reports mismatches in both directions.
#
# Output: qa/qa-coverage-report-v<version>.txt (alongside terminal output)
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
  # Suffix sort fix: unsuffixed files (v1.1.0.yaml) sort AFTER suffixed files
  # (v1.1.0-001.yaml) because '.' > '-' in ASCII. Normalize by appending -000
  # to unsuffixed names for sorting purposes, then pick the highest.
  local latest
  latest=$(
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

# Derive version from YAML filename for the report file
YAML_BASENAME=$(basename "$YAML_PATH" .yaml)
YAML_REST="${YAML_BASENAME#qa-test-cases-}"
if [[ "$YAML_REST" =~ ^(.*)-[0-9]{3}$ ]]; then
  REPORT_VERSION="${BASH_REMATCH[1]}"
else
  REPORT_VERSION="$YAML_REST"
fi
REPORT_FILE="$QA_DIR/qa-coverage-report-${REPORT_VERSION}.txt"

# Collect all output, write to both terminal and file
{
  echo "QA Coverage Report"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo ""
  echo "QA YAML: $(relative_path "$YAML_PATH" "$PACKAGE_ROOT")"
  echo "Tests:   $(relative_path "$INTEGRATION_TEST_DIR" "$PACKAGE_ROOT")"
  echo ""

  AUTOMATED_IDS=$(parse_automated_ids "$YAML_PATH")
  TEST_IDS=$(find_test_ids)

  AUTOMATED_COUNT=$(echo "$AUTOMATED_IDS" | grep -c . || true)
  TEST_COUNT=$(echo "$TEST_IDS" | grep -c . || true)

  echo "YAML automated: true entries: $AUTOMATED_COUNT"
  echo "Integration test IDs found:   $TEST_COUNT"
  echo ""

  MARKED_BUT_NO_TEST=$(comm -23 <(echo "$AUTOMATED_IDS" | grep .) <(echo "$TEST_IDS" | grep .))
  TEST_BUT_NOT_MARKED=$(comm -13 <(echo "$AUTOMATED_IDS" | grep .) <(echo "$TEST_IDS" | grep .))

  HAS_ERRORS=false

  if [[ -n "$MARKED_BUT_NO_TEST" ]]; then
    HAS_ERRORS=true
    echo "MISMATCH: Marked automated: true in YAML but no matching integration test:"
    while IFS= read -r id; do
      echo "  - $id"
    done <<< "$MARKED_BUT_NO_TEST"
    echo ""
  fi

  if [[ -n "$TEST_BUT_NOT_MARKED" ]]; then
    HAS_ERRORS=true
    echo "MISMATCH: Integration test exists but not marked automated: true in YAML:"
    while IFS= read -r id; do
      echo "  - $id"
    done <<< "$TEST_BUT_NOT_MARKED"
    echo ""
  fi

  if [[ "$HAS_ERRORS" == true ]]; then
    echo "Validation FAILED — mismatches found."
  else
    echo "Validation PASSED — all automated markers match integration tests."
  fi
} 2>&1 | tee "$REPORT_FILE"

REPO_ROOT="$(git -C "$PACKAGE_ROOT" rev-parse --show-toplevel)"
RELATIVE_REPORT="${REPORT_FILE#"$REPO_ROOT"/}"
echo ""
echo "Report: $RELATIVE_REPORT"

# Exit with error if mismatches were found
if grep -q "FAILED" "$REPORT_FILE"; then
  exit 1
fi
