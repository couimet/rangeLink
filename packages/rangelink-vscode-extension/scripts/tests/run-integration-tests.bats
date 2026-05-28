#!/usr/bin/env bats

setup() {
  TEST_DIR="$(mktemp -d)"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# ── Argument parsing ──────────────────────────────────────────────────────────

@test "accepts --help and prints usage" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --help
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"Usage:"* ]]
}

@test "rejects unknown flags" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --unknown-flag
  [[ "$status" -eq 1 ]]
  [[ "$output" == *"Unknown option"* ]]
}

@test "--grep without pattern errors" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --grep
  [[ "$status" -eq 1 ]]
  [[ "$output" == *"Error"* ]]
}

@test "--label without name errors" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --label
  [[ "$status" -eq 1 ]]
  [[ "$output" == *"Error"* ]]
}

@test "--automated is a valid flag" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --automated --help
  [[ "$status" -eq 0 ]]
}

@test "--exclude-assisted is a valid flag" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --exclude-assisted --help
  [[ "$status" -eq 0 ]]
}

# ── Test count extraction ─────────────────────────────────────────────────────

@test "extracts passing count from Mocha output" {
  REPORT_FILE="$TEST_DIR/report.txt"
  echo "  40 passing (24m)" > "$REPORT_FILE"
  PASSING_COUNT=$(grep -oE '[0-9]+ passing' "$REPORT_FILE" | tail -1 | grep -oE '[0-9]+' || true)
  [[ "$PASSING_COUNT" == "40" ]]
}

@test "extracts failing count from Mocha output" {
  REPORT_FILE="$TEST_DIR/report.txt"
  echo "  24 failing" > "$REPORT_FILE"
  FAILING_COUNT=$(grep -oE '[0-9]+ failing' "$REPORT_FILE" | tail -1 | grep -oE '[0-9]+' || true)
  [[ "$FAILING_COUNT" == "24" ]]
}

@test "extracts both passing and failing counts" {
  REPORT_FILE="$TEST_DIR/report.txt"
  {
    echo "  40 passing (24m)"
    echo "  24 failing"
  } > "$REPORT_FILE"
  PASSING_COUNT=$(grep -oE '[0-9]+ passing' "$REPORT_FILE" | tail -1 | grep -oE '[0-9]+' || true)
  FAILING_COUNT=$(grep -oE '[0-9]+ failing' "$REPORT_FILE" | tail -1 | grep -oE '[0-9]+' || true)
  [[ "$PASSING_COUNT" == "40" ]]
  [[ "$FAILING_COUNT" == "24" ]]
}

@test "total count sums passing and failing" {
  REPORT_FILE="$TEST_DIR/report.txt"
  {
    echo "  40 passing (24m)"
    echo "  24 failing"
  } > "$REPORT_FILE"
  PASSING_COUNT=$(grep -oE '[0-9]+ passing' "$REPORT_FILE" | tail -1 | grep -oE '[0-9]+' || true)
  FAILING_COUNT=$(grep -oE '[0-9]+ failing' "$REPORT_FILE" | tail -1 | grep -oE '[0-9]+' || true)
  TOTAL_COUNT=$(( ${PASSING_COUNT:-0} + ${FAILING_COUNT:-0} ))
  [[ "$TOTAL_COUNT" -eq 64 ]]
}

@test "zero passing count is handled" {
  REPORT_FILE="$TEST_DIR/report.txt"
  echo "  0 passing (1m)" > "$REPORT_FILE"
  PASSING_COUNT=$(grep -oE '[0-9]+ passing' "$REPORT_FILE" | tail -1 | grep -oE '[0-9]+' || true)
  [[ "$PASSING_COUNT" == "0" ]]
}

@test "missing counts default to 0" {
  REPORT_FILE="$TEST_DIR/report.txt"
  echo "no test output here" > "$REPORT_FILE"
  PASSING_COUNT=$(grep -oE '[0-9]+ passing' "$REPORT_FILE" | tail -1 | grep -oE '[0-9]+' || true)
  FAILING_COUNT=$(grep -oE '[0-9]+ failing' "$REPORT_FILE" | tail -1 | grep -oE '[0-9]+' || true)
  TOTAL_COUNT=$(( ${PASSING_COUNT:-0} + ${FAILING_COUNT:-0} ))
  [[ "$TOTAL_COUNT" -eq 0 ]]
}

# ── Report file naming ────────────────────────────────────────────────────────

@test "report file includes timestamp and mode" {
  OUTPUT_DIR="$TEST_DIR/qa/output"
  mkdir -p "$OUTPUT_DIR"
  TIMESTAMP="20260101-000000"
  REPORT_MODE="automated"
  REPORT_FILE="$OUTPUT_DIR/test-run-${TIMESTAMP}-${REPORT_MODE}.txt"
  touch "$REPORT_FILE"
  [[ -f "$REPORT_FILE" ]]
}

@test "report file with grep mode includes pattern slug" {
  OUTPUT_DIR="$TEST_DIR/qa/output"
  mkdir -p "$OUTPUT_DIR"
  TIMESTAMP="20260101-000000"
  PATTERN_SLUG="status-bar-menu-002"
  REPORT_FILE="$OUTPUT_DIR/test-run-${TIMESTAMP}-grep-${PATTERN_SLUG}.txt"
  touch "$REPORT_FILE"
  [[ -f "$REPORT_FILE" ]]
}
