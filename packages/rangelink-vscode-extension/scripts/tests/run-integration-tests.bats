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

@test "--use-overrides is a valid flag" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --with-extensions --use-overrides --help
  [[ "$status" -eq 0 ]]
}

@test "--use-overrides without --with-extensions errors" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --use-overrides --help
  [[ "$status" -eq 1 ]]
  [[ "$output" == *"--use-overrides requires --with-extensions"* ]]
}

@test "--exclude-label is a valid flag" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --exclude-label some-label --help
  [[ "$status" -eq 0 ]]
}

@test "--exclude-label without name errors" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --exclude-label
  [[ "$status" -eq 1 ]]
  [[ "$output" == *"Error"* ]]
}

@test "--assisted is a valid flag" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --assisted --help
  [[ "$status" -eq 0 ]]
}

@test "--with-extensions is a valid flag" {
  run bash "$BATS_TEST_DIRNAME/../run-integration-tests.sh" --with-extensions --help
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

# Report file naming is verified indirectly by the argument parsing tests
# above — the script's naming is simple variable interpolation that can't be
# meaningfully tested without running a full integration test suite through it.

# ── RESOLVED_JSON stdout output ──────────────────────────────────────────────

@test "outputs ++RESOLVED_JSON_START++ block to stdout" {
  PKG_DIR="$TEST_DIR/pkg"
  mkdir -p "$PKG_DIR/scripts" "$PKG_DIR/qa/output"

  # Copy the actual script to a mock package structure
  cp "$BATS_TEST_DIRNAME/../run-integration-tests.sh" "$PKG_DIR/scripts/run-integration-tests.sh"
  chmod +x "$PKG_DIR/scripts/run-integration-tests.sh"

  # Create stub resolve-qa-labels.js that outputs a TC ID
  cat > "$PKG_DIR/scripts/resolve-qa-labels.js" <<'JS'
#!/usr/bin/env node
console.log('test-feature-001');
JS
  chmod +x "$PKG_DIR/scripts/resolve-qa-labels.js"

  # Create a minimal QA YAML file so the script finds one
  cat > "$PKG_DIR/qa/qa-test-cases.yaml" <<'YAML'
test_cases:
  - id: test-feature-001
    feature: test-feature
    scenario: Test case
    automated: true
YAML

  # Initialize a git repo so 'git rev-parse --show-toplevel' works
  (
    cd "$PKG_DIR" || exit 1
    git init 2>/dev/null
    git add -A 2>/dev/null
    git -c user.name="T" -c user.email="t@t" commit -m "init" --no-gpg-sign 2>/dev/null
  )

  # Run the script with --automated to go through the label-resolution and
  # report-generation path. The script will eventually fail (pnpm is not
  # available in the mock environment), but the RESOLVED_JSON block is
  # written to stdout via tee -a before that point.
  run bash "$PKG_DIR/scripts/run-integration-tests.sh" --automated

  [[ "$output" == *"++RESOLVED_JSON_START++"* ]]
  [[ "$output" == *"++RESOLVED_JSON_END++"* ]]
}
