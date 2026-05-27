#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/lock-version.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/lock-version.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/lock-version.sh"

  stub_dir
  make_stub "git" <<'ENDOFSTUB'
case "$*" in
  *--show-toplevel*) echo "${FIXTURE_ROOT_FOR_GIT:-$TEST_TEMP_DIR}" ;;
  *status*) exit 0 ;;
  *"mv"*) shift 3; mv "$@" ;;
  *) exit 0 ;;
esac
ENDOFSTUB
  # Let the git stub resolve $FIXTURE_ROOT at call time via env.
  export FIXTURE_ROOT_FOR_GIT="$FIXTURE_ROOT"

  # Stub npx so the prettier formatting step does not require node_modules.
  make_passive_stub "npx"

  # Stub gh so the auth-status warning path does not depend on local gh state.
  make_passive_stub "gh"

  # Stub generate-release-testing-instructions.sh to produce a dummy output file.
  cat > "$FIXTURE_ROOT/scripts/generate-release-testing-instructions.sh" <<'STUBEOF'
#!/usr/bin/env bash
QA_DIR="$(dirname "$(dirname "${BASH_SOURCE[0]}")")/qa"
cat > "$QA_DIR/release-testing-instructions-unreleased.md" <<'EOF'
# Release Testing Instructions: RangeLink VS Code Extension Unreleased

**Scope:** Changes from v1.0.0 → Unreleased

## Phase 1: Generate QA Test Plan

This creates `qa/qa-test-cases-unreleased.yaml`.

## Phase 5: Manual QA Pass

The generated checklist is at `qa/output/qa-checklist-unreleased-<timestamp>.md`.
EOF
STUBEOF
  chmod +x "$FIXTURE_ROOT/scripts/generate-release-testing-instructions.sh"

  write_package_json() {
    cat > "$FIXTURE_ROOT/package.json"
  }

  write_yaml() {
    cat > "$FIXTURE_ROOT/qa/$1"
  }
}

# ── Happy path ──────────────────────────────────────────────────────────────────

@test "renames YAML, bumps version, generates versioned instructions" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" <<'EOF'
test_cases:
  - id: foo-001
    scenario: 'Existing'
    automated: true
EOF

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 0 ]]

  # YAML renamed.
  [[ ! -f "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" ]]
  [[ -f "$FIXTURE_ROOT/qa/qa-test-cases-v2.0.0.yaml" ]]

  # Version bumped.
  local ver
  ver=$(jq -r '.version' "$FIXTURE_ROOT/package.json")
  [[ "$ver" == "2.0.0" ]]

  # Versioned instructions generated.
  [[ -f "$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md" ]]
  [[ ! -f "$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md" ]]
}

@test "versioned instructions have internal references fixup'd" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" <<'EOF'
test_cases:
  - id: foo-001
    scenario: 'Existing'
    automated: true
EOF

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 0 ]]

  local out="$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md"
  # Internal refs updated from unreleased → versioned.
  grep -q "qa-test-cases-v2.0.0.yaml" "$out"
  grep -q "qa-checklist-v2.0.0" "$out"
  grep -q "v1.0.0 → v2.0.0" "$out"
  # No stray unreleased refs in filenames/slugs.
  ! grep -q "qa-test-cases-unreleased.yaml" "$out"
  ! grep -q "qa-checklist-unreleased" "$out"
}

# ── Idempotency ─────────────────────────────────────────────────────────────────

@test "re-run prints already-locked message and exits cleanly" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "2.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases-v2.0.0.yaml" <<'EOF'
test_cases:
  - id: foo-001
    scenario: 'Existing'
    automated: true
EOF

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "Already locked at v2.0.0" ]]
}

@test "re-run after partial completion picks up remaining steps" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" <<'EOF'
test_cases:
  - id: foo-001
    scenario: 'Existing'
    automated: true
EOF

  # Simulate partial state: version already bumped but YAML not renamed.
  # (This shouldn't happen in practice but tests the guard).
  # Actually, let's test: versioned YAML exists (manually created) but .version not bumped.
  # This is a pathological case — the script should handle it gracefully.

  # Pre-create the versioned YAML (simulating partial previous run).
  cp "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" \
     "$FIXTURE_ROOT/qa/qa-test-cases-v2.0.0.yaml"

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 0 ]]

  # Should bump version (the missing step).
  local ver
  ver=$(jq -r '.version' "$FIXTURE_ROOT/package.json")
  [[ "$ver" == "2.0.0" ]]
}

# ── Error paths ─────────────────────────────────────────────────────────────────

@test "missing version argument exits 1" {
  setup_fixture
  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "Usage" ]]
}

@test "invalid version (not SemVer) exits 1" {
  setup_fixture
  run "$SCRIPT" "not-a-version"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "SemVer" ]]
}

@test "version with only major.minor exits 1" {
  setup_fixture
  run "$SCRIPT" "2.0"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "SemVer" ]]
}

@test "version with pre-release suffix exits 1" {
  setup_fixture
  run "$SCRIPT" "2.0.0-rc1"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "SemVer" ]]
}

@test "no qa-test-cases-unreleased.yaml exits 1" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  # No YAML file written.

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "not found" ]]
}

@test "missing .version in package.json exits 1" {
  setup_fixture
  write_package_json <<'EOF'
{
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" <<'EOF'
test_cases:
  - id: foo-001
    automated: true
EOF

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "version not set" ]]
}

# ── YAML content preservation ──────────────────────────────────────────────────

@test "renamed YAML preserves original content" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases-unreleased.yaml" <<'EOF'
test_cases:
  - id: foo-001
    scenario: 'Original scenario text'
    automated: true
  - id: foo-002
    scenario: 'Another scenario'
    automated: false
    non_automatable_reason: 'platform-specific'
EOF

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 0 ]]

  local content
  content=$(cat "$FIXTURE_ROOT/qa/qa-test-cases-v2.0.0.yaml")
  grep -q "scenario: 'Original scenario text'" <<< "$content"
  grep -q "scenario: 'Another scenario'" <<< "$content"
  grep -q "non_automatable_reason: 'platform-specific'" <<< "$content"
}
