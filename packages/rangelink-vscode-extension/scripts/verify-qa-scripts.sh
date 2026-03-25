#!/usr/bin/env bash
set -uo pipefail

# Smoke-test all QA scripts in one shot.
#
# Runs each script in a non-destructive mode and reports pass/fail.
# Generated files are kept — they're valid artifacts you may want to inspect.
#
# Usage: ./scripts/verify-qa-scripts.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PACKAGE_DIR"

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

echo "Verifying QA scripts..."
echo ""

# validate-qa-coverage runs first — it must see the pre-existing latest YAML
# before generate-qa-test-plan creates a new one
run_check "validate-qa-coverage" ./scripts/validate-qa-coverage.sh
run_check "generate-release-testing-instructions" ./scripts/generate-release-testing-instructions.sh
run_check "generate-qa-test-plan" ./scripts/generate-qa-test-plan.sh
run_check "generate-qa-checklist" ./scripts/generate-qa-checklist.sh
run_check "generate-qa-issue (dry-run)" bash -c 'echo "y" | ./scripts/generate-qa-issue.sh --dry-run'

echo ""
if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}All ${TOTAL} scripts passed${NC}"
else
  echo -e "${RED}${FAILED}/${TOTAL} scripts failed${NC}"
  exit 1
fi
