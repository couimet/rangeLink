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

# ── Output filename ─────────────────────────────────────────────────────────────

@test "produces release-testing-instructions-unreleased.md" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ -f "$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md" ]]
  [[ ! -f "$FIXTURE_ROOT/qa/release-testing-instructions-vUnreleased.md" ]]
}


# ── Internal yaml reference ────────────────────────────────────────────────────

@test "Unreleased: output has frontmatter, scope, and next steps" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  local out="$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md"
  # Frontmatter present.
  head -1 "$out" | grep -q "^---$"
  grep -q "qa_issue_url:" "$out"
  grep -q "generated:" "$out"
  # Scope line correct.
  grep -q "Changes from v1.0.0 → Unreleased" "$out"
  # QA tracker placeholder and next steps section.
  grep -q "QA tracker:" "$out"
  grep -q "## Next steps" "$out"
}


# ── Header rendering ───────────────────────────────────────────────────────────

@test "Unreleased: title and scope render with no v prefix on right side" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  local out="$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md"
  grep -q "RangeLink VS Code Extension Unreleased" "$out"
  grep -q "Changes from v1.0.0 → Unreleased" "$out"
  ! grep -q "vUnreleased" "$out"
}


# ── Versioned mode ────────────────────────────────────────────────────────

@test "versioned: --version 2.0.0 produces versioned instructions" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF

  run "$SCRIPT" --version 2.0.0
  [[ "$status" -eq 0 ]]

  # Versioned file produced, not unreleased.
  [[ -f "$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md" ]]
  [[ ! -f "$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md" ]]

  local out="$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md"
  # Frontmatter has version field.
  grep -q "version: 2.0.0" "$out"
  # Scope line correct.
  grep -q "Changes from v1.0.0 → v2.0.0" "$out"
  # Next steps section present.
  grep -q "## Next steps" "$out"
}


# ── Error paths ────────────────────────────────────────────────────────────────

@test "works without nextTargetVersion field (convention is embedded in the script)" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF

  run "$SCRIPT"
  [[ "$status" -eq 0 ]]
  [[ -f "$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md" ]]
}

# ── Early-exit (kept for this script per A006 scope) ───────────────────────────

@test "file-exists early-exit still applies (no clobber)" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
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
