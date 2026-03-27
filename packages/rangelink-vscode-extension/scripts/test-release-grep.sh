#!/usr/bin/env bash
#
# Run integration tests filtered by a Mocha grep pattern.
# Compiles first, then runs only matching tests. Skips validate:qa-coverage.
# Test output is captured to a timestamped file in qa/ for comparison across runs.
#
# Usage (from project root or extension dir):
#   pnpm test:release:grep "status-bar-menu-002"
#   pnpm test:release:grep "status-bar-menu-002|status-bar-menu-005"
#   pnpm test:release:grep "R-M Status Bar Menu"
#   pnpm test:release:grep "\[assisted\]"

set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: pnpm test:release:grep <pattern>"
  echo ""
  echo "Examples:"
  echo "  pnpm test:release:grep \"status-bar-menu-002\""
  echo "  pnpm test:release:grep \"status-bar-menu-002|status-bar-menu-005\""
  echo "  pnpm test:release:grep \"R-M Status Bar Menu\""
  echo "  pnpm test:release:grep \"\\[assisted\\]\""
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$SCRIPT_DIR/.."
cd "$PACKAGE_ROOT"

QA_DIR="$PACKAGE_ROOT/qa"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
PATTERN="$1"
PATTERN_SLUG=$(echo "$PATTERN" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
REPORT_FILE="$QA_DIR/test-run-${TIMESTAMP}-grep-${PATTERN_SLUG}.txt"
REPO_ROOT="$(git rev-parse --show-toplevel)"
RELATIVE_REPORT="${REPORT_FILE#"$REPO_ROOT"/}"

{
  echo "Test Run Report"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo "Command:   pnpm test:release:grep \"$PATTERN\""
  echo "Mode:      grep"
  echo "Grep:      $PATTERN"
  echo ""
} > "$REPORT_FILE"

echo "Report: $RELATIVE_REPORT"
echo ""

pnpm test:release:prepare

MOCHA_GREP="$PATTERN" npx vscode-test 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a "$REPORT_FILE"
TEST_EXIT=${PIPESTATUS[0]}

echo ""
echo "Report: $RELATIVE_REPORT"

if [[ $TEST_EXIT -ne 0 ]]; then
  FAILED_IDS=$(grep -oE '[a-z][-a-z]*-[0-9]{3}' "$REPORT_FILE" | sort | uniq -d)
  if [[ -n "$FAILED_IDS" ]]; then
    RERUN_PATTERN=$(echo "$FAILED_IDS" | paste -sd '|' -)
    echo ""
    echo "Re-run failed tests:"
    echo "  pnpm test:release:grep \"$RERUN_PATTERN\""
  fi
fi

exit $TEST_EXIT
