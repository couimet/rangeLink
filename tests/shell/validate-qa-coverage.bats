#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/validate-qa-coverage.sh"

# ── Fixture scaffolding ────────────────────────────────────────────────────────
#
# The script derives SCRIPT_DIR/PACKAGE_ROOT/QA_DIR/INTEGRATION_TEST_DIR from
# $0.  We copy it into a temp tree so $0 resolves inside the fixture directory.

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"
  mkdir -p "$FIXTURE_ROOT/src/__integration-tests__/suite"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/validate-qa-coverage.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/validate-qa-coverage.sh"

  stub_dir
  make_stub "git" "STUB_GIT_EXIT" "STUB_GIT_OUTPUT" <<'ENDOFSTUB'
echo "${STUB_GIT_OUTPUT:-/fake/repo}"
ENDOFSTUB
  export STUB_GIT_EXIT=0
  export STUB_GIT_OUTPUT="$FIXTURE_ROOT"

  # Node stub outputs separate ID sets based on the flag.
  # Piped through sort so output ordering matches comm expectations.
  make_stub "node" "STUB_NODE_EXIT" "STUB_NODE_OUTPUT" <<'ENDOFSTUB'
case "$*" in
  *--automated-only*)
    printf '%s' "${STUB_AUTOMATED_IDS:-}" | sort ;;
  *--assisted*)
    printf '%s' "${STUB_ASSISTED_IDS:-}" | sort ;;
  *)
    printf '%s' "${STUB_NODE_OUTPUT:-}" ;;
esac
ENDOFSTUB
  export STUB_NODE_EXIT=0
  export STUB_NODE_OUTPUT=""
  export STUB_AUTOMATED_IDS=""
  export STUB_ASSISTED_IDS=""

  # Convenience: write YAML fixture.
  write_yaml() {
    cat > "$FIXTURE_ROOT/qa/$1"
  }

  # Convenience: write a test.ts fixture.
  write_test_file() {
    cat > "$FIXTURE_ROOT/src/__integration-tests__/suite/$1"
  }
}

# ── find_latest_qa_yaml ────────────────────────────────────────────────────────

@test "find_latest_qa_yaml: picks latest unsuffixed over suffixed" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0-001.yaml" <<< ""
  write_yaml "qa-test-cases-v1.0.0.yaml" <<< ""
  write_yaml "qa-test-cases-v1.1.0.yaml" <<< ""

  run "$SCRIPT"
  [[ "$output" =~ "v1.1.0" ]]
}

@test "find_latest_qa_yaml: picks highest version among unsuffixed" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<< ""
  write_yaml "qa-test-cases-v1.2.0.yaml" <<< ""

  run "$SCRIPT"
  [[ "$output" =~ "v1.2.0" ]]
}

@test "find_latest_qa_yaml: picks highest suffixed when only suffixed exist" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0-001.yaml" <<< ""
  write_yaml "qa-test-cases-v1.0.0-005.yaml" <<< ""

  run "$SCRIPT"
  [[ "$output" =~ "v1.0.0-005" ]]
}

@test "find_latest_qa_yaml: exits 1 when no QA YAML files exist" {
  setup_fixture
  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "No QA YAML files found" ]]
}

@test "explicit YAML path bypasses auto-discovery" {
  setup_fixture
  write_yaml "custom.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: true
EOF
  write_test_file "tests.test.ts" <<< "test('foo-001: test', () => {});"
  export STUB_AUTOMATED_IDS="foo-001"

  run "$SCRIPT" "$FIXTURE_ROOT/qa/custom.yaml"
  [[ "$output" =~ "custom.yaml" ]]
  [[ "$output" =~ "Validation PASSED" ]]
  [[ "$status" -eq 0 ]]
}

# ── Full-run: PASSED ───────────────────────────────────────────────────────────

@test "validation PASSED when all automated: true IDs match integration tests" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: true

  - id: bar-002
    feature: 'Bar'
    scenario: 'Test bar'
    automated: false
