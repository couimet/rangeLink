#!/usr/bin/env bats

load test_helper

SCRIPT="$PROJECT_ROOT/.github/scripts/ci/extract-test-stats.sh"
FIXTURES="$PROJECT_ROOT/tests/shell/fixtures"

# --- Argument validation ---

@test "missing mode and file: exits 2 with usage" {
  run "$SCRIPT"
  [ "$status" -eq 2 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "invalid mode: exits 2 with error" {
  run "$SCRIPT" --mode unknown /dev/null
  [ "$status" -eq 2 ]
  [[ "$output" == *"must be 'jest' or 'mocha'"* ]]
}

@test "missing file: exits 2 with usage" {
  run "$SCRIPT" --mode jest
  [ "$status" -eq 2 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "--mode without value: exits 2 with usage" {
  run "$SCRIPT" --mode
  [ "$status" -eq 2 ]
  [[ "$output" == *"Error: --mode requires a value"* ]]
}

# --- File existence ---

@test "nonexistent file: exits 1" {
  run "$SCRIPT" --mode jest "$TEST_TEMP_DIR/nonexistent.txt"
  [ "$status" -eq 1 ]
  [[ "$output" == *"file not found"* ]]
}

# --- Jest mode ---

@test "jest: extracts passed and total from valid output" {
  run "$SCRIPT" --mode jest "$FIXTURES/jest-valid.txt"
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "unit-passed=1889" ]
  [ "${lines[1]}" = "unit-total=1889" ]
}

@test "jest: picks last package's counts in multi-package output" {
  run "$SCRIPT" --mode jest "$FIXTURES/jest-multi-package.txt"
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "unit-passed=1889" ]
  [ "${lines[1]}" = "unit-total=1889" ]
}

@test "jest: ignores Snapshots and Test Suites lines" {
  # The fixture has Test Suites and Snapshots lines with numbers before 'total'.
  # The anchored grep must only match the 'Tests:' line.
  run "$SCRIPT" --mode jest "$FIXTURES/jest-snapshots.txt"
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "unit-passed=42" ]
  [ "${lines[1]}" = "unit-total=42" ]
}

@test "jest: empty file defaults to 0" {
  touch "$TEST_TEMP_DIR/empty.txt"
  run "$SCRIPT" --mode jest "$TEST_TEMP_DIR/empty.txt"
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "unit-passed=0" ]
  [ "${lines[1]}" = "unit-total=0" ]
}

# --- Mocha mode ---

@test "mocha: extracts passing and failed counts from valid output" {
  run "$SCRIPT" --mode mocha "$FIXTURES/mocha-valid.txt"
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "int-passing=175" ]
  [ "${lines[1]}" = "int-failed=0" ]
}

@test "mocha: extracts failed count when failures exist" {
  run "$SCRIPT" --mode mocha "$FIXTURES/mocha-failing.txt"
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "int-passing=170" ]
  [ "${lines[1]}" = "int-failed=5" ]
}

@test "mocha: outputs 0 when no passing line exists" {
  run "$SCRIPT" --mode mocha "$FIXTURES/mocha-no-match.txt"
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "int-passing=0" ]
  [ "${lines[1]}" = "int-failed=5" ]
}

@test "mocha: empty file defaults to 0" {
  touch "$TEST_TEMP_DIR/empty.txt"
  run "$SCRIPT" --mode mocha "$TEST_TEMP_DIR/empty.txt"
  [ "$status" -eq 0 ]
  [ "${lines[0]}" = "int-passing=0" ]
  [ "${lines[1]}" = "int-failed=0" ]
}
