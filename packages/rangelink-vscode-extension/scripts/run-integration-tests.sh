#!/usr/bin/env bash
set -euo pipefail

# Run VS Code extension integration tests with output captured to a timestamped
# report file in qa/output/. All test filtering resolves through the QA YAML
# (resolve-qa-labels.js) — no string matching on test names.
#
# Usage:
#   ./scripts/run-integration-tests.sh                           # all tests
#   ./scripts/run-integration-tests.sh --automated               # CI-safe (excludes assisted)
#   ./scripts/run-integration-tests.sh --grep "pattern"          # filtered by Mocha grep
#   ./scripts/run-integration-tests.sh --assisted                # only assisted tests
#   ./scripts/run-integration-tests.sh --with-extensions         # installs marketplace extensions
#   ./scripts/run-integration-tests.sh --label "clipboard"       # only tests with matching label
#   ./scripts/run-integration-tests.sh --label "clipboard" --assisted    # label + assisted-only
#   ./scripts/run-integration-tests.sh --label "clipboard" --exclude-assisted  # label + exclude assisted
#   ./scripts/run-integration-tests.sh --exclude-label "requires-extensions"  # exclude labeled tests
#   ./scripts/run-integration-tests.sh --help                    # print usage
#
# Output: qa/output/test-run-<timestamp>-<mode>.txt

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$SCRIPT_DIR/.."
cd "$PACKAGE_ROOT"

# ── Argument parsing ──────────────────────────────────────────────────────────

CONFIG_AUTOMATED=false
CONFIG_EXTENSIONS=false
GREP_PATTERN=""
LABEL_FILTERS=()
EXCLUDE_LABELS=()
ASSISTED_ONLY=false
EXCLUDE_ASSISTED=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help)
      SHOW_HELP=true
      shift
      ;;
    --automated)
      CONFIG_AUTOMATED=true
      shift
      ;;
    --assisted)
      ASSISTED_ONLY=true
      shift
      ;;
    --exclude-assisted)
      EXCLUDE_ASSISTED=true
      shift
      ;;
    --with-extensions)
      CONFIG_EXTENSIONS=true
      shift
      ;;
    --grep)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --grep requires a pattern argument" >&2
        echo "" >&2
        echo "Usage: ./scripts/run-integration-tests.sh --grep <pattern>" >&2
        echo "" >&2
        echo "Examples:" >&2
        echo '  ./scripts/run-integration-tests.sh --grep "status-bar-menu-002"' >&2
        echo '  ./scripts/run-integration-tests.sh --grep "status-bar-menu-002|status-bar-menu-005"' >&2
        exit 1
      fi
      GREP_PATTERN="$2"
      shift 2
      ;;
    --label)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --label requires a label name argument" >&2
        echo "" >&2
        echo "Usage: ./scripts/run-integration-tests.sh --label <label-name>" >&2
        echo "" >&2
        echo "Examples:" >&2
        echo '  ./scripts/run-integration-tests.sh --label clipboard' >&2
        echo '  ./scripts/run-integration-tests.sh --label clipboard --label navigation' >&2
        exit 1
      fi
      LABEL_FILTERS+=("$2")
      shift 2
      ;;
    --exclude-label)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --exclude-label requires a label name argument" >&2
        echo "" >&2
        echo "Usage: ./scripts/run-integration-tests.sh --exclude-label <label-name>" >&2
        echo "" >&2
        echo "Examples:" >&2
        echo '  ./scripts/run-integration-tests.sh --exclude-label requires-extensions' >&2
        exit 1
      fi
      EXCLUDE_LABELS+=("$2")
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run with --help for usage information." >&2
      exit 1
      ;;
  esac
done