EOF
  write_test_file "suite.test.ts" <<< "test('foo-001: does things', () => {});"
  export STUB_AUTOMATED_IDS="foo-001"

  run "$SCRIPT"
  [[ "$output" =~ "Validation PASSED" ]]
  [[ "$status" -eq 0 ]]
}

@test "validation PASSED when all assisted IDs match [assisted] tests" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: assisted

  - id: bar-002
    feature: 'Bar'
    scenario: 'Manual test'
    automated: false
EOF
  write_test_file "suite.test.ts" <<< "test('[assisted] foo-001: does things', () => {});"
  export STUB_ASSISTED_IDS="foo-001"

  run "$SCRIPT"
  [[ "$output" =~ "Validation PASSED" ]]
  [[ "$status" -eq 0 ]]
}

# ── Full-run: FAILED — mismatches ──────────────────────────────────────────────

@test "FAILED when YAML marks automated: true but no integration test exists (asymmetry A)" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: true
EOF
  export STUB_AUTOMATED_IDS="foo-001"

  run "$SCRIPT"
  [[ "$output" =~ "Marked automated: true in YAML but no matching integration test" ]]
  [[ "$output" =~ "Validation FAILED" ]]
  [[ "$status" -eq 1 ]]
}

@test "FAILED when integration test exists but not marked automated: true (asymmetry B)" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: false
EOF
  write_test_file "suite.test.ts" <<< "test('foo-001: does things', () => {});"

  run "$SCRIPT"
  [[ "$output" =~ "Integration test exists but not marked automated: true in YAML" ]]
  [[ "$output" =~ "Validation FAILED" ]]
  [[ "$status" -eq 1 ]]
}

@test "FAILED when YAML marks assisted but no [assisted] test exists (asymmetry C)" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: assisted
EOF
  write_test_file "suite.test.ts" <<< "test('[assisted] bar-002: other', () => {});"
  export STUB_ASSISTED_IDS="foo-001"

  run "$SCRIPT"
  [[ "$output" =~ "Marked automated: assisted in YAML but no matching [assisted] test" ]]
  [[ "$output" =~ "Validation FAILED" ]]
  [[ "$status" -eq 1 ]]
}

@test "FAILED when [assisted] test exists but not marked (asymmetry D)" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: false
EOF
  write_test_file "suite.test.ts" <<< "test('[assisted] foo-001: does things', () => {});"

  run "$SCRIPT"
  [[ "$output" =~ "[assisted] test exists but not marked automated: assisted in YAML" ]]
  [[ "$output" =~ "Validation FAILED" ]]
  [[ "$status" -eq 1 ]]
}

# ── Report file ────────────────────────────────────────────────────────────────

@test "report file created at expected path under qa/output/" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: true
EOF
  write_test_file "suite.test.ts" <<< "test('foo-001: does things', () => {});"
  export STUB_AUTOMATED_IDS="foo-001"

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Report complete:" ]]
  local found
  found=$(find "$FIXTURE_ROOT/qa/output" -name "qa-coverage-report-v1.0.0-*" -type f 2>/dev/null | head -1)
  [[ -n "$found" ]]
}

@test "report filename uses 'unreleased' slug when input is qa-test-cases-unreleased.yaml" {
  setup_fixture
  write_yaml "qa-test-cases-unreleased.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: true
EOF
  write_test_file "suite.test.ts" <<< "test('foo-001: does things', () => {});"
  export STUB_AUTOMATED_IDS="foo-001"

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  local found
  found=$(find "$FIXTURE_ROOT/qa/output" -name "qa-coverage-report-unreleased-*" -type f 2>/dev/null | head -1)
  [[ -n "$found" ]]
  # Negative assertion: no v-prefixed report.
  local v_prefixed
  v_prefixed=$(find "$FIXTURE_ROOT/qa/output" -name "qa-coverage-report-vunreleased-*" -type f 2>/dev/null | head -1)
  [[ -z "$v_prefixed" ]]
}

