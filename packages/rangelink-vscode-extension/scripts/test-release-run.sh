#!/usr/bin/env bash
#
# Run integration tests with output captured to a timestamped file in qa/.
#
# Usage:
#   ./scripts/test-release-run.sh                            # all tests
#   ./scripts/test-release-run.sh --automated                # CI-safe (skips [assisted])
#   ./scripts/test-release-run.sh --grep "pattern"           # filtered by Mocha grep
#   ./scripts/test-release-run.sh --grep "\[assisted\]"      # only [assisted] tests
#
# Output: qa/test-run-<timestamp>-<mode>.txt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$SCRIPT_DIR/.."
cd "$PACKAGE_ROOT"

MODE="all"
VSCODE_TEST_CONFIG=""
GREP_PATTERN=""
COMMAND="pnpm test:release"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --automated) MODE="automated"; VSCODE_TEST_CONFIG="--config .vscode-test.automated.mjs"; COMMAND="pnpm test:release:automated"; shift ;;
    --grep)
      if [[ $# -lt 2 ]]; then
        echo "Error: --grep requires a pattern argument" >&2
        echo ""
        echo "Usage: pnpm test:release:grep <pattern>"
        echo ""
        echo "Examples:"
        echo "  pnpm test:release:grep \"status-bar-menu-002\""
        echo "  pnpm test:release:grep \"status-bar-menu-002|status-bar-menu-005\""
        echo "  pnpm test:release:grep \"R-M Status Bar Menu\""
        echo "  pnpm test:release:grep \"\\[assisted\\]\""
        exit 1
      fi
      GREP_PATTERN="$2"
      MODE="grep"
      COMMAND="pnpm test:release:grep \"$2\""
      shift 2
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

OUTPUT_DIR="$PACKAGE_ROOT/qa/output"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")

if [[ "$MODE" == "grep" ]]; then
  PATTERN_SLUG=$(echo "$GREP_PATTERN" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
  REPORT_FILE="$OUTPUT_DIR/test-run-${TIMESTAMP}-grep-${PATTERN_SLUG}.txt"
else
  REPORT_FILE="$OUTPUT_DIR/test-run-${TIMESTAMP}-${MODE}.txt"
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
RELATIVE_REPORT="${REPORT_FILE#"$REPO_ROOT"/}"

{
  echo "Test Run Report"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo "Command:   $COMMAND"
  echo "Mode:      $MODE"
  if [[ -n "$GREP_PATTERN" ]]; then
    echo "Grep:      $GREP_PATTERN"
  fi
  echo ""
} > "$REPORT_FILE"

echo "Report: $RELATIVE_REPORT"
echo ""

pnpm test:release:prepare

TEST_EXIT=0
if [[ -n "$GREP_PATTERN" ]]; then
  MOCHA_GREP="$GREP_PATTERN" npx vscode-test 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a "$REPORT_FILE" || TEST_EXIT=$?
else
  # shellcheck disable=SC2086
  npx vscode-test $VSCODE_TEST_CONFIG 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a "$REPORT_FILE" || TEST_EXIT=$?
fi

QA_EXIT=0
if [[ "$MODE" != "grep" ]]; then
  pnpm validate:qa-coverage 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a "$REPORT_FILE" || QA_EXIT=$?
fi

echo ""
echo "Report: $RELATIVE_REPORT"

FINAL_EXIT=$((TEST_EXIT > QA_EXIT ? TEST_EXIT : QA_EXIT))

if [[ $FINAL_EXIT -ne 0 ]]; then
  FAILED_IDS=$(grep -A1 '^\s*[0-9]\+)\s' "$REPORT_FILE" | grep -oE '[a-z][-a-z]*-[0-9]{3}' | sort -u)
  if [[ -n "$FAILED_IDS" ]]; then
    RERUN_PATTERN=$(echo "$FAILED_IDS" | paste -sd '|' -)
    echo ""
    echo "Re-run failed tests:"
    echo "  pnpm test:release:grep \"$RERUN_PATTERN\""
  fi
fi

exit $FINAL_EXIT
