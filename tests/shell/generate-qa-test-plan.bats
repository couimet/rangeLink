#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/generate-qa-test-plan.sh"

# ── Fixture scaffolding ────────────────────────────────────────────────────────
#
# The script derives SCRIPT_DIR/PACKAGE_DIR/REPO_ROOT/PACKAGE_JSON/QA_DIR from
# $0 + git. We copy it into a temp tree so $0 resolves inside the fixture and
# stub git so the script does not depend on the real repo state.

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/generate-qa-test-plan.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/generate-qa-test-plan.sh"

  stub_dir
  make_stub "git" <<ENDOFSTUB
case "\$*" in
  *--show-toplevel*) echo "${FIXTURE_ROOT}" ;;
  *rev-parse*) echo "abc1234" ;;
  *) echo "" ;;
esac
ENDOFSTUB

  write_package_json() {
    cat > "$FIXTURE_ROOT/package.json"
  }

  write_yaml() {
    cat > "$FIXTURE_ROOT/qa/$1"
  }
}

# Minimal valid yaml body — header comments stripped before test_cases:.
minimal_previous_yaml() {
  cat <<'EOF'
# Old header that will be stripped
# Another comment line
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Test scenario'
    automated: true
EOF
}

# ── Filename ───────────────────────────────────────────────────────────────────

@test "produces qa-test-cases-unreleased.yaml" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  write_yaml "qa-test-cases-v1.0.0.yaml" < <(minimal_previous_yaml)

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ -f "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" ]]
}


# ── Header rendering ───────────────────────────────────────────────────────────

@test "Unreleased: header reads 'v<published> → Unreleased' with no v prefix on right" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  write_yaml "qa-test-cases-v1.0.0.yaml" < <(minimal_previous_yaml)

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  local header
  header=$(head -1 "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml")
  [[ "$header" == "# RangeLink QA Test Cases — v1.0.0 → Unreleased" ]]
  # Negative assertion: no vUnreleased anywhere in the header.
  ! grep -q "vUnreleased" "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml"
}


# ── Idempotent refresh-in-place (early-exit dropped) ───────────────────────────

@test "re-running on existing unreleased.yaml refreshes header without losing body" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  # Pre-existing unreleased.yaml acts as PREVIOUS_YAML for itself.
  write_yaml "qa-test-cases-unreleased.yaml" <<'EOF'
# Stale header
test_cases:
  - id: foo-001
    feature: 'Foo'
    scenario: 'Existing body'
    automated: true
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  # Header refreshed.
  local header
  header=$(head -1 "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml")
  [[ "$header" == "# RangeLink QA Test Cases — v1.0.0 → Unreleased" ]]
  # Body preserved verbatim.
  grep -q "scenario: 'Existing body'" "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml"
}

@test "re-run is idempotent: second invocation produces identical file" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  write_yaml "qa-test-cases-v1.0.0.yaml" < <(minimal_previous_yaml)

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  local checksum_after_first
  checksum_after_first=$(shasum "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" | cut -d' ' -f1)

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  local checksum_after_second
  checksum_after_second=$(shasum "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" | cut -d' ' -f1)

  [[ "$checksum_after_first" == "$checksum_after_second" ]]
}

@test "re-running prefers existing unreleased.yaml when both unreleased and versioned files exist" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  write_yaml "qa-test-cases-v1.0.0.yaml" <<'EOF'
test_cases:
  - id: versioned-001
    scenario: 'from versioned'
    automated: true
EOF
  write_yaml "qa-test-cases-unreleased.yaml" <<'EOF'
test_cases:
  - id: unreleased-001
    scenario: 'from unreleased'
    automated: true
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  grep -q "scenario: 'from unreleased'" "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml"
  ! grep -q "scenario: 'from versioned'" "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml"
}

@test "fallback: numeric SemVer sort picks v1.10.0 over v1.9.0 when output file is new" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.10.0",
  "nextTargetVersion": "2.0.0"
}
EOF
  write_yaml "qa-test-cases-v1.9.0.yaml" <<'EOF'
test_cases:
  - id: older-001
    scenario: 'from older version'
    automated: true
EOF
  write_yaml "qa-test-cases-v1.10.0.yaml" <<'EOF'
test_cases:
  - id: newer-001
    scenario: 'from newer version'
    automated: true
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  grep -q "scenario: 'from newer version'" "$FIXTURE_ROOT/qa/qa-test-cases-v2.0.0.yaml"
  ! grep -q "scenario: 'from older version'" "$FIXTURE_ROOT/qa/qa-test-cases-v2.0.0.yaml"
}

# ── Error paths ────────────────────────────────────────────────────────────────

@test "works without nextTargetVersion field (convention is embedded in the script)" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  write_yaml "qa-test-cases-v1.0.0.yaml" < <(minimal_previous_yaml)

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ -f "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" ]]
}

@test "missing version still errors" {
  setup_fixture
  write_package_json <<'EOF'
{

}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "version not set" ]]
}

@test "no previous YAML still errors" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "no previous QA YAML found" ]]
}
