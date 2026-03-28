#!/usr/bin/env bash
#
# Cross-reference validator: QA YAML automated markers ↔ integration test IDs.
#
# Validates three categories:
#   automated: true     → must have a non-[assisted] integration test
#   automated: assisted → must have an [assisted]-tagged integration test
#   automated: false    → must NOT have an integration test (fully manual)
#
# Output: qa/qa-coverage-report-v<version>-<timestamp>.txt (alongside terminal output)
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

# Extract TC IDs by automated value from YAML.
# Usage: parse_ids_by_automated <yaml_path> <value>
# where <value> is "true", "assisted", or "false"
parse_ids_by_automated() {
  local yaml_path="$1"
  local target_value="$2"
  awk -v target="$target_value" '
    /^[[:space:]]+-[[:space:]]+id:/ {
      gsub(/^[[:space:]]+-[[:space:]]+id:[[:space:]]+/, "")
      gsub(/^'\''|'\''$/, "")
      gsub(/^"/, ""); gsub(/"$/, "")
      current_id = $0
    }
    /^[[:space:]]+automated:/ {
      gsub(/^[[:space:]]+automated:[[:space:]]+/, "")
      if ($0 == target && current_id != "") print current_id
      current_id = ""
    }
  ' "$yaml_path" | sort
}

# Extract TC IDs from non-[assisted] integration tests.
find_automated_test_ids() {
  if [[ ! -d "$INTEGRATION_TEST_DIR" ]]; then
    echo "Integration test directory not found: $INTEGRATION_TEST_DIR" >&2
    exit 1
  fi

  grep -hE '(test|it|describe|suite)[[:space:]]*\(' "$INTEGRATION_TEST_DIR"/*.test.ts \
    | grep -v '\[assisted\]' \
    | grep -oE '[a-z][-a-z]*-[0-9]{3}' \
    | sort -u
}

# Extract TC IDs from [assisted]-tagged integration tests.
find_assisted_test_ids() {
  if [[ ! -d "$INTEGRATION_TEST_DIR" ]]; then
    echo "Integration test directory not found: $INTEGRATION_TEST_DIR" >&2
    exit 1
  fi

  grep -hE '(test|it|describe|suite)[[:space:]]*\(' "$INTEGRATION_TEST_DIR"/*.test.ts \
    | grep '\[assisted\]' \
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
OUTPUT_DIR="$QA_DIR/output"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
REPORT_FILE="$OUTPUT_DIR/qa-coverage-report-${REPORT_VERSION}-${TIMESTAMP}.txt"

# Collect all output, write to both terminal and file
{
  echo "QA Coverage Report"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo ""
  echo "QA YAML: $(relative_path "$YAML_PATH" "$PACKAGE_ROOT")"
  echo "Tests:   $(relative_path "$INTEGRATION_TEST_DIR" "$PACKAGE_ROOT")"
  echo ""

  YAML_AUTOMATED_IDS=$(parse_ids_by_automated "$YAML_PATH" "true")
  YAML_ASSISTED_IDS=$(parse_ids_by_automated "$YAML_PATH" "assisted")
  YAML_MANUAL_IDS=$(parse_ids_by_automated "$YAML_PATH" "false")
  CODE_AUTOMATED_IDS=$(find_automated_test_ids)
  CODE_ASSISTED_IDS=$(find_assisted_test_ids)

  YAML_AUTOMATED_COUNT=$(echo "$YAML_AUTOMATED_IDS" | grep -c . || true)
  YAML_ASSISTED_COUNT=$(echo "$YAML_ASSISTED_IDS" | grep -c . || true)
  YAML_MANUAL_COUNT=$(echo "$YAML_MANUAL_IDS" | grep -c . || true)
  CODE_AUTOMATED_COUNT=$(echo "$CODE_AUTOMATED_IDS" | grep -c . || true)
  CODE_ASSISTED_COUNT=$(echo "$CODE_ASSISTED_IDS" | grep -c . || true)

  echo "YAML automated: true entries:     $YAML_AUTOMATED_COUNT"
  echo "YAML automated: assisted entries:  $YAML_ASSISTED_COUNT"
  echo "YAML automated: false entries:     $YAML_MANUAL_COUNT"
  echo "Integration test IDs (automated):  $CODE_AUTOMATED_COUNT"
  echo "Integration test IDs (assisted):   $CODE_ASSISTED_COUNT"
  echo ""

  HAS_ERRORS=false

  # --- Validate automated: true ↔ non-[assisted] tests ---
  MARKED_AUTO_NO_TEST=$(comm -23 <(echo "$YAML_AUTOMATED_IDS" | grep . || true) <(echo "$CODE_AUTOMATED_IDS" | grep . || true))
  TEST_AUTO_NOT_MARKED=$(comm -13 <(echo "$YAML_AUTOMATED_IDS" | grep . || true) <(echo "$CODE_AUTOMATED_IDS" | grep . || true))

  if [[ -n "$MARKED_AUTO_NO_TEST" ]]; then
    HAS_ERRORS=true
    echo "MISMATCH: Marked automated: true in YAML but no matching integration test:"
    while IFS= read -r id; do
      echo "  - $id"
    done <<< "$MARKED_AUTO_NO_TEST"
    echo ""
  fi

  if [[ -n "$TEST_AUTO_NOT_MARKED" ]]; then
    HAS_ERRORS=true
    echo "MISMATCH: Integration test exists but not marked automated: true in YAML:"
    while IFS= read -r id; do
      echo "  - $id"
    done <<< "$TEST_AUTO_NOT_MARKED"
    echo ""
  fi

  # --- Validate automated: assisted ↔ [assisted]-tagged tests ---
  MARKED_ASSIST_NO_TEST=$(comm -23 <(echo "$YAML_ASSISTED_IDS" | grep . || true) <(echo "$CODE_ASSISTED_IDS" | grep . || true))
  TEST_ASSIST_NOT_MARKED=$(comm -13 <(echo "$YAML_ASSISTED_IDS" | grep . || true) <(echo "$CODE_ASSISTED_IDS" | grep . || true))

  if [[ -n "$MARKED_ASSIST_NO_TEST" ]]; then
    HAS_ERRORS=true
    echo "MISMATCH: Marked automated: assisted in YAML but no matching [assisted] test:"
    while IFS= read -r id; do
      echo "  - $id"
    done <<< "$MARKED_ASSIST_NO_TEST"
    echo ""
  fi

  if [[ -n "$TEST_ASSIST_NOT_MARKED" ]]; then
    HAS_ERRORS=true
    echo "MISMATCH: [assisted] test exists but not marked automated: assisted in YAML:"
    while IFS= read -r id; do
      echo "  - $id"
    done <<< "$TEST_ASSIST_NOT_MARKED"
    echo ""
  fi

  if [[ "$HAS_ERRORS" == true ]]; then
    echo "Validation FAILED — mismatches found."
  else
    echo "Validation PASSED — all automated and assisted markers match integration tests."
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
