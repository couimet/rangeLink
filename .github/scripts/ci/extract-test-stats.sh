#!/usr/bin/env bash
set -euo pipefail

# Extract test stats (passed, total, passing) from Jest or mocha output files.
# Usage: extract-test-stats.sh --mode jest|mocha <output-file>
# Writes KEY=VALUE lines to stdout (intended to be redirected to GITHUB_OUTPUT).

usage() {
  echo "Usage: extract-test-stats.sh --mode jest|mocha <output-file>" >&2
  echo "" >&2
  echo "  --mode jest    Extract 'Tests: N passed, M total' from Jest output" >&2
  echo "  --mode mocha   Extract 'N passing' from mocha/vscode-test output" >&2
  exit 2
}

MODE=""
OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      if [[ $# -lt 2 || "$2" == -* ]]; then
        echo "Error: --mode requires a value" >&2
        usage
      fi
      MODE="$2"
      shift 2
      ;;
    -*)
      usage
      ;;
    *)
      OUTPUT_FILE="$1"
      shift
      ;;
  esac
done

if [[ -z "$MODE" || -z "$OUTPUT_FILE" ]]; then
  usage
fi

if [[ "$MODE" != "jest" && "$MODE" != "mocha" ]]; then
  echo "Error: --mode must be 'jest' or 'mocha', got '$MODE'" >&2
  exit 2
fi

if [[ ! -f "$OUTPUT_FILE" ]]; then
  echo "Error: file not found: $OUTPUT_FILE" >&2
  exit 1
fi

case "$MODE" in
  jest)
    UNIT_PASSED=$(perl -nle 'print $1 if /Tests:\s+(\d+)(?= passed)/' "$OUTPUT_FILE" | tail -1)
    UNIT_TOTAL=$(perl -nle 'print $1 if /Tests:.*\s(\d+)(?= total)/' "$OUTPUT_FILE" | tail -1)
    UNIT_PASSED="${UNIT_PASSED:-0}"
    UNIT_TOTAL="${UNIT_TOTAL:-0}"
    echo "unit-passed=${UNIT_PASSED}"
    echo "unit-total=${UNIT_TOTAL}"
    ;;
  mocha)
    INT_PASSING=$(perl -nle 'print $1 if /(\d+)(?= passing)/' "$OUTPUT_FILE" | tail -1)
    INT_PASSING="${INT_PASSING:-0}"
    INT_FAILED=$(perl -nle 'print $1 if /(\d+)(?= failing)/' "$OUTPUT_FILE" | tail -1)
    INT_FAILED="${INT_FAILED:-0}"
    INT_TOTAL=$(( INT_PASSING + INT_FAILED ))
    echo "int-passing=${INT_PASSING}"
    echo "int-failed=${INT_FAILED}"
    echo "int-total=${INT_TOTAL}"
    ;;
esac
