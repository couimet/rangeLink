#!/usr/bin/env bash
set -euo pipefail

# Build a PR CI summary comment body.
# Usage: build-pr-comment.sh [options]
# Outputs the markdown body to stdout.
#
# Relies on GHA built-in env vars GITHUB_SERVER_URL, GITHUB_REPOSITORY, and GITHUB_RUN_ID
# for the "View run & artifacts" link.

usage() {
  echo "Usage: build-pr-comment.sh [options]" >&2
  echo "" >&2
  echo "  --title         Heading text (required)" >&2
  echo "  --unit-passed   Number of unit tests passed (default: '')" >&2
  echo "  --unit-total    Total unit tests (default: '')" >&2
  echo "  --int-passing   Integration tests passing (default: '')" >&2
  echo "  --int-failed    Integration tests failed (default: '')" >&2
  echo "  --int-total     Total integration tests exercised (default: '')" >&2
  echo "  --report-file   Path to the test report file (default: '')" >&2
  echo "  --label-filter  TC ID label filter (default: '')" >&2
  echo "  --job-start     Epoch seconds when CI job started (required)" >&2
  exit 2
}

TITLE=""
UNIT_PASSED=""
UNIT_TOTAL=""
INT_PASSING=""
INT_FAILED=""
INT_TOTAL=""
REPORT_FILE=""
LABEL_FILTER=""
JOB_START=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --title requires a value" >&2
        usage
      fi
      TITLE="$2"
      shift 2
      ;;
    --unit-passed)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --unit-passed requires a value" >&2
        usage
      fi
      UNIT_PASSED="$2"
      shift 2
      ;;
    --unit-total)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --unit-total requires a value" >&2
        usage
      fi
      UNIT_TOTAL="$2"
      shift 2
      ;;
    --int-passing)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --int-passing requires a value" >&2
        usage
      fi
      INT_PASSING="$2"
      shift 2
      ;;
    --int-failed)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --int-failed requires a value" >&2
        usage
      fi
      INT_FAILED="$2"
      shift 2
      ;;
    --int-total)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --int-total requires a value" >&2
        usage
      fi
      INT_TOTAL="$2"
      shift 2
      ;;
    --report-file)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --report-file requires a value" >&2
        usage
      fi
      REPORT_FILE="$2"
      shift 2
      ;;
    --label-filter)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --label-filter requires a value" >&2
        usage
      fi
      LABEL_FILTER="$2"
      shift 2
      ;;
    --job-start)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --job-start requires a value" >&2
        usage
      fi
      JOB_START="$2"
      shift 2
      ;;
    -*)
      usage
      ;;
    *)
      echo "Error: unexpected argument: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$TITLE" ]]; then
  echo "Error: --title is required" >&2
  usage
fi
if [[ -z "$JOB_START" ]]; then
  echo "Error: --job-start is required" >&2
  usage
fi

# Duration
NOW=$(date +%s)
ELAPSED=$(( NOW - JOB_START ))
DURATION_STR="$(( ELAPSED / 60 ))m $(( ELAPSED % 60 ))s"

# Extract tc_total from embedded RESOLVED_JSON block; resolve feature breakdown dynamically
TC_TOTAL=0
if [[ -n "$REPORT_FILE" && -f "$REPORT_FILE" ]]; then
  RESOLVED_JSON=$(sed -n '/++RESOLVED_JSON_START++/,/++RESOLVED_JSON_END++/p' "$REPORT_FILE" | sed '1d;$d')
  TC_TOTAL=$(echo "$RESOLVED_JSON" | jq -r '.tc_total // 0')
fi

FILTER_ARGS_RAW=$(echo "$RESOLVED_JSON" | jq -r '.filter_args // [] | join(" ")' 2>/dev/null || echo '')
QA_JSON=$(node packages/rangelink-vscode-extension/scripts/resolve-qa-labels.js $FILTER_ARGS_RAW --json 2>/dev/null || echo '{"groups":[]}')
FEATURE_GROUPS=$(echo "$QA_JSON" | jq '.groups // [] | group_by(.feature)')
FEATURE_COUNT=$(echo "$FEATURE_GROUPS" | jq 'length')
FEATURE_TABLE=$(echo "$FEATURE_GROUPS" | jq -r 'map("| \(.[0].feature) | \(map(.total) | add) | \(map(.ids[]) | join(", ")) |") | join("\n")')

