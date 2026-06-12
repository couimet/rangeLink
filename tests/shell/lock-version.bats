#!/usr/bin/env bats

load test_helper

REAL_SCRIPT="$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/lock-version.sh"

setup_fixture() {
  FIXTURE_ROOT="$TEST_TEMP_DIR"
  mkdir -p "$FIXTURE_ROOT/scripts"
  mkdir -p "$FIXTURE_ROOT/qa"

  cp "$REAL_SCRIPT" "$FIXTURE_ROOT/scripts/lock-version.sh"
  cp "$PROJECT_ROOT/packages/rangelink-vscode-extension/scripts/check-dirty-tree.sh" \
     "$FIXTURE_ROOT/scripts/check-dirty-tree.sh"
  SCRIPT="$FIXTURE_ROOT/scripts/lock-version.sh"

  stub_dir
  make_stub "git" <<'ENDOFSTUB'
case "$*" in
  *--show-toplevel*) echo "${FIXTURE_ROOT_FOR_GIT:-$TEST_TEMP_DIR}" ;;
  *status*)
    # GIT_STATUS_DIRTY: 0=clean, 1=arbitrary dirty file, 2=only release artifact dirty.
    case "${GIT_STATUS_DIRTY:-0}" in
      1) echo "?? dirty.txt" ;;
      2)
        if [[ "$*" == *"(exclude)"*"release-testing-instructions-v"* ]]; then
          :  # excluded — no output
        else
          echo "?? packages/rangelink-vscode-extension/qa/release-testing-instructions-v2.0.0.md"
        fi
        ;;
    esac
    exit 0 ;;
  *) exit 0 ;;
esac
ENDOFSTUB
  # Let the git stub resolve $FIXTURE_ROOT at call time via env.
  export FIXTURE_ROOT_FOR_GIT="$FIXTURE_ROOT"

  # Stub npx so the prettier formatting step does not require node_modules.
  make_passive_stub "npx"

  # Stub gh so the auth-status warning path does not depend on local gh state.
  make_passive_stub "gh"

  # Stub generate-release-testing-instructions.sh to handle --version and
  # produce the new minimal format. In versioned mode the scope deliberately
  # uses v{VERSION} → v{VERSION} to test the sed fixup in lock-version.sh.
  cat > "$FIXTURE_ROOT/scripts/generate-release-testing-instructions.sh" <<'STUBEOF'
#!/usr/bin/env bash
VERSION_ARG=""
for arg in "$@"; do
  case "$arg" in
    --version) ;;
    *) VERSION_ARG="$arg" ;;
  esac
done

QA_DIR="$(dirname "$(dirname "${BASH_SOURCE[0]}")")/qa"

if [[ -n "$VERSION_ARG" ]]; then
  cat > "$QA_DIR/release-testing-instructions-v${VERSION_ARG}.md" <<EOF
---
version: ${VERSION_ARG}
qa_issue_url: ""
generated: 2026-06-11T00:00:00Z
---

# Release Testing: RangeLink VS Code Extension v${VERSION_ARG}

**Scope:** Changes from v${VERSION_ARG} → v${VERSION_ARG}
**QA tracker:** <to be filled by release:lock>

## Next steps

1. \`pnpm test\` — unit tests + coverage gate
2. Work through the QA tracker checkboxes — each row has the exact pnpm command to run
3. \`pnpm validate:qa-coverage:vscode-extension\`
4. When all checkboxes pass: \`pnpm release:prepare:vscode-extension\`
EOF
else
  cat > "$QA_DIR/release-testing-instructions-unreleased.md" <<EOF
---
version: 1.0.0
qa_issue_url: ""
generated: 2026-06-11T00:00:00Z
---

# Release Testing: RangeLink VS Code Extension Unreleased

**Scope:** Changes from v1.0.0 → Unreleased
**QA tracker:** <to be filled by release:lock>

## Next steps

1. \`pnpm test\` — unit tests + coverage gate
2. Work through the QA tracker checkboxes — each row has the exact pnpm command to run
3. \`pnpm validate:qa-coverage:vscode-extension\`
4. When all checkboxes pass: \`pnpm release:prepare:vscode-extension\`
EOF
fi
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

@test "locks version, bumps version, generates versioned instructions" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml" <<'EOF'
test_cases:
  - id: foo-001
    scenario: 'Existing'
    automated: true
EOF

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 0 ]]

  # YAML untouched (no longer renamed).
  [[ -f "$FIXTURE_ROOT/qa/qa-test-cases.yaml" ]]
  [[ ! -f "$FIXTURE_ROOT/qa/qa-test-cases-v2.0.0.yaml" ]]

  # Version bumped.
  local ver
  ver=$(jq -r '.version' "$FIXTURE_ROOT/package.json")
  [[ "$ver" == "2.0.0" ]]

  # Versioned instructions generated.
  [[ -f "$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md" ]]
  [[ ! -f "$FIXTURE_ROOT/qa/release-testing-instructions-unreleased.md" ]]
}

@test "versioned instructions have scope line fixup'd" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml" <<'EOF'
test_cases:
  - id: foo-001
    scenario: 'Existing'
    automated: true
EOF

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 0 ]]

  local out="$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md"
  # The stub outputs v2.0.0 → v2.0.0; the sed fixup corrects it to v1.0.0 → v2.0.0.
  grep -q "v1.0.0 → v2.0.0" "$out"
}

# ── Idempotency ─────────────────────────────────────────────────────────────────

@test "re-run prints already-locked message and exits cleanly" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "2.0.0"
}
EOF
  # Both .version and versioned instructions must exist for the idempotency gate.
  mkdir -p "$FIXTURE_ROOT/qa"
  touch "$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md"

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

  # Simulate partial state: versioned instructions exist but .version not bumped.
  mkdir -p "$FIXTURE_ROOT/qa"
  touch "$FIXTURE_ROOT/qa/release-testing-instructions-v2.0.0.md"

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

@test "missing .version in package.json exits 1" {
  setup_fixture
  write_package_json <<'EOF'
{
}
EOF

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "version not set" ]]
}

# ── Dirty-tree tolerance for release artifact ─────────────────────────────────────

@test "dirty-tree: artifact-only is tolerated" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  export GIT_STATUS_DIRTY=2

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 0 ]]
  ! [[ "$output" =~ "working tree is dirty" ]]
}

@test "dirty-tree: other dirty file still blocks" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  export GIT_STATUS_DIRTY=1

  run "$SCRIPT" 2.0.0
  [[ "$status" -eq 1 ]]
  [[ "$output" =~ "working tree is dirty" ]]
}

# ── YAML content preservation ──────────────────────────────────────────────────

@test "YAML file is untouched" {
  setup_fixture
  write_package_json <<'EOF'
{
  "version": "1.0.0"
}
EOF
  cat > "$FIXTURE_ROOT/qa/qa-test-cases.yaml" <<'EOF'
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

  # YAML still at original path with original content.
  local content
  content=$(cat "$FIXTURE_ROOT/qa/qa-test-cases.yaml")
  grep -q "scenario: 'Original scenario text'" <<< "$content"
  grep -q "scenario: 'Another scenario'" <<< "$content"
  grep -q "non_automatable_reason: 'platform-specific'" <<< "$content"
  # No versioned YAML was created.
  [[ ! -f "$FIXTURE_ROOT/qa/qa-test-cases-v2.0.0.yaml" ]]
}
