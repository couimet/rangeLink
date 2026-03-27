#!/usr/bin/env bash
#
# Run integration tests with output captured to a timestamped file in qa/.
# Used by test:release and test:release:automated via their pnpm scripts.
#
# Usage:
#   ./scripts/test-release-run.sh                           # all tests (default .vscode-test.mjs)
#   ./scripts/test-release-run.sh --automated               # CI-safe (skips [assisted])
#
# Output: qa/test-run-<timestamp>-<mode>.txt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$SCRIPT_DIR/.."
cd "$PACKAGE_ROOT"

MODE="all"
VSCODE_TEST_CONFIG=""
COMMAND="pnpm test:release"

for arg in "$@"; do
  case "$arg" in
    --automated) MODE="automated"; VSCODE_TEST_CONFIG="--config .vscode-test.automated.mjs"; COMMAND="pnpm test:release:automated" ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

QA_DIR="$PACKAGE_ROOT/qa"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
REPORT_FILE="$QA_DIR/test-run-${TIMESTAMP}-${MODE}.txt"
REPO_ROOT="$(git rev-parse --show-toplevel)"
RELATIVE_REPORT="${REPORT_FILE#"$REPO_ROOT"/}"

{
  echo "Test Run Report"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo "Command:   $COMMAND"
  echo "Mode:      $MODE"
  echo ""
} > "$REPORT_FILE"

echo "Report: $RELATIVE_REPORT"
echo ""

pnpm test:release:prepare

TEST_EXIT=0
# shellcheck disable=SC2086
npx vscode-test $VSCODE_TEST_CONFIG 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a "$REPORT_FILE" || TEST_EXIT=$?

pnpm validate:qa-coverage 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a "$REPORT_FILE"

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
