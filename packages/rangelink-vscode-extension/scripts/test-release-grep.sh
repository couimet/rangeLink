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
REPORT_FILE="$QA_DIR/test-run-${PATTERN_SLUG}-${TIMESTAMP}.txt"

pnpm test:release:prepare

{
  echo "Test Run Report"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo "Grep:      $PATTERN"
  echo ""
  MOCHA_GREP="$PATTERN" npx vscode-test 2>&1
} | sed 's/\x1b\[[0-9;]*m//g' | tee "$REPORT_FILE"

REPO_ROOT="$(git rev-parse --show-toplevel)"
RELATIVE_REPORT="${REPORT_FILE#"$REPO_ROOT"/}"
echo ""
echo "Report: $RELATIVE_REPORT"