if [[ "$SHOW_HELP" == true ]]; then
  echo "Usage: ./scripts/run-integration-tests.sh [flags]"
  echo ""
  echo "Flags:"
  echo "  --automated              Use automated config (20s timeout, excludes assisted)"
  echo "  --with-extensions        Use with-extensions config + install marketplace extensions"
  echo "  --grep <pattern>         Mocha grep filter (AND-combined with resolved label IDs)"
  echo "  --label <name>           Include TCs with this QA YAML label (repeatable, OR within labels)"
  echo "  --exclude-label <name>   Exclude TCs with this QA YAML label (repeatable)"
  echo "  --assisted               Only tests marked automated: assisted in QA YAML"
  echo "  --exclude-assisted       Exclude tests marked automated: assisted in QA YAML"
  echo "  --help                   Print this help and exit"
  echo ""
  echo "Examples:"
  echo "  ./scripts/run-integration-tests.sh --label clipboard"
  echo "  ./scripts/run-integration-tests.sh --label clipboard --assisted"
  echo "  ./scripts/run-integration-tests.sh --automated --exclude-label requires-extensions"
  echo "  ./scripts/run-integration-tests.sh --with-extensions --grep \"claude-code-001\""
  exit 0
fi

# ── Derive config and mode from flags ─────────────────────────────────────────

if [[ "$CONFIG_EXTENSIONS" == true ]]; then
  VSCODE_TEST_CONFIG="--config .vscode-test.with-extensions.mjs"
elif [[ "$CONFIG_AUTOMATED" == true ]]; then
  VSCODE_TEST_CONFIG="--config .vscode-test.automated.mjs"
else
  VSCODE_TEST_CONFIG=""
fi

