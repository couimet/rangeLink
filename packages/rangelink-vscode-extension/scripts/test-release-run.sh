#!/usr/bin/env bash
#
# Run integration tests with output captured to a timestamped file in qa/.
# Used by test:release and test:release:automated via their pnpm scripts.
#
# Usage:
#   ./scripts/test-release-run.sh                           # all tests (default .vscode-test.mjs)
#   ./scripts/test-release-run.sh --automated               # CI-safe (skips [assisted])
#
# Output: qa/test-run-<mode>-<timestamp>.txt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$SCRIPT_DIR/.."
cd "$PACKAGE_ROOT"

MODE="all"
VSCODE_TEST_CONFIG=""

for arg in "$@"; do
  case "$arg" in
    --automated) MODE="automated"; VSCODE_TEST_CONFIG="--config .vscode-test.automated.mjs" ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

QA_DIR="$PACKAGE_ROOT/qa"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
REPORT_FILE="$QA_DIR/test-run-${MODE}-${TIMESTAMP}.txt"

pnpm test:release:prepare

TEST_EXIT=0
{
  echo "Test Run Report"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo "Mode:      $MODE"
  echo ""
  # shellcheck disable=SC2086
  npx vscode-test $VSCODE_TEST_CONFIG 2>&1
} | sed 's/\x1b\[[0-9;]*m//g' | tee "$REPORT_FILE" || TEST_EXIT=$?

pnpm validate:qa-coverage 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a "$REPORT_FILE"

REPO_ROOT="$(git rev-parse --show-toplevel)"
RELATIVE_REPORT="${REPORT_FILE#"$REPO_ROOT"/}"
echo ""
echo "Report: $RELATIVE_REPORT"

exit $TEST_EXIT