# Determine pass/fail
PASS=true
MISSING_INT_REPORT=false
if [[ -n "$UNIT_TOTAL" && "$UNIT_PASSED" != "$UNIT_TOTAL" ]]; then
  PASS=false
fi
if [[ -n "$INT_FAILED" && "$INT_FAILED" != "0" ]]; then
  PASS=false
fi

# Build table body (title with icon is prepended after pass/fail is finalized)
TABLE="| | |"
TABLE="${TABLE}"$'\n'"|---|---|"
TABLE="${TABLE}"$'\n'"| Duration | ${DURATION_STR} |"

if [[ -n "$UNIT_TOTAL" ]]; then
  TABLE="${TABLE}"$'\n'"| Unit tests passed | ${UNIT_PASSED} / ${UNIT_TOTAL} |"
fi

if [[ "$LABEL_FILTER" = "requires-extensions" ]]; then
  TABLE="${TABLE}"$'\n'"| Unit tests | Ran in Test &amp; Validate job |"
fi

if [[ -n "$INT_TOTAL" && "$INT_TOTAL" != "0" ]]; then
  INT_CELL="${INT_PASSING}/${INT_TOTAL} passed"
  if [[ -n "$INT_FAILED" && "$INT_FAILED" != "0" ]]; then
    INT_CELL="${INT_CELL} (${INT_FAILED} failed)"
  fi
  TABLE="${TABLE}"$'\n'"| Integration tests | ${INT_CELL} |"
fi

# Detect missing test report (runner crash before producing stats)
if { [[ -z "$INT_PASSING" || "$INT_PASSING" = "0" ]]; } && { [[ -z "$INT_FAILED" || "$INT_FAILED" = "0" ]]; }; then
  if [[ -n "$REPORT_FILE" ]] && { [[ ! -f "$REPORT_FILE" ]] || ! grep -qE '[0-9]+ (passing|failing)' "$REPORT_FILE" 2>/dev/null; }; then
    MISSING_INT_REPORT=true
    TABLE="${TABLE}"$'\n'"| \342\232\240\357\270\217 Integration test report missing | Runner may have crashed |"
  fi
fi

# Finalize pass/fail and icon after report check
if [[ "$MISSING_INT_REPORT" = "true" ]]; then
  PASS=false
fi
if [[ "$PASS" = "true" ]]; then
  ICON=$'\342\234\205'
else
  ICON=$'\342\235\214'
fi

# Prepend title with icon
BODY="### ${ICON} ${TITLE}"$'\n'"${TABLE}"

BODY="${BODY}"$'\n'"| QA TC IDs | ${TC_TOTAL} exercised across ${FEATURE_COUNT} features |"
BODY="${BODY}"$'\n'"| Report | [View run & artifacts](${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}) |"

# Collapsible feature breakdown
BODY="${BODY}"$'\n\n'"<details>"$'\n'"<summary>Feature breakdown</summary>"$'\n\n'"| Feature | TCs | IDs |"$'\n'"|---|---|---|"$'\n'"${FEATURE_TABLE}"$'\n\n'"</details>"

# Extract re-run command from test report
if [[ -n "$REPORT_FILE" && -f "$REPORT_FILE" ]]; then
  RE_RUN=$(sed -n '/^Re-run failed tests:/,$p' "$REPORT_FILE" | tail -n +2 | sed 's/^  //')
  if [[ -n "$RE_RUN" ]]; then
    # Suppress re-run block when failures dominate passing
    INT_FAILED_NUM="${INT_FAILED:-0}"
    INT_PASSING_NUM="${INT_PASSING:-0}"
    if [[ "$INT_FAILED_NUM" -gt "$INT_PASSING_NUM" ]] 2>/dev/null; then
      BODY="${BODY}"$'\n\n'"${INT_FAILED_NUM} tests failed \342\200\224 re-run the full suite with \`pnpm test:release:automated\`"
    else
      BODY="${BODY}"$'\n\n'"To re-run failed tests:"$'\n'"\`\`\`"$'\n'"${RE_RUN}"$'\n'"\`\`\`"
    fi
  fi
fi

echo "$BODY"