HAS_FILTER=false
[[ -n "$GREP_PATTERN" || ${#LABEL_FILTERS[@]} -gt 0 ]] && HAS_FILTER=true

if [[ "$CONFIG_EXTENSIONS" == true ]]; then
  REPORT_MODE="with-extensions"
elif [[ "$CONFIG_AUTOMATED" == true ]]; then
  REPORT_MODE="automated"
elif [[ "$HAS_FILTER" == true ]]; then
  REPORT_MODE="grep"
else
  REPORT_MODE="all"
fi

QA_SKIP="$HAS_FILTER"

# ── Resolve TC IDs from QA YAML ───────────────────────────────────────────────

RESOLVED_IDS=""
RESOLVE_ARGS=()

if [[ ${#LABEL_FILTERS[@]} -gt 0 ]]; then
  for label in "${LABEL_FILTERS[@]}"; do
    RESOLVE_ARGS+=("--label" "$label")
  done
fi

if [[ ${#EXCLUDE_LABELS[@]} -gt 0 ]]; then
  for exclude in "${EXCLUDE_LABELS[@]}"; do
    RESOLVE_ARGS+=("--exclude-label" "$exclude")
  done
fi

if [[ "$ASSISTED_ONLY" == true ]]; then
  RESOLVE_ARGS+=("--assisted")
elif [[ "$EXCLUDE_ASSISTED" == true ]]; then
  RESOLVE_ARGS+=("--exclude-assisted")
elif [[ "$CONFIG_AUTOMATED" == true ]]; then
  RESOLVE_ARGS+=("--automated-only")
fi

if [[ ${#RESOLVE_ARGS[@]} -gt 0 ]]; then
  RESOLVED_IDS=$(node "$SCRIPT_DIR/resolve-qa-labels.js" "${RESOLVE_ARGS[@]}") || {
    echo "$RESOLVED_IDS" >&2
    exit 1
  }

  if [[ -z "$RESOLVED_IDS" ]]; then
    echo "Error: filter matched zero tests" >&2
    exit 1
  fi

  RESOLVED_COUNT=$(echo "$RESOLVED_IDS" | wc -l | tr -d ' ')
  echo "Filter resolved ${RESOLVED_COUNT} test(s)"

  if [[ -n "$GREP_PATTERN" ]]; then
    RESOLVED_GREP=$(echo "$RESOLVED_IDS" | paste -sd '|' -)
    GREP_PATTERN="^(?=.*(${RESOLVED_GREP}))(?=.*(${GREP_PATTERN}))"
  else
    GREP_PATTERN=$(echo "$RESOLVED_IDS" | paste -sd '|' -)
  fi
  echo ""
fi

# ── Set MOCHA_GREP ────────────────────────────────────────────────────────────

unset MOCHA_GREP MOCHA_INVERT
if [[ -n "$GREP_PATTERN" ]]; then
  export MOCHA_GREP="$GREP_PATTERN"
fi

# ── Report file ───────────────────────────────────────────────────────────────

OUTPUT_DIR="$PACKAGE_ROOT/qa/output"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")

if [[ -n "$GREP_PATTERN" ]]; then
  PATTERN_SLUG=$(echo "$GREP_PATTERN" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//' | cut -c1-80)
  if [[ "$REPORT_MODE" == "grep" ]]; then
    REPORT_FILE="$OUTPUT_DIR/test-run-${TIMESTAMP}-grep-${PATTERN_SLUG}.txt"
  else
    REPORT_FILE="$OUTPUT_DIR/test-run-${TIMESTAMP}-${REPORT_MODE}-grep-${PATTERN_SLUG}.txt"
  fi
else
  REPORT_FILE="$OUTPUT_DIR/test-run-${TIMESTAMP}-${REPORT_MODE}.txt"
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
RELATIVE_REPORT="${REPORT_FILE#"$REPO_ROOT"/}"

# ── Report header ─────────────────────────────────────────────────────────────

{
  echo "Test Run Report"
  echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo "Args:      $0 $*"
  echo "Mode:      $REPORT_MODE"
  if [[ -n "$GREP_PATTERN" ]]; then
    echo "Grep:      $GREP_PATTERN"
  fi
  echo ""
} > "$REPORT_FILE"

echo "Report output: $RELATIVE_REPORT"
echo ""

# ── Prepare and run ───────────────────────────────────────────────────────────

pnpm test:release:prepare

if [[ "$CONFIG_EXTENSIONS" == true ]]; then
  node "$SCRIPT_DIR/setup-integration-test-settings.js" --suffix -with-ext
fi

strip_ansi() {
  sed 's/\x1b\[[0-9;]*m//g'
}

TEST_EXIT=0
# shellcheck disable=SC2086
npx vscode-test $VSCODE_TEST_CONFIG 2>&1 | strip_ansi | tee -a "$REPORT_FILE" || TEST_EXIT=$?

if [[ -n "$GREP_PATTERN" && $TEST_EXIT -eq 0 ]]; then
  if ! grep -qE '[1-9][0-9]* passing' "$REPORT_FILE"; then
    echo ""
    echo "Error: filter matched no tests. Grep: $GREP_PATTERN" | tee -a "$REPORT_FILE"
    TEST_EXIT=1
  fi
fi

QA_EXIT=0
if [[ "$QA_SKIP" != true ]]; then
  pnpm validate:qa-coverage 2>&1 | strip_ansi | tee -a "$REPORT_FILE" || QA_EXIT=$?
fi

FINAL_EXIT=$((TEST_EXIT > QA_EXIT ? TEST_EXIT : QA_EXIT))

# ── Re-run command (on failure) ───────────────────────────────────────────────

{
  echo ""
  echo "Report complete: $RELATIVE_REPORT"

  if [[ $FINAL_EXIT -ne 0 ]]; then
    FAILED_IDS=$(grep -A1 '^\s*[0-9]\+)\s' "$REPORT_FILE" | grep -oE '[a-z][-a-z]*-[0-9]{3}' | sort -u || true)
    if [[ -n "$FAILED_IDS" ]]; then
      RERUN_PATTERN=$(echo "$FAILED_IDS" | paste -sd '|' -)
      RERUN_CMD="./scripts/run-integration-tests.sh"
      for label in "${LABEL_FILTERS[@]}"; do
        RERUN_CMD="$RERUN_CMD --label \"$label\""
      done
      for exclude in "${EXCLUDE_LABELS[@]}"; do
        RERUN_CMD="$RERUN_CMD --exclude-label \"$exclude\""
      done
      [[ "$ASSISTED_ONLY" == true ]] && RERUN_CMD="$RERUN_CMD --assisted"
      [[ "$EXCLUDE_ASSISTED" == true ]] && RERUN_CMD="$RERUN_CMD --exclude-assisted"
      [[ "$CONFIG_EXTENSIONS" == true ]] && RERUN_CMD="$RERUN_CMD --with-extensions"
      echo ""
      echo ""
      echo "Re-run failed tests:"
      echo "  $RERUN_CMD --grep \"$RERUN_PATTERN\""
    fi
  fi
} | tee -a "$REPORT_FILE"

exit $FINAL_EXIT