@test "report contains header with QA YAML and test paths" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: true
EOF
  write_test_file "suite.test.ts" <<< "test('foo-001: does things', () => {});"
  export STUB_AUTOMATED_IDS="foo-001"

  run "$SCRIPT"
  [[ "$output" =~ "QA Coverage Report" ]]
  [[ "$output" =~ "QA YAML:" ]]
  [[ "$output" =~ "Tests:" ]]
  [[ "$output" =~ "src/__integration-tests__/suite" ]]
}

# ── Counts ─────────────────────────────────────────────────────────────────────

@test "report displays correct counts for all automated categories" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: true

  - id: foo-002
    feature: 'Foo'
    scenario: 'Test'
    automated: assisted

  - id: bar-001
    feature: 'Bar'
    scenario: 'Test'
    automated: false

  - id: bar-002
    feature: 'Bar'
    scenario: 'Test'
    automated: false
EOF
  write_test_file "suite.test.ts" <<< "test('foo-001: does things', () => {});"
  write_test_file "assisted.test.ts" <<< "test('[assisted] foo-002: helps', () => {});"
  export STUB_AUTOMATED_IDS="foo-001"
  export STUB_ASSISTED_IDS="foo-002"

  run "$SCRIPT"
  [[ "$output" =~ "YAML automated: true entries:     1" ]]
  [[ "$output" =~ "YAML automated: assisted entries:  1" ]]
  [[ "$output" =~ "YAML automated: false entries:     2" ]]
  [[ "$output" =~ "Integration test IDs (automated):  1" ]]
  [[ "$output" =~ "Integration test IDs (assisted):   1" ]]
}

@test "counts handle zero entries (grep -c . || true guard)" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases: []
EOF

  run "$SCRIPT"
  [[ "$output" =~ "YAML automated: true entries:     0" ]]
  [[ "$output" =~ "YAML automated: assisted entries:  0" ]]
}

# ── Edge cases ─────────────────────────────────────────────────────────────────

@test "exits 1 when integration test directory is missing" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: false
EOF
  rm -rf "$FIXTURE_ROOT/src/__integration-tests__/suite"

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "Integration test directory not found" ]]
}

@test "handles only assisted tests with no automated: true entries" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: assisted
EOF
  write_test_file "suite.test.ts" <<< "test('[assisted] foo-001: helps', () => {});"
  export STUB_ASSISTED_IDS="foo-001"

  run "$SCRIPT"
  [[ "$output" =~ "Validation PASSED" ]]
  [[ "$status" -eq 0 ]]
}

@test "test ID extraction handles test(), it(), describe(), and suite() calls" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: alpha-001
    feature: 'Alpha'
    scenario: 'Test 1'
    automated: true

  - id: beta-002
    feature: 'Beta'
    scenario: 'Test 2'
    automated: true

  - id: gamma-003
    feature: 'Gamma'
    scenario: 'Test 3'
    automated: true

  - id: delta-004
    feature: 'Delta'
    scenario: 'Test 4'
    automated: true
EOF
  write_test_file "all-forms.test.ts" <<'EOF'
test('alpha-001: test form', () => {});
it('beta-002: it form', () => {});
describe('gamma-003: describe form', () => {});
suite('delta-004: suite form', () => {});
EOF
  export STUB_AUTOMATED_IDS="alpha-001
beta-002
gamma-003
delta-004"

  run "$SCRIPT"
  [[ "$output" =~ "Validation PASSED" ]]
  [[ "$status" -eq 0 ]]
}

@test "[assisted] filter excludes non-assisted tests from assisted ID list" {
  setup_fixture
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test'
    automated: assisted
EOF
  # This test is NOT [assisted] so it appears in automated IDs, not assisted IDs.
  write_test_file "suite.test.ts" <<< "test('foo-001: regular', () => {});"
  export STUB_ASSISTED_IDS="foo-001"

  run "$SCRIPT"
  # YAML marks foo-001 as assisted but grep only finds it in automated (non-[assisted]).
  # So asymmetry C triggers: marked assisted but no matching [assisted] test.
  [[ "$output" =~ "Marked automated: assisted in YAML but no matching" ]]
  [[ "$status" -eq 1 ]]
}
