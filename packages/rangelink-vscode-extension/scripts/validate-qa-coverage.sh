#!/usr/bin/env bash
#
# Cross-reference validator: QA YAML automated markers ↔ integration test IDs.
#
# Validates three categories:
#   automated: true     → must have a non-[assisted] integration test
#   automated: assisted → must have an [assisted]-tagged integration test
#   automated: false    → must NOT have an integration test (fully manual)
#
# Reads qa/qa-test-cases.yaml. Version comes from package.json.
# Output: qa/output/qa-coverage-report-v<version>-<timestamp>.txt (alongside terminal output)
#
# Usage:
#   ./scripts/validate-qa-coverage.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INTEGRATION_TEST_DIR="$PACKAGE_ROOT/src/__integration-tests__/suite"
QA_DIR="$PACKAGE_ROOT/qa"

# Extract TC IDs from non-[assisted] integration tests.
find_automated_test_ids() {
  if [[ ! -d "$INTEGRATION_TEST_DIR" ]]; then
    echo "Integration test directory not found: $INTEGRATION_TEST_DIR" >&2
    exit 1
  fi

  grep -hE '(test|it|describe|suite)[[:space:]]*\(' "$INTEGRATION_TEST_DIR"/*.test.ts \
    | grep -v '\[assisted\]' \
    | grep -oE '[a-z][-a-z]*-[0-9]{3}' \
    | sort -u || true
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
    | sort -u || true
}

YAML_PATH="$QA_DIR/qa-test-cases.yaml"

if [[ ! -f "$YAML_PATH" ]]; then
  echo "QA YAML file not found: $YAML_PATH" >&2
  exit 1
fi

REPORT_VERSION=$(jq -r '.version // empty' "$PACKAGE_ROOT/package.json")
if [[ -z "$REPORT_VERSION" ]]; then
  echo "Error: .version not set in $PACKAGE_ROOT/package.json" >&2
  exit 1
fi
OUTPUT_DIR="$QA_DIR/output"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
REPORT_FILE="$OUTPUT_DIR/qa-coverage-report-v${REPORT_VERSION}-${TIMESTAMP}.txt"

# Collect all output, write to both terminal and file
{
  echo "QA Coverage Report"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo ""
  echo "QA YAML: ${YAML_PATH#"$PACKAGE_ROOT"/}"
  echo "Tests:   ${INTEGRATION_TEST_DIR#"$PACKAGE_ROOT"/}"
  echo ""

  YAML_AUTOMATED_IDS=$(node "$SCRIPT_DIR/resolve-qa-labels.js" --yaml "$YAML_PATH" --automated-only | sort -u)
  YAML_ASSISTED_IDS=$(node "$SCRIPT_DIR/resolve-qa-labels.js" --yaml "$YAML_PATH" --assisted | sort -u)
  CODE_AUTOMATED_IDS=$(find_automated_test_ids)
  CODE_ASSISTED_IDS=$(find_assisted_test_ids)

  YAML_AUTOMATED_COUNT=$(echo "$YAML_AUTOMATED_IDS" | grep -c . || true)
  YAML_ASSISTED_COUNT=$(echo "$YAML_ASSISTED_IDS" | grep -c . || true)
  YAML_MANUAL_COUNT=$(grep -cE '^\s+automated:\s*["'"'"']?false["'"'"']?\s*$' "$YAML_PATH" || true)
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
echo "Report complete: $RELATIVE_REPORT"

# Exit with error if mismatches were found
if grep -q "FAILED" "$REPORT_FILE"; then
  exit 1
fi
