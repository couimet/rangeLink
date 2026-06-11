#!/usr/bin/env bash
set -uo pipefail

# Smoke-test all QA scripts in one shot.
#
# Runs each script in a non-destructive mode, verifies exit codes AND
# expected output artifacts. Generated files are kept.
#
# Usage: ./scripts/verify-qa-scripts.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
QA_DIR="$PACKAGE_DIR/qa"

cd "$PACKAGE_DIR" || { echo "Error: cannot cd to $PACKAGE_DIR" >&2; exit 1; }

PASSED=0
FAILED=0
TOTAL=5

run_check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} $name"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}✗${NC} $name"
    FAILED=$((FAILED + 1))
  fi
}

check_artifact() {
  local name="$1"
  local pattern="$2"
  # shellcheck disable=SC2086
  if compgen -G "$QA_DIR"/$pattern >/dev/null 2>&1; then
    echo -e "    → artifact: $pattern"
  else
    echo -e "  ${RED}✗${NC} $name: expected artifact $pattern not found"
    FAILED=$((FAILED + 1))
    PASSED=$((PASSED - 1))
  fi
}

YAML_PATH="$QA_DIR/qa-test-cases.yaml"
if [[ ! -f "$YAML_PATH" ]]; then
  echo -e "${RED}Error: $YAML_PATH not found${NC}" >&2
  exit 1
fi

echo "Verifying QA scripts..."
echo "  Using YAML: $(basename "$YAML_PATH")"
echo ""

run_check "validate-qa-coverage" ./scripts/validate-qa-coverage.sh
check_artifact "validate-qa-coverage" "output/qa-coverage-report-*.txt"

run_check "generate-release-testing-instructions" ./scripts/generate-release-testing-instructions.sh
check_artifact "generate-release-testing-instructions" "release-testing-instructions-*.md"

run_check "generate-qa-test-plan" ./scripts/generate-qa-test-plan.sh
check_artifact "generate-qa-test-plan" "qa-test-cases-*.yaml"

# dry-run produces no artifact — exit code is sufficient
run_check "generate-qa-issue (dry-run)" bash -c 'echo "y" | ./scripts/generate-qa-issue.sh --dry-run'

run_check "generate-qa-issue (local)" bash -c 'echo "y" | ./scripts/generate-qa-issue.sh --local'
check_artifact "generate-qa-issue (local)" "output/qa-checklist-*.md"

echo ""
if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}All ${TOTAL} scripts passed${NC}"
else
  echo -e "${RED}${FAILED}/${TOTAL} scripts failed${NC}"
  exit 1
fi
