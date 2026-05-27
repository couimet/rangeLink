#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/generate-release-testing-instructions.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/generate-release-testing-instructions.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/generate-release-testing-instructions.sh"

  stub_dir
  make_stub "git" <<ENDOFSTUB
case "\$*" in
  *--show-toplevel*) echo "${FIXTURE_ROOT}" ;;
  *) echo "" ;;
esac
ENDOFSTUB

  # Stub npx so the prettier formatting step does not require node_modules.
  make_passive_stub "npx"

  # Stub gh so the auth-status warning path does not depend on local gh state.
  make_passive_stub "gh"

  write_package_json() {
    cat > "$FIXTURE_ROOT/package.json"
  }
}

# ── Output filename: Unreleased vs SemVer ──────────────────────────────────────

@test "Unreleased nextTargetVersion produces release-testing-instructions-unreleased.md" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0",
  "nextTargetVersion": "Unreleased"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ -f "$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md" ]]
  [[ ! -f "$FIXTURE_ROOT/qa/release-testing-instructions-vUnreleased.md" ]]
}

@test "SemVer nextTargetVersion produces v-prefixed markdown (forward compat with finalize)" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0",
  "nextTargetVersion": "2.0.0"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ -f "$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md" ]]
}

# ── Internal yaml reference ────────────────────────────────────────────────────

@test "Unreleased: emitted markdown references qa-test-cases-unreleased.yaml" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0",
  "nextTargetVersion": "Unreleased"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  local out="$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md"
  grep -q "qa/qa-test-cases-unreleased.yaml" "$out"
  # Negative assertion: no vUnreleased in the yaml reference.
  ! grep -q "qa-test-cases-vUnreleased.yaml" "$out"
}

@test "SemVer: emitted markdown references qa-test-cases-v<version>.yaml" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0",
  "nextTargetVersion": "2.0.0"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  local out="$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md"
  grep -q "qa/qa-test-cases-v2.0.0.yaml" "$out"
}

# ── Header rendering ───────────────────────────────────────────────────────────

@test "Unreleased: title and scope render with no v prefix on right side" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0",
  "nextTargetVersion": "Unreleased"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  local out="$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md"
  grep -q "RangeLink VS Code Extension Unreleased" "$out"
  grep -q "Changes from v1.0.0 → Unreleased" "$out"
  ! grep -q "vUnreleased" "$out"
}

# ── Error paths ────────────────────────────────────────────────────────────────

@test "missing nextTargetVersion still errors" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "nextTargetVersion not set" ]]
}

# ── Early-exit (kept for this script per A006 scope) ───────────────────────────

@test "file-exists early-exit still applies (no clobber)" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0",
  "nextTargetVersion": "Unreleased"
}
EOF
  echo "preexisting content" > "$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md"

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ "$output" =~ "already exists" ]]
  # File unchanged.
  local content
  content=$(cat "$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md")
  [[ "$content" == "preexisting content" ]]
}
