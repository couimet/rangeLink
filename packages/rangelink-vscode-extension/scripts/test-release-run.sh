#!/usr/bin/env bash
#
# Run integration tests with output captured to a timestamped file in qa/output/.
#
# Usage:
#   ./scripts/test-release-run.sh                            # all tests
#   ./scripts/test-release-run.sh --automated                # CI-safe (skips [assisted])
#   ./scripts/test-release-run.sh --grep "pattern"           # filtered by Mocha grep
#   ./scripts/test-release-run.sh --grep "\[assisted\]"      # only [assisted] tests
#   ./scripts/test-release-run.sh --with-extensions          # installs Claude Code marketplace extension
#   ./scripts/test-release-run.sh --label "clipboard"         # only tests with matching label in QA YAML
#   ./scripts/test-release-run.sh --label "clipboard" --assisted  # label + assisted-only filter
#   ./scripts/test-release-run.sh --label "clipboard" --no-assisted # label + exclude assisted tests
#
# Output: qa/output/test-run-<timestamp>-<mode>.txt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$SCRIPT_DIR/.."
cd "$PACKAGE_ROOT"

MODE="all"
VSCODE_TEST_CONFIG=""
GREP_PATTERN=""
COMMAND="pnpm test:release"
WITH_EXTENSIONS=false
LABEL_FILTER=""
ASSISTED_ONLY=false
NO_ASSISTED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --automated) MODE="automated"; VSCODE_TEST_CONFIG="--config .vscode-test.automated.mjs"; COMMAND="pnpm test:release:automated"; shift ;;
    --assisted) ASSISTED_ONLY=true; shift ;;
    --no-assisted) NO_ASSISTED=true; shift ;;
    --with-extensions) MODE="with-extensions"; VSCODE_TEST_CONFIG="--config .vscode-test.with-extensions.mjs"; COMMAND="pnpm test:release:with-extensions"; WITH_EXTENSIONS=true; shift ;;
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
      if [[ "$MODE" == "all" ]]; then
        MODE="grep"
        COMMAND="pnpm test:release:grep \"$2\""
      else
        COMMAND="$COMMAND --grep \"$2\""
      fi
      shift 2
      ;;
    --label)
      if [[ $# -lt 2 ]]; then
        echo "Error: --label requires a label name argument" >&2
        echo ""
        echo "Usage: ./scripts/test-release-run.sh --label <label-name>"
        echo ""
        echo "Examples:"
        echo "  ./scripts/test-release-run.sh --label clipboard"
        echo "  ./scripts/test-release-run.sh --with-extensions --label clipboard"
        exit 1
      fi
      LABEL_FILTER="$2"
      shift 2
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Resolve --label to test IDs from the latest QA YAML
if [[ -n "$LABEL_FILTER" ]]; then
  RESOLVE_ARGS=("--label" "$LABEL_FILTER")
  [[ "$ASSISTED_ONLY" == true ]] && RESOLVE_ARGS+=("--assisted")
  [[ "$NO_ASSISTED" == true ]] && RESOLVE_ARGS+=("--no-assisted")

  LABEL_IDS=$(node "$SCRIPT_DIR/resolve-qa-labels.js" "${RESOLVE_ARGS[@]}") || {
    echo "$LABEL_IDS" >&2
    exit 1
  }

  LABEL_GREP=$(echo "$LABEL_IDS" | paste -sd '|' -)
  LABEL_COUNT=$(echo "$LABEL_IDS" | wc -l | tr -d ' ')
  echo "Label '$LABEL_FILTER' matched ${LABEL_COUNT} test(s): $LABEL_GREP"
  echo ""

  if [[ -n "$GREP_PATTERN" ]]; then
    GREP_PATTERN="$GREP_PATTERN|$LABEL_GREP"
    COMMAND="$COMMAND --grep \"$LABEL_GREP\""
  else
    GREP_PATTERN="$LABEL_GREP"
    if [[ "$MODE" == "all" ]]; then
      MODE="grep"
      COMMAND="pnpm test:release:grep \"$LABEL_GREP\""
    else
      COMMAND="$COMMAND --grep \"$LABEL_GREP\""
    fi
  fi
fi

if [[ -z "$GREP_PATTERN" ]] && ([[ "$MODE" == "automated" ]] || [[ "$NO_ASSISTED" == true ]]); then
  export MOCHA_GREP='\[assisted\]'
  export MOCHA_INVERT=true
fi

OUTPUT_DIR="$PACKAGE_ROOT/qa/output"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")

if [[ -n "$GREP_PATTERN" ]]; then
  PATTERN_SLUG=$(echo "$GREP_PATTERN" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//' | cut -c1-80)
  if [[ "$MODE" == "grep" ]]; then
    REPORT_FILE="$OUTPUT_DIR/test-run-${TIMESTAMP}-grep-${PATTERN_SLUG}.txt"
  else
    REPORT_FILE="$OUTPUT_DIR/test-run-${TIMESTAMP}-${MODE}-grep-${PATTERN_SLUG}.txt"
  fi
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
# shellcheck disable=SC2086
if [[ -n "$GREP_PATTERN" ]]; then
  export MOCHA_GREP="$GREP_PATTERN"
fi
npx vscode-test $VSCODE_TEST_CONFIG 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a "$REPORT_FILE" || TEST_EXIT=$?

if [[ -n "$GREP_PATTERN" && $TEST_EXIT -eq 0 ]]; then
  if ! grep -qE '[1-9][0-9]* passing' "$REPORT_FILE"; then
    echo ""
    echo "Error: --grep matched no tests. Pattern: $GREP_PATTERN" | tee -a "$REPORT_FILE"
    TEST_EXIT=1
  fi
fi

QA_EXIT=0
if [[ -z "$GREP_PATTERN" && "$MODE" != "grep" ]]; then
  pnpm validate:qa-coverage 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tee -a "$REPORT_FILE" || QA_EXIT=$?
fi

FINAL_EXIT=$((TEST_EXIT > QA_EXIT ? TEST_EXIT : QA_EXIT))

{
  echo ""
  echo "Report: $RELATIVE_REPORT"

  if [[ $FINAL_EXIT -ne 0 ]]; then
    FAILED_IDS=$(grep -A1 '^\s*[0-9]\+)\s' "$REPORT_FILE" | grep -oE '[a-z][-a-z]*-[0-9]{3}' | sort -u)
    if [[ -n "$FAILED_IDS" ]]; then
      RERUN_PATTERN=$(echo "$FAILED_IDS" | paste -sd '|' -)
      RERUN_CMD="./scripts/test-release-run.sh"
      if [[ -n "$LABEL_FILTER" ]]; then
        RERUN_CMD="$RERUN_CMD --label \"$LABEL_FILTER\""
      fi
      if [[ "$ASSISTED_ONLY" == "true" ]]; then
        RERUN_CMD="$RERUN_CMD --assisted"
      fi
      if [[ "$NO_ASSISTED" == "true" ]]; then
        RERUN_CMD="$RERUN_CMD --no-assisted"
      fi
      if [[ "$WITH_EXTENSIONS" == "true" ]]; then
        RERUN_CMD="$RERUN_CMD --with-extensions"
      fi
      echo ""
      echo ""
      echo "Re-run failed tests:"
      echo "  $RERUN_CMD --grep \"$RERUN_PATTERN\""
    fi
  fi
} | tee -a "$REPORT_FILE"

exit $FINAL_EXIT
